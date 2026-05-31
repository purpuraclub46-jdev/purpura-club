/**
 * F2.7-C / R5 — Backfill script de códigos de referido.
 *
 * One-shot (idempotente) para asignar `referralCode` a Users históricos que
 * fueron creados antes de F2.7-C y por tanto tienen el campo en NULL.
 *
 * Estrategia:
 *
 *   1. Cursor pagination por Users con `referralCode IS NULL`.
 *   2. Para cada user → generar código único (con reintentos por colisión).
 *   3. Aplicar UPDATE (en commit mode) o registrar plan (dry-run).
 *   4. Generar artefactos:
 *      - reports/backfill-referral-<ts>.json    summary + plan
 *      - reports/backfill-referral-<ts>-rollback.sql  UPDATE inverso
 *
 * Garantías:
 *
 *   - Idempotente: re-ejecutar 2 veces produce 0 cambios (el filter
 *     `referralCode: null` excluye Users ya procesados).
 *   - Dry-run por defecto. Solo `--commit` aplica cambios.
 *   - No modifica Users que ya tengan código (R5).
 *   - Unicidad garantizada: el generador detecta colisiones contra Users
 *     existentes Y contra códigos planificados en la misma corrida.
 *   - Chunked: commits en lotes para no saturar la conexión.
 *
 * CLI usage:
 *
 *   ts-node scripts/backfill-referral-codes.ts                # dry-run
 *   ts-node scripts/backfill-referral-codes.ts --commit       # apply
 *   ts-node scripts/backfill-referral-codes.ts --chunk-size=500
 *   ts-node scripts/backfill-referral-codes.ts --report-dir=/tmp
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Constantes (espejo de ReferralsService) ──────────────────────────────

const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REFERRAL_CODE_LENGTH = 6;
const REFERRAL_CODE_PREFIX = 'PCLUB-';
const REFERRAL_CODE_MAX_ATTEMPTS = 8;

// ─── Types ────────────────────────────────────────────────────────────────

export interface BackfillOptions {
  dryRun: boolean;
  chunkSize: number;
  commitChunkSize: number;
  reportDir: string;
  now?: Date;
}

export interface PlannedAssignment {
  userId: string;
  email: string;
  referralCode: string;
}

export interface BackfillError {
  userId: string;
  stage: 'plan' | 'apply';
  message: string;
}

export interface BackfillSummary {
  startedAt: string;
  finishedAt: string;
  mode: 'dry-run' | 'commit';
  totals: {
    usersScanned: number;
    codesAssigned: number;
    errors: number;
  };
  assignedUserIds: string[];
}

export interface BackfillResult {
  summary: BackfillSummary;
  plan: PlannedAssignment[];
  errors: BackfillError[];
  rollbackSql: string;
}

export interface BackfillPrisma {
  user: {
    findMany: (
      args: any,
    ) => Promise<
      Array<{ id: string; email: string; referralCode: string | null }>
    >;
    findUnique: (args: any) => Promise<{ id: string } | null>;
    update: (args: any) => Promise<{ id: string }>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  dryRun: boolean;
  chunkSize: number;
  commitChunkSize: number;
  reportDir: string;
} {
  let dryRun = true;
  let chunkSize = 500;
  let commitChunkSize = 100;
  let reportDir = path.join(__dirname, 'reports');

  for (const arg of argv) {
    if (arg === '--commit') dryRun = false;
    else if (arg.startsWith('--chunk-size=')) {
      const n = Number(arg.split('=')[1]);
      if (!Number.isNaN(n) && n > 0) chunkSize = n;
    } else if (arg.startsWith('--commit-chunk-size=')) {
      const n = Number(arg.split('=')[1]);
      if (!Number.isNaN(n) && n > 0) commitChunkSize = n;
    } else if (arg.startsWith('--report-dir=')) {
      reportDir = arg.split('=')[1];
    }
  }

  return { dryRun, chunkSize, commitChunkSize, reportDir };
}

function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
}

function buildRandomCode(): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH);
  let suffix = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    suffix += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length];
  }
  return `${REFERRAL_CODE_PREFIX}${suffix}`;
}

// ─── Core ─────────────────────────────────────────────────────────────────

/**
 * Genera un código único contra (a) la BD y (b) un set in-memory de códigos
 * ya planificados en la misma corrida. Esto evita que en dry-run aparezcan
 * duplicados artificiales que luego fallarían al commit.
 */
async function generateUniqueCode(
  prisma: BackfillPrisma,
  reservedThisRun: Set<string>,
): Promise<string> {
  for (let i = 0; i < REFERRAL_CODE_MAX_ATTEMPTS; i++) {
    const candidate = buildRandomCode();
    if (reservedThisRun.has(candidate)) continue;
    const existing = await prisma.user.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });
    if (existing) continue;
    return candidate;
  }
  throw new Error(
    `Could not generate a unique referral code after ${REFERRAL_CODE_MAX_ATTEMPTS} attempts`,
  );
}

