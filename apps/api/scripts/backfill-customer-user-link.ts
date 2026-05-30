/**
 * FASE 1 / D6 — Backfill script Customer ↔ User link.
 *
 * Operación one-shot (idempotente) para sincronizar Users históricos que
 * NO tienen `customerProfile` con su Customer correspondiente.
 *
 * Estrategia:
 *
 *   1. Para cada User sin customerProfile:
 *      - Si User tiene DNI → buscar Customer huérfano con mismo DNI.
 *        Si match → LINK (update Customer.userId = user.id).
 *      - Si no match por DNI → CREATE Customer nuevo vinculado al User.
 *      - Si User tiene email coincidente con Customer huérfano (pero DNI
 *        no matchea) → registrar como candidatesByEmail para revisión
 *        manual (NO auto-link — política aprobada FASE 0.5).
 *
 *   2. Detectar anomalías: Users sin DNI no procesables, etc.
 *
 *   3. Generar artefactos:
 *      - reports/backfill-<ts>.json       resumen y stats
 *      - reports/backfill-<ts>-needs-review.csv  candidates por email
 *      - reports/backfill-<ts>-rollback.sql      UPDATE/DELETE inversas
 *
 * Garantías:
 *
 *   - Idempotente: re-ejecutar 2 veces produce 0 cambios extra
 *     (el filter `customerProfile IS NULL` excluye Users ya procesados).
 *   - Dry-run por defecto. Solo `--commit` aplica cambios.
 *   - Respeta el feature flag CUSTOMER_AUTO_LINK_BY_DNI. Si está OFF,
 *     el script aborta — no debe operar contra políticas del admin.
 *   - Chunked transactions: commits en lotes de COMMIT_CHUNK (default 100)
 *     dentro de $transaction. Crash mid-script → próximo run reanuda.
 *
 * CLI usage:
 *
 *   ts-node scripts/backfill-customer-user-link.ts                    # dry-run
 *   ts-node scripts/backfill-customer-user-link.ts --commit           # apply
 *   ts-node scripts/backfill-customer-user-link.ts --chunk-size=500   # custom
 *   ts-node scripts/backfill-customer-user-link.ts --report-dir=/tmp  # custom
 *
 * Política aprobada FASE 0.5 / D5:
 *
 *   - Auto-match SOLO por DNI (estricto, sin falsos positivos).
 *   - Email/phone solo registran candidatos para revisión humana.
 *   - NO retroactivar membership/raffles/beneficios.
 *
 * DEUDA TÉCNICA documentada (FASE 1.5+):
 *
 *   - El script propaga errores P2002 (constraint violation) y P2025
 *     (record not found) como genéricos a stderr. En FASE 1.5 promover
 *     a excepciones de dominio específicas (BackfillDuplicateError,
 *     BackfillRecordNotFoundError) con mensajes operacionales.
 *
 *   - Audit log persistente (modelo CustomerLinkAuditLog) diferido a
 *     FASE 1.5 / FASE 2. Por ahora el reporte JSON cumple la función.
 */

import {
  CustomerDocumentType,
  PrismaClient,
  Role,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ─────────────────────────────────────────────────────────────

export interface BackfillOptions {
  /** Si true, no aplica cambios — solo planifica y reporta. Default: true. */
  dryRun: boolean;
  /** Tamaño del chunk para cursor pagination de Users. Default: 500. */
  chunkSize: number;
  /** Tamaño del chunk para commits transaccionales. Default: 100. */
  commitChunkSize: number;
  /** Directorio donde escribir los reportes. CLI: --report-dir. */
  reportDir: string;
  /** Inyectable para tests deterministas. Default: new Date(). */
  now?: Date;
}

export interface OrphanUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dni: string | null;
}

export interface PlannedLink {
  userId: string;
  customerId: string;
  dni: string;
}

export interface PlannedCreate {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  dni: string | null;
}

export interface EmailCandidate {
  userId: string;
  userEmail: string;
  customerId: string;
  customerFullName: string;
  /** True si User tenía DNI pero no matcheó ningún Customer. */
  userHasDniNoMatch: boolean;
}

