/**
 * Unit tests para FASE 1 / D6 — backfill-customer-user-link script.
 *
 * Cobertura T8.*:
 *   T8.1 — Dry-run no produce escrituras
 *   T8.2 — Commit aplica linkByDni y createNew, devuelve IDs para rollback
 *   T8.3 — Idempotencia: segunda corrida no toca DB
 *   T8.4 — DNI sin match + email match → candidate-by-email + Customer creado
 *   T8.5 — Feature flag OFF → abort sin queries
 *   T8.6 — Rollback SQL generado correctamente
 *   T8.7 — CSV generado con escape de caracteres especiales
 *
 * Estrategia: mock manual de BackfillPrisma (interface controlada). No
 * tocamos PrismaClient real ni filesystem — runBackfill devuelve
 * artifacts en memoria, el CLI los escribe (no testeado aquí).
 */

import {
  BackfillPlan,
  BackfillPrisma,
  generateCsv,
  generateRollbackSql,
  planBackfill,
  runBackfill,
  __internals__,
} from './backfill-customer-user-link';

// ─── Mock Prisma ─────────────────────────────────────────────────────────

function createPrismaMock(): BackfillPrisma & {
  user: { findMany: jest.Mock };
  customer: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  $transaction: jest.Mock;
} {
  const mock: any = {
    user: { findMany: jest.fn().mockResolvedValue([]) },
    customer: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve({ id: where.id, userId: 'linked-user' }),
      ),
      create: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ id: `created-${Math.random().toString(36).slice(2, 8)}` }),
        ),
    },
    $transaction: jest.fn().mockImplementation(async (operations: any) => {
      if (Array.isArray(operations)) {
        // operations son promesas ya iniciadas — resolverlas
        return Promise.all(operations);
      }
      return operations(mock);
    }),
  };
  return mock;
}