export async function planBackfill(
  prisma: BackfillPrisma,
  options: BackfillOptions,
): Promise<{
  plan: PlannedAssignment[];
  usersScanned: number;
  errors: BackfillError[];
}> {
  const plan: PlannedAssignment[] = [];
  const errors: BackfillError[] = [];
  const reserved = new Set<string>();

  let cursor: string | undefined = undefined;
  let usersScanned = 0;

  while (true) {
    const users = await prisma.user.findMany({
      where: { referralCode: null },
      take: options.chunkSize,
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, email: true, referralCode: true },
    });

    if (users.length === 0) break;
    usersScanned += users.length;

    for (const user of users) {
      if (user.referralCode) continue; // doble defensa
      try {
        const code = await generateUniqueCode(prisma, reserved);
        reserved.add(code);
        plan.push({
          userId: user.id,
          email: user.email,
          referralCode: code,
        });
      } catch (error) {
        errors.push({
          userId: user.id,
          stage: 'plan',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    cursor = users[users.length - 1].id;
    if (users.length < options.chunkSize) break;
  }

  return { plan, usersScanned, errors };
}

export async function applyBackfill(
  prisma: BackfillPrisma,
  plan: PlannedAssignment[],
  options: BackfillOptions,
): Promise<{ assigned: string[]; errors: BackfillError[] }> {
  const assigned: string[] = [];
  const errors: BackfillError[] = [];

  for (let i = 0; i < plan.length; i += options.commitChunkSize) {
    const chunk = plan.slice(i, i + options.commitChunkSize);
    for (const item of chunk) {
      try {
        await prisma.user.update({
          where: { id: item.userId },
          data: { referralCode: item.referralCode },
        });
        assigned.push(item.userId);
      } catch (error) {
        errors.push({
          userId: item.userId,
          stage: 'apply',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { assigned, errors };
}

export function buildRollbackSql(plan: PlannedAssignment[]): string {
  if (plan.length === 0) {
    return '-- No referral codes to rollback.\n';
  }
  const lines = [
    '-- F2.7-C backfill rollback',
    '-- Reverts referralCode to NULL',
  ];
  for (const item of plan) {
    lines.push(
      `UPDATE users SET "referralCode" = NULL WHERE id = '${item.userId}' AND "referralCode" = '${item.referralCode}';`,
    );
  }
  return lines.join('\n') + '\n';
}

export async function runBackfill(
  prisma: BackfillPrisma,
  options: BackfillOptions,
): Promise<BackfillResult> {
  const startedAt = options.now ?? new Date();
  const allErrors: BackfillError[] = [];

  const {
    plan,
    usersScanned,
    errors: planErrors,
  } = await planBackfill(prisma, options);
  allErrors.push(...planErrors);

  let assignedUserIds: string[] = [];
  if (!options.dryRun) {
    const { assigned, errors: applyErrors } = await applyBackfill(
      prisma,
      plan,
      options,
    );
    assignedUserIds = assigned;
    allErrors.push(...applyErrors);
  } else {
    // En dry-run consideramos "asignados" todos los planificados — útil para
    // que el conteo del summary refleje el alcance del próximo --commit.
    assignedUserIds = plan.map((p) => p.userId);
  }

  const summary: BackfillSummary = {
    startedAt: startedAt.toISOString(),
    finishedAt: (options.now ?? new Date()).toISOString(),
    mode: options.dryRun ? 'dry-run' : 'commit',
    totals: {
      usersScanned,
      codesAssigned: options.dryRun ? plan.length : assignedUserIds.length,
      errors: allErrors.length,
    },
    assignedUserIds,
  };

  return {
    summary,
    plan,
    errors: allErrors,
    rollbackSql: buildRollbackSql(plan),
  };
}

function writeReport(result: BackfillResult, reportDir: string, ts: string) {
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, `backfill-referral-${ts}.json`);
  const rollbackPath = path.join(
    reportDir,
    `backfill-referral-${ts}-rollback.sql`,
  );
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        summary: result.summary,
        plan: result.plan,
        errors: result.errors,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(rollbackPath, result.rollbackSql);
  return { jsonPath, rollbackPath };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const startedAt = new Date();

  console.log(
    `[backfill-referral] mode=${opts.dryRun ? 'dry-run' : 'COMMIT'} chunk=${opts.chunkSize} reportDir=${opts.reportDir}`,
  );

  try {
    const result = await runBackfill(prisma, {
      ...opts,
      now: startedAt,
    });

    const ts = formatTimestamp(startedAt);
    const { jsonPath, rollbackPath } = writeReport(result, opts.reportDir, ts);

    console.log(
      `[backfill-referral] usersScanned=${result.summary.totals.usersScanned} codesAssigned=${result.summary.totals.codesAssigned} errors=${result.summary.totals.errors}`,
    );
    console.log(`[backfill-referral] report → ${jsonPath}`);
    console.log(`[backfill-referral] rollback → ${rollbackPath}`);

    if (result.summary.totals.errors > 0) process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

// Solo ejecutar como CLI cuando se invoca directamente (no en import desde tests).
if (require.main === module) {
  main().catch((err) => {
    console.error('[backfill-referral] FATAL', err);
    process.exit(1);
  });
}