export interface BackfillError {
  userId: string;
  stage: 'scan' | 'apply-link' | 'apply-create';
  message: string;
}

export interface BackfillPlan {
  linkByDni: PlannedLink[];
  createNew: PlannedCreate[];
  emailCandidates: EmailCandidate[];
  errors: BackfillError[];
}

export interface BackfillSummary {
  startedAt: string;
  finishedAt: string;
  mode: 'dry-run' | 'commit';
  featureFlagEnabled: boolean;
  totals: {
    usersScanned: number;
    customersLinkedByDni: number;
    customersCreatedForUser: number;
    emailCandidatesForReview: number;
    errors: number;
  };
  /** IDs de los Customers que fueron LINKEADOS (no creados). Útil para rollback. */
  linkedCustomerIds: string[];
  /** IDs de los Customers que fueron CREADOS (para rollback DELETE). */
  createdCustomerIds: string[];
}

export interface BackfillResult {
  summary: BackfillSummary;
  /** Plan completo en memoria — útil para tests y para generar reportes. */
  plan: BackfillPlan;
  csv: string;
  rollbackSql: string;
}

// ─── Prisma surface ────────────────────────────────────────────────────

/**
 * Subset de PrismaClient usado por el script — permite mockear en tests
 * sin instanciar PrismaClient real.
 */
export interface BackfillPrisma {
  user: {
    findMany: (args: any) => Promise<OrphanUser[]>;
  };
  customer: {
    findFirst: (args: any) => Promise<{
      id: string;
      email: string | null;
      phone: string | null;
    } | null>;
    update: (args: any) => Promise<{ id: string; userId: string | null }>;
    create: (args: any) => Promise<{ id: string }>;
  };
  $transaction: (operations: any[] | ((tx: any) => Promise<any>)) => Promise<any>;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function formatTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace(/Z$/, '');
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ');
}

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Core logic ────────────────────────────────────────────────────────

/**
 * Recorre todos los Users sin customerProfile y planifica las acciones.
 * NO ejecuta mutaciones — solo lectura.
 */