function defaultOptions(overrides: any = {}) {
  return {
    dryRun: true,
    chunkSize: 100,
    commitChunkSize: 50,
    reportDir: '/tmp/test',
    now: new Date('2026-05-30T12:00:00Z'),
    ...overrides,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────

const ORIGINAL_FLAG = process.env.CUSTOMER_AUTO_LINK_BY_DNI;

beforeEach(() => {
  // Asegurar feature flag ON por default en cada test.
  process.env.CUSTOMER_AUTO_LINK_BY_DNI = 'true';
});

afterAll(() => {
  // Restaurar env var.
  if (ORIGINAL_FLAG === undefined) {
    delete process.env.CUSTOMER_AUTO_LINK_BY_DNI;
  } else {
    process.env.CUSTOMER_AUTO_LINK_BY_DNI = ORIGINAL_FLAG;
  }
});

// ─── Suite ───────────────────────────────────────────────────────────────

describe('runBackfill — FASE 1 / D6', () => {
  // ─── T8.1 ─────────────────────────────────────────────────────────────
  it('T8.1 — Dry-run NO produce escrituras (update/create no se invocan)', async () => {
    const prisma = createPrismaMock();
    prisma.user.findMany
      .mockResolvedValueOnce([
        {
          id: 'user-1',
          email: 'a@x.com',
          firstName: 'A',
          lastName: 'One',
          dni: '11111111',
        },
      ])
      .mockResolvedValueOnce([]); // empty para terminar cursor
    prisma.customer.findFirst.mockResolvedValueOnce({
      id: 'orphan-cust-1',
      email: null,
      phone: null,
    });

    const result = await runBackfill(prisma, defaultOptions({ dryRun: true }));

    expect(prisma.customer.update).not.toHaveBeenCalled();
    expect(prisma.customer.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();

    expect(result.summary.mode).toBe('dry-run');
    expect(result.summary.totals.usersScanned).toBe(1);
    expect(result.summary.totals.customersLinkedByDni).toBe(1);
    expect(result.plan.linkByDni).toHaveLength(1);
  });

  // ─── T8.2 ─────────────────────────────────────────────────────────────
  it('T8.2 — Commit aplica linkByDni + createNew y devuelve IDs para rollback', async () => {
    const prisma = createPrismaMock();
    prisma.user.findMany
      .mockResolvedValueOnce([
        {
          id: 'user-1',
          email: 'a@x.com',
          firstName: 'A',
          lastName: 'One',
          dni: '11111111',
        },
        {
          id: 'user-2',
          email: 'b@x.com',
          firstName: 'B',
          lastName: 'Two',
          dni: null, // sin DNI → solo createNew
        },
      ])
      .mockResolvedValueOnce([]);
    // user-1 DNI matchea orphan
    prisma.customer.findFirst.mockResolvedValueOnce({
      id: 'orphan-cust-1',
      email: null,
      phone: null,
    });
    // user-2: no busca por DNI (es null), busca por email → no match
    prisma.customer.findFirst.mockResolvedValueOnce(null);
    // create devuelve IDs deterministicos
    prisma.customer.create
      .mockResolvedValueOnce({ id: 'new-cust-2' });

    const result = await runBackfill(prisma, defaultOptions({ dryRun: false }));

    // 1 update (link), 1 create
    expect(prisma.customer.update).toHaveBeenCalledTimes(1);
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'orphan-cust-1' },
      data: { userId: 'user-1' },
    });
    expect(prisma.customer.create).toHaveBeenCalledTimes(1);

    expect(result.summary.mode).toBe('commit');
    expect(result.summary.linkedCustomerIds).toEqual(['orphan-cust-1']);
    expect(result.summary.createdCustomerIds).toEqual(['new-cust-2']);
  });

  // ─── T8.3 ─────────────────────────────────────────────────────────────
  it('T8.3 — Idempotencia: segunda corrida no procesa Users ya linkeados', async () => {
    const prisma = createPrismaMock();
    // Simulación primera corrida: 1 user retornado
    // Segunda corrida: 0 users (porque ya tienen customerProfile)
    prisma.user.findMany.mockResolvedValueOnce([]); // segunda corrida

    const result = await runBackfill(prisma, defaultOptions({ dryRun: false }));

    expect(result.summary.totals.usersScanned).toBe(0);
    expect(result.summary.totals.customersLinkedByDni).toBe(0);
    expect(result.summary.totals.customersCreatedForUser).toBe(0);
    expect(prisma.customer.update).not.toHaveBeenCalled();
    expect(prisma.customer.create).not.toHaveBeenCalled();

    // VERIFICACIÓN CLAVE: el query usa `customerProfile: null` filter
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerProfile: null },
      }),
    );
  });

  // ─── T8.4 ─────────────────────────────────────────────────────────────
  it('T8.4 — DNI sin match + email match → emailCandidate + createNew (sin auto-link por email)', async () => {
    const prisma = createPrismaMock();
    prisma.user.findMany
      .mockResolvedValueOnce([
        {
          id: 'user-1',
          email: 'shared@example.com',
          firstName: 'A',
          lastName: 'One',
          dni: '11111111', // tiene DNI
        },
      ])
      .mockResolvedValueOnce([]);
    // DNI: NO match
    prisma.customer.findFirst.mockResolvedValueOnce(null);
    // Email: match
    prisma.customer.findFirst.mockResolvedValueOnce({
      id: 'email-cand-cust-1',
      email: 'shared@example.com',
      phone: null,
    });
    // findUnique para getCustomerFullName
    prisma.customer.findUnique.mockResolvedValueOnce({
      fullName: 'Email Match Person',
    });
    prisma.customer.create.mockResolvedValueOnce({ id: 'new-cust-1' });

    const result = await runBackfill(prisma, defaultOptions({ dryRun: false }));

    // Email candidate registrado para revisión
    expect(result.plan.emailCandidates).toHaveLength(1);
    expect(result.plan.emailCandidates[0]).toMatchObject({
      userId: 'user-1',
      userEmail: 'shared@example.com',
      customerId: 'email-cand-cust-1',
      customerFullName: 'Email Match Person',
      userHasDniNoMatch: true,
    });

    // SIN auto-link por email — Customer huérfano email-cand queda intacto
    expect(prisma.customer.update).not.toHaveBeenCalled();

    // Customer NUEVO creado para el User
    expect(prisma.customer.create).toHaveBeenCalledTimes(1);
    expect(result.summary.linkedCustomerIds).toEqual([]);
    expect(result.summary.createdCustomerIds).toEqual(['new-cust-1']);
  });

  // ─── T8.5 ─────────────────────────────────────────────────────────────
  it('T8.5 — Feature flag CUSTOMER_AUTO_LINK_BY_DNI=false → abort sin queries', async () => {
    process.env.CUSTOMER_AUTO_LINK_BY_DNI = 'false';
    const prisma = createPrismaMock();

    await expect(runBackfill(prisma, defaultOptions())).rejects.toThrow(
      /CUSTOMER_AUTO_LINK_BY_DNI is OFF/i,
    );

    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.customer.update).not.toHaveBeenCalled();
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });
});

