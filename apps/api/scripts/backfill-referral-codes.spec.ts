import {
  BackfillPrisma,
  buildRollbackSql,
  runBackfill,
} from './backfill-referral-codes';

/**
 * F2.7-C / R5 — Tests del backfill de referralCode.
 *
 * Foco:
 *   - Dry-run NO ejecuta updates.
 *   - Commit aplica updates en orden y agrega assignedUserIds.
 *   - Idempotencia: corrida sobre 0 candidatos → 0 cambios.
 *   - Generación de rollback SQL.
 *   - Anti-colisión: códigos planificados en la misma corrida no se repiten.
 */

type FindUniqueArgs = { where: { referralCode: string }; select: unknown };
type UpdateArgs = {
  where: { id: string };
  data: { referralCode: string };
};

function createPrismaMock(): BackfillPrisma & {
  __existingCodes: Set<string>;
  __updateCalls: Array<{ id: string; data: { referralCode: string } }>;
} {
  const existing = new Set<string>();
  const updateCalls: Array<{
    id: string;
    data: { referralCode: string };
  }> = [];

  return {
    __existingCodes: existing,
    __updateCalls: updateCalls,
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn((args: FindUniqueArgs) => {
        const code = args.where.referralCode;
        return Promise.resolve(
          existing.has(code) ? { id: 'existing-user' } : null,
        );
      }),
      update: jest.fn((args: UpdateArgs) => {
        updateCalls.push({ id: args.where.id, data: args.data });
        return Promise.resolve({ id: args.where.id });
      }),
    },
  };
}

describe('backfill-referral-codes', () => {
  const fixedNow = new Date('2026-05-31T10:00:00.000Z');

  it('Dry-run: NO ejecuta updates pero reporta plan', async () => {
    const prisma = createPrismaMock();
    (prisma.user.findMany as jest.Mock)
      .mockResolvedValueOnce([
        { id: 'u1', email: 'a@x.com', referralCode: null },
        { id: 'u2', email: 'b@x.com', referralCode: null },
      ])
      .mockResolvedValueOnce([]);

    const result = await runBackfill(prisma, {
      dryRun: true,
      chunkSize: 500,
      commitChunkSize: 100,
      reportDir: '/tmp',
      now: fixedNow,
    });

    expect(result.summary.mode).toBe('dry-run');
    expect(result.summary.totals.usersScanned).toBe(2);
    expect(result.summary.totals.codesAssigned).toBe(2);
    expect(result.summary.totals.errors).toBe(0);
    expect(result.plan).toHaveLength(2);
    expect(prisma.__updateCalls).toHaveLength(0); // 0 updates en dry-run
  });

  it('Commit: aplica updates y registra assignedUserIds', async () => {
    const prisma = createPrismaMock();
    (prisma.user.findMany as jest.Mock)
      .mockResolvedValueOnce([
        { id: 'u1', email: 'a@x.com', referralCode: null },
      ])
      .mockResolvedValueOnce([]);

    const result = await runBackfill(prisma, {
      dryRun: false,
      chunkSize: 500,
      commitChunkSize: 100,
      reportDir: '/tmp',
      now: fixedNow,
    });

    expect(result.summary.mode).toBe('commit');
    expect(result.summary.totals.codesAssigned).toBe(1);
    expect(prisma.__updateCalls).toHaveLength(1);
    expect(prisma.__updateCalls[0].id).toBe('u1');
    expect(prisma.__updateCalls[0].data.referralCode).toMatch(
      /^PCLUB-[A-HJKMNP-Z2-9]{6}$/,
    );
  });

  it('R5 — Idempotente: corrida 2 vez sobre 0 candidatos produce 0 cambios', async () => {
    const prisma = createPrismaMock();
    (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([]); // ya no quedan users sin código

    const result = await runBackfill(prisma, {
      dryRun: false,
      chunkSize: 500,
      commitChunkSize: 100,
      reportDir: '/tmp',
      now: fixedNow,
    });

    expect(result.summary.totals.codesAssigned).toBe(0);
    expect(prisma.__updateCalls).toHaveLength(0);
    expect(result.plan).toHaveLength(0);
  });

  it('No reasigna users que YA tienen código', async () => {
    const prisma = createPrismaMock();
    // Simulamos un user que coló con código no-null (defensa interna):
    (prisma.user.findMany as jest.Mock)
      .mockResolvedValueOnce([
        { id: 'u-with-code', email: 'x@x.com', referralCode: 'PCLUB-EXISTS' },
      ])
      .mockResolvedValueOnce([]);

    const result = await runBackfill(prisma, {
      dryRun: false,
      chunkSize: 500,
      commitChunkSize: 100,
      reportDir: '/tmp',
      now: fixedNow,
    });

    // El user se cuenta como escaneado pero no se le toca.
    expect(result.summary.totals.codesAssigned).toBe(0);
    expect(prisma.__updateCalls).toHaveLength(0);
  });

  it('buildRollbackSql produce UPDATE inverso por user', () => {
    const sql = buildRollbackSql([
      { userId: 'u-1', email: 'a@x.com', referralCode: 'PCLUB-AAAAAA' },
      { userId: 'u-2', email: 'b@x.com', referralCode: 'PCLUB-BBBBBB' },
    ]);
    expect(sql).toMatch(/UPDATE users SET "referralCode" = NULL/);
    expect(sql).toContain("id = 'u-1' AND \"referralCode\" = 'PCLUB-AAAAAA'");
    expect(sql).toContain("id = 'u-2' AND \"referralCode\" = 'PCLUB-BBBBBB'");
  });

  it('buildRollbackSql con plan vacío no rompe', () => {
    const sql = buildRollbackSql([]);
    expect(sql).toContain('No referral codes to rollback');
  });

  it('Códigos planificados en la misma corrida no se repiten (anti-colisión in-run)', async () => {
    const prisma = createPrismaMock();
    (prisma.user.findMany as jest.Mock)
      .mockResolvedValueOnce(
        Array.from({ length: 30 }, (_, i) => ({
          id: `u${i}`,
          email: `u${i}@x.com`,
          referralCode: null,
        })),
      )
      .mockResolvedValueOnce([]);

    const result = await runBackfill(prisma, {
      dryRun: true,
      chunkSize: 500,
      commitChunkSize: 100,
      reportDir: '/tmp',
      now: fixedNow,
    });

    const codes = result.plan.map((p) => p.referralCode);
    const uniques = new Set(codes);
    expect(uniques.size).toBe(codes.length); // todos únicos
  });
});