export async function planBackfill(
  prisma: BackfillPrisma,
  options: BackfillOptions,
): Promise<{ plan: BackfillPlan; usersScanned: number }> {
  const plan: BackfillPlan = {
    linkByDni: [],
    createNew: [],
    emailCandidates: [],
    errors: [],
  };

  let cursor: string | undefined = undefined;
  let usersScanned = 0;

  while (true) {
    // Cursor pagination determinística (ORDER BY id ASC).
    const users = await prisma.user.findMany({
      where: { customerProfile: null },
      take: options.chunkSize,
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dni: true,
      },
    });

    if (users.length === 0) break;
    usersScanned += users.length;

    for (const user of users) {
      try {
        // Etapa 1: si User tiene DNI, intentar matching estricto.
        if (user.dni) {
          const orphan = await prisma.customer.findFirst({
            where: { dni: user.dni, userId: null },
            select: { id: true, email: true, phone: true },
          });
          if (orphan) {
            plan.linkByDni.push({
              userId: user.id,
              customerId: orphan.id,
              dni: user.dni,
            });
            continue;
          }
        }

        // Etapa 2: Customer huérfano por email coincidente (informativo).
        // Se reporta para revisión manual — NO auto-link.
        if (user.email) {
          const emailMatch = await prisma.customer.findFirst({
            where: { email: user.email, userId: null },
            select: { id: true, email: true, phone: true },
          });
          if (emailMatch) {
            // Recuperar fullName para el reporte CSV.
            const candidateFullName = await getCustomerFullName(
              prisma,
              emailMatch.id,
            );
            plan.emailCandidates.push({
              userId: user.id,
              userEmail: user.email,
              customerId: emailMatch.id,
              customerFullName: candidateFullName,
              userHasDniNoMatch: !!user.dni,
            });
            // El User igual obtendrá Customer nuevo creado abajo — el
            // admin debe linkear MANUALMENTE el candidate por email si
            // verifica que es la misma persona.
          }
        }

        // Etapa 3: crear Customer nuevo vinculado al User.
        plan.createNew.push({
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          dni: user.dni,
        });
      } catch (error) {
        plan.errors.push({
          userId: user.id,
          stage: 'scan',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    cursor = users[users.length - 1].id;
    if (users.length < options.chunkSize) break;
  }

  return { plan, usersScanned };
}

/**
 * Auxiliar: cargar fullName de un Customer por id. Devuelve string
 * vacío si no existe (sin throw — solo para enriquecer reportes).
 */
async function getCustomerFullName(
  prisma: BackfillPrisma,
  customerId: string,
): Promise<string> {
  try {
    const found = await (prisma as any).customer.findUnique?.({
      where: { id: customerId },
      select: { fullName: true },
    });
    return (found?.fullName as string | undefined) ?? '';
  } catch {
    return '';
  }
}

/**
 * Aplica el plan a la DB. Solo se invoca si `options.dryRun === false`.
 * Retorna los Customer IDs efectivamente afectados (para rollback).
 */
export async function applyPlan(
  prisma: BackfillPrisma,
  plan: BackfillPlan,
  options: BackfillOptions,
): Promise<{ linkedCustomerIds: string[]; createdCustomerIds: string[] }> {
  const linkedCustomerIds: string[] = [];
  const createdCustomerIds: string[] = [];

  // ── Apply linkByDni en chunks transaccionales ────────────────────────
  for (let i = 0; i < plan.linkByDni.length; i += options.commitChunkSize) {
    const chunk = plan.linkByDni.slice(i, i + options.commitChunkSize);
    try {
      const updates = chunk.map((link) =>
        (prisma as any).customer.update({
          where: { id: link.customerId },
          data: { userId: link.userId },
        }),
      );
      await prisma.$transaction(updates);
      for (const link of chunk) linkedCustomerIds.push(link.customerId);
    } catch (error) {
      for (const link of chunk) {
        plan.errors.push({
          userId: link.userId,
          stage: 'apply-link',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // ── Apply createNew en chunks ─────────────────────────────────────────
  for (let i = 0; i < plan.createNew.length; i += options.commitChunkSize) {
    const chunk = plan.createNew.slice(i, i + options.commitChunkSize);
    try {
      const creates = chunk.map((c) =>
        (prisma as any).customer.create({
          data: {
            userId: c.userId,
            firstName: c.firstName,
            lastName: c.lastName,
            fullName: buildFullName(c.firstName, c.lastName),
            email: c.email,
            phone: null,
            dni: c.dni,
            documentType: CustomerDocumentType.DNI,
            ruc: null,
            legalName: null,
            fiscalAddress: null,
            birthDate: null,
            gender: null,
            notes: null,
            isMember: false,
            active: true,
            primaryLocationId: null,
          },
          select: { id: true },
        }),
      );
      const results = (await prisma.$transaction(creates)) as Array<{
        id: string;
      }>;
      for (const r of results) createdCustomerIds.push(r.id);
    } catch (error) {
      for (const c of chunk) {
        plan.errors.push({
          userId: c.userId,
          stage: 'apply-create',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { linkedCustomerIds, createdCustomerIds };
}

/**
 * Genera el CSV de candidates por email para revisión manual.
 *
 * Estructura:
 *   userId, userEmail, customerId, customerFullName, userHasDniNoMatch
 *
 * El admin revisa cada fila y, si confirma que es la misma persona,
 * usa POST /customers/:customerId/link-user con userId del CSV.
 */
export function generateCsv(plan: BackfillPlan): string {
  const header = 'userId,userEmail,customerId,customerFullName,userHasDniNoMatch\n';
  const rows = plan.emailCandidates
    .map(
      (c) =>
        `${csvEscape(c.userId)},${csvEscape(c.userEmail)},${csvEscape(
          c.customerId,
        )},${csvEscape(c.customerFullName)},${c.userHasDniNoMatch}`,
    )
    .join('\n');
  return header + rows + (rows ? '\n' : '');
}

/**
 * Genera el SQL de rollback para deshacer los cambios aplicados.
 *
 * Estrategia:
 *   - linkByDni → UPDATE customers SET user_id = NULL WHERE id IN (...)
 *   - createNew → DELETE FROM customers WHERE id IN (...)
 *
 * El SQL se escribe SOLO si se aplicó commit (dryRun=false). En dry-run
 * el rollback queda vacío con comentario explicativo.
 */
export function generateRollbackSql(
  linkedCustomerIds: string[],
  createdCustomerIds: string[],
  mode: 'dry-run' | 'commit',
): string {
  const header = [
    '-- FASE 1 / D6 — Rollback SQL para backfill-customer-user-link.',
    `-- Modo: ${mode}.`,
    '-- Ejecutar SOLO si el backfill produjo efectos NO deseados.',
    '-- Recomendado: tomar snapshot DB ANTES de ejecutar.',
    '',
  ].join('\n');

  if (mode === 'dry-run') {
    return (
      header +
      '-- DRY RUN: no se aplicaron cambios. Nada que revertir.\n'
    );
  }

  const parts: string[] = [header];

  if (linkedCustomerIds.length > 0) {
    const ids = linkedCustomerIds.map((id) => `'${id}'`).join(',\n  ');
    parts.push(
      [
        '-- Revertir LINKs (desvincular Customers que fueron asignados).',
        'UPDATE customers SET user_id = NULL WHERE id IN (',
        `  ${ids}`,
        ');',
        '',
      ].join('\n'),
    );
  }

  if (createdCustomerIds.length > 0) {
    const ids = createdCustomerIds.map((id) => `'${id}'`).join(',\n  ');
    parts.push(
      [
        '-- Eliminar Customers que fueron CREADOS por el backfill.',
        '-- ATENCIÓN: si después del backfill el cliente realizó compras,',
        '-- esta operación dejará Orders con customerId huérfano. Validar.',
        'DELETE FROM customers WHERE id IN (',
        `  ${ids}`,
        ');',
        '',
      ].join('\n'),
    );
  }

  if (linkedCustomerIds.length === 0 && createdCustomerIds.length === 0) {
    parts.push('-- No hubo cambios aplicados — nada que revertir.\n');
  }

  return parts.join('\n');
}

/**
 * Genera el reporte JSON con summary + plan completo.
 */
export function generateReport(
  plan: BackfillPlan,
  summary: BackfillSummary,
): string {
  // Excluimos campos sensibles del JSON (email del User en candidates):
  // el JSON principal es resumen estadístico. El CSV contiene el detalle
  // de PII para revisión humana — debe permanecer en disco con cuidado.
  return JSON.stringify(
    {
      ...summary,
      sample: {
        linkByDni: plan.linkByDni.slice(0, 5),
        createNew: plan.createNew.slice(0, 5).map((c) => ({
          userId: c.userId,
          // No exponer email/dni en el JSON sample
          hasDni: !!c.dni,
          hasEmail: !!c.email,
        })),
        emailCandidatesPreview: plan.emailCandidates.slice(0, 5).map((c) => ({
          userId: c.userId,
          customerId: c.customerId,
          userHasDniNoMatch: c.userHasDniNoMatch,
        })),
        errors: plan.errors.slice(0, 20),
      },
    },
    null,
    2,
  );
}

/**
 * Función principal pura (testeable). Ejecuta plan + apply (si commit).
 */
export async function runBackfill(
  prisma: BackfillPrisma,
  options: BackfillOptions,
): Promise<BackfillResult> {
  const startedAt = options.now ?? new Date();

  // Feature flag check — respeta política operacional admin.
  const flagEnabled = parseBool(process.env.CUSTOMER_AUTO_LINK_BY_DNI, true);
  if (!flagEnabled) {
    throw new Error(
      'CUSTOMER_AUTO_LINK_BY_DNI is OFF. Backfill aborted to respect operator policy. ' +
        'Set CUSTOMER_AUTO_LINK_BY_DNI=true to enable.',
    );
  }

  const { plan, usersScanned } = await planBackfill(prisma, options);

  let linkedCustomerIds: string[] = [];
  let createdCustomerIds: string[] = [];

  if (!options.dryRun) {
    const applied = await applyPlan(prisma, plan, options);
    linkedCustomerIds = applied.linkedCustomerIds;
    createdCustomerIds = applied.createdCustomerIds;
  }

  const finishedAt = options.now ?? new Date();

  const summary: BackfillSummary = {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    mode: options.dryRun ? 'dry-run' : 'commit',
    featureFlagEnabled: flagEnabled,
    totals: {
      usersScanned,
      customersLinkedByDni: options.dryRun
        ? plan.linkByDni.length
        : linkedCustomerIds.length,
      customersCreatedForUser: options.dryRun
        ? plan.createNew.length
        : createdCustomerIds.length,
      emailCandidatesForReview: plan.emailCandidates.length,
      errors: plan.errors.length,
    },
    linkedCustomerIds,
    createdCustomerIds,
  };

  return {
    summary,
    plan,
    csv: generateCsv(plan),
    rollbackSql: generateRollbackSql(
      linkedCustomerIds,
      createdCustomerIds,
      summary.mode,
    ),
  };
}

// ─── CLI entry ─────────────────────────────────────────────────────────

interface CliArgs {
  dryRun: boolean;
  chunkSize: number;
  commitChunkSize: number;
  reportDir: string;
}

function parseCliArgs(argv: string[]): CliArgs {
  const dryRun = !argv.includes('--commit');
  const chunkSizeArg = argv.find((a) => a.startsWith('--chunk-size='));
  const commitChunkArg = argv.find((a) =>
    a.startsWith('--commit-chunk-size='),
  );
  const reportDirArg = argv.find((a) => a.startsWith('--report-dir='));

  return {
    dryRun,
    chunkSize: chunkSizeArg ? parseInt(chunkSizeArg.split('=')[1], 10) : 500,
    commitChunkSize: commitChunkArg
      ? parseInt(commitChunkArg.split('=')[1], 10)
      : 100,
    reportDir: reportDirArg
      ? reportDirArg.split('=')[1]
      : path.join(__dirname, 'reports'),
  };
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  // eslint-disable-next-line no-console
  console.log(
    `[backfill] mode=${args.dryRun ? 'dry-run' : 'COMMIT'} ` +
      `chunkSize=${args.chunkSize} commitChunkSize=${args.commitChunkSize} ` +
      `reportDir=${args.reportDir}`,
  );

  if (!fs.existsSync(args.reportDir)) {
    fs.mkdirSync(args.reportDir, { recursive: true });
  }

  const prisma = new PrismaClient();

  try {
    const result = await runBackfill(prisma, {
      ...args,
      now: new Date(),
    });

    const ts = formatTimestamp(new Date(result.summary.startedAt));
    const base = path.join(args.reportDir, `backfill-${ts}`);

    fs.writeFileSync(
      `${base}.json`,
      generateReport(result.plan, result.summary),
      'utf8',
    );
    fs.writeFileSync(`${base}-needs-review.csv`, result.csv, 'utf8');
    fs.writeFileSync(`${base}-rollback.sql`, result.rollbackSql, 'utf8');

    // eslint-disable-next-line no-console
    console.log(
      `[backfill] done. ` +
        `scanned=${result.summary.totals.usersScanned} ` +
        `linked=${result.summary.totals.customersLinkedByDni} ` +
        `created=${result.summary.totals.customersCreatedForUser} ` +
        `emailCandidates=${result.summary.totals.emailCandidatesForReview} ` +
        `errors=${result.summary.totals.errors}`,
    );
    // eslint-disable-next-line no-console
    console.log(`[backfill] artifacts written to ${base}.{json,csv,sql}`);

    if (result.summary.totals.errors > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `[backfill] WARNING: ${result.summary.totals.errors} errors occurred. ` +
          `Review the JSON report.`,
      );
      process.exitCode = 1;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `[backfill] FATAL: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// Export utilities even when CLI not run — useful for tests.
export const __internals__ = {
  parseBool,
  formatTimestamp,
  buildFullName,
  csvEscape,
  parseCliArgs,
};

if (require.main === module) {
  void main();
}