// ─── Rollback SQL ───────────────────────────────────────────────────────

describe('generateRollbackSql', () => {
  // ─── T8.6 ─────────────────────────────────────────────────────────────
  it('T8.6 — Genera UPDATE para linked + DELETE para created', () => {
    const sql = generateRollbackSql(
      ['cust-link-1', 'cust-link-2'],
      ['cust-new-1', 'cust-new-2'],
      'commit',
    );

    expect(sql).toContain('UPDATE customers SET user_id = NULL WHERE id IN');
    expect(sql).toContain("'cust-link-1'");
    expect(sql).toContain("'cust-link-2'");
    expect(sql).toContain('DELETE FROM customers WHERE id IN');
    expect(sql).toContain("'cust-new-1'");
    expect(sql).toContain("'cust-new-2'");
    // Header con advertencia
    expect(sql).toContain('Modo: commit');
  });

  it('T8.6b — Dry-run produce SQL vacío con comentario explicativo', () => {
    const sql = generateRollbackSql([], [], 'dry-run');
    expect(sql).toContain('DRY RUN');
    expect(sql).not.toContain('UPDATE customers');
    expect(sql).not.toContain('DELETE FROM customers');
  });

  it('T8.6c — Commit con cero cambios produce SQL con nota', () => {
    const sql = generateRollbackSql([], [], 'commit');
    expect(sql).toContain('No hubo cambios aplicados');
  });
});

// ─── CSV generation ─────────────────────────────────────────────────────

describe('generateCsv', () => {
  // ─── T8.7 ─────────────────────────────────────────────────────────────
  it('T8.7 — CSV header + escape de comillas y comas', () => {
    const plan: BackfillPlan = {
      linkByDni: [],
      createNew: [],
      emailCandidates: [
        {
          userId: 'user-1',
          userEmail: 'a@x.com',
          customerId: 'cust-1',
          customerFullName: 'Doe, Jane "Jay"',
          userHasDniNoMatch: false,
        },
      ],
      errors: [],
    };

    const csv = generateCsv(plan);

    expect(csv).toContain(
      'userId,userEmail,customerId,customerFullName,userHasDniNoMatch',
    );
    // El fullName con comas y comillas debe ir entre comillas + " escapado
    expect(csv).toContain('"Doe, Jane ""Jay"""');
    expect(csv).toContain('user-1,a@x.com,cust-1,');
  });

  it('T8.7b — CSV con plan vacío: solo header', () => {
    const csv = generateCsv({
      linkByDni: [],
      createNew: [],
      emailCandidates: [],
      errors: [],
    });
    expect(csv).toContain(
      'userId,userEmail,customerId,customerFullName,userHasDniNoMatch',
    );
    expect(csv.trim().split('\n')).toHaveLength(1); // solo header
  });
});

// ─── Plan logic ─────────────────────────────────────────────────────────

describe('planBackfill — pure planner', () => {
  it('Plan: user sin DNI ni email match → solo createNew', async () => {
    const prisma = createPrismaMock();
    prisma.user.findMany
      .mockResolvedValueOnce([
        {
          id: 'user-z',
          email: 'z@example.com',
          firstName: 'Z',
          lastName: 'Last',
          dni: null,
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.customer.findFirst.mockResolvedValue(null);

    const { plan, usersScanned } = await planBackfill(prisma, defaultOptions());

    expect(usersScanned).toBe(1);
    expect(plan.linkByDni).toHaveLength(0);
    expect(plan.createNew).toHaveLength(1);
    expect(plan.emailCandidates).toHaveLength(0);
  });

  it('Plan: cursor pagination respeta orderBy id ASC', async () => {
    const prisma = createPrismaMock();
    // 3 users en chunks de 2
    prisma.user.findMany
      .mockResolvedValueOnce([
        { id: 'u1', email: 'a@x', firstName: 'A', lastName: 'A', dni: null },
        { id: 'u2', email: 'b@x', firstName: 'B', lastName: 'B', dni: null },
      ])
      .mockResolvedValueOnce([
        { id: 'u3', email: 'c@x', firstName: 'C', lastName: 'C', dni: null },
      ])
      .mockResolvedValueOnce([]);
    prisma.customer.findFirst.mockResolvedValue(null);

    const { plan, usersScanned } = await planBackfill(
      prisma,
      defaultOptions({ chunkSize: 2 }),
    );

    expect(usersScanned).toBe(3);
    expect(plan.createNew).toHaveLength(3);
    // Verificar que se llamó con orderBy id ASC
    const firstCall = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(firstCall.orderBy).toEqual({ id: 'asc' });
    expect(firstCall.where).toEqual({ customerProfile: null });
  });
});

// ─── Helpers internos ───────────────────────────────────────────────────

describe('Internal helpers', () => {
  it('parseBool: trabaja con valores estándar y fallback', () => {
    expect(__internals__.parseBool('true', false)).toBe(true);
    expect(__internals__.parseBool('false', true)).toBe(false);
    expect(__internals__.parseBool('1', false)).toBe(true);
    expect(__internals__.parseBool('0', true)).toBe(false);
    expect(__internals__.parseBool('yes', false)).toBe(true);
    expect(__internals__.parseBool('no', true)).toBe(false);
    expect(__internals__.parseBool(undefined, true)).toBe(true);
    expect(__internals__.parseBool('garbage', false)).toBe(false);
  });

  it('formatTimestamp: filesystem-safe (sin : ni .)', () => {
    const ts = __internals__.formatTimestamp(new Date('2026-05-30T12:34:56.789Z'));
    expect(ts).not.toMatch(/[:.]/);
    expect(ts).toMatch(/^2026-05-30T12-34-56-789/);
  });

  it('parseCliArgs: dry-run por default, --commit cambia', () => {
    expect(__internals__.parseCliArgs([])).toMatchObject({ dryRun: true });
    expect(__internals__.parseCliArgs(['--commit'])).toMatchObject({
      dryRun: false,
    });
    expect(
      __internals__.parseCliArgs(['--chunk-size=250']),
    ).toMatchObject({ chunkSize: 250 });
  });

  it('csvEscape: maneja null, comillas, comas, newlines', () => {
    expect(__internals__.csvEscape(null)).toBe('');
    expect(__internals__.csvEscape(undefined)).toBe('');
    expect(__internals__.csvEscape('plain')).toBe('plain');
    expect(__internals__.csvEscape('with,comma')).toBe('"with,comma"');
    expect(__internals__.csvEscape('he said "hi"')).toBe('"he said ""hi"""');
    expect(__internals__.csvEscape('line\nbreak')).toBe('"line\nbreak"');
  });

  it('buildFullName: trim + colapsa espacios múltiples', () => {
    expect(__internals__.buildFullName('  Jane ', ' Doe  ')).toBe('Jane Doe');
    expect(__internals__.buildFullName('Mary  Ann', 'Smith')).toBe(
      'Mary Ann Smith',
    );
  });
});
