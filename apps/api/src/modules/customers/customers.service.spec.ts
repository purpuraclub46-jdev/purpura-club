import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomerDocumentType, Role } from '@prisma/client';
import { APP_CONFIG_KEY } from '../../config/app.config';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

/**
 * Unit tests para CustomersService — FASE 1 / CRÍTICO #3 (D5).
 *
 * Cobertura:
 *   T5.* — Auto-link por DNI en create() + feature flag + audit
 *   T6.* — linkUser() endpoint admin con guards + audit
 *   T6.6+ — findDedupeCandidates() SUPER_ADMIN
 *
 * Política aprobada:
 *   - Auto-match SOLO por DNI (estricto).
 *   - Feature flag CUSTOMER_AUTO_LINK_BY_DNI debe poder OFF sin redeploy.
 *   - Audit trail estructurado para toda vinculación manual y automática.
 *   - dedupe-candidates restringido a SUPER_ADMIN (defense-in-depth).
 *
 * ROADMAP: AuditLog persistente en DB diferido a FASE 1.5/2. Por ahora
 * structured logging es la fuente de auditoría — los tests verifican
 * que se emite el JSON correcto via Logger.log mock.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────

type PrismaMock = {
  customer: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
  inventoryLocation: { findUnique: jest.Mock };
  order: { count: jest.Mock; aggregate: jest.Mock; findMany: jest.Mock };
  raffleEntry: { count: jest.Mock; findMany: jest.Mock };
  rafflePrize: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  const mock: PrismaMock = {
    customer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    inventoryLocation: { findUnique: jest.fn() },
    order: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
    raffleEntry: { count: jest.fn(), findMany: jest.fn() },
    rafflePrize: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  // Default: ejecutar callback con el mismo mock como `tx`.
  mock.$transaction.mockImplementation((cb: any) => {
    if (Array.isArray(cb)) {
      return Promise.all(cb);
    }
    return cb(mock);
  });
  return mock;
}

function createConfigMock(autoLinkEnabled: boolean) {
  return {
    get: jest.fn((key: string) => {
      if (key === APP_CONFIG_KEY) {
        return { customerAutoLinkByDni: autoLinkEnabled };
      }
      return undefined;
    }),
  };
}

function makeActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'actor-admin-uuid',
    email: 'admin@purpura.club',
    role: Role.ADMIN,
    roleSlugs: ['admin'],
    permissions: ['customers.create', 'customers.edit', 'users.view'],
    inventoryLocationId: null,
    ...overrides,
  } as AuthenticatedUser;
}

function makeSuperAdmin(): AuthenticatedUser {
  return makeActor({
    id: 'actor-super-uuid',
    role: Role.SUPER_ADMIN,
    roleSlugs: ['super_admin'],
    permissions: ['*'],
  });
}

function makeCreateDto(overrides: Partial<CreateCustomerDto> = {}): CreateCustomerDto {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    email: undefined,
    phone: undefined,
    dni: undefined,
    documentType: CustomerDocumentType.DNI,
    ruc: undefined,
    legalName: undefined,
    fiscalAddress: undefined,
    birthDate: undefined,
    gender: undefined,
    notes: undefined,
    isMember: undefined,
    active: undefined,
    primaryLocationId: undefined,
    userId: undefined,
    ...overrides,
  } as CreateCustomerDto;
}

/** Customer creado mock — shape minimal para toResponse. */
function makeCreatedCustomer(overrides: any = {}) {
  return {
    id: 'cust-new-uuid',
    userId: null,
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    email: null,
    phone: null,
    dni: null,
    documentType: 'DNI',
    ruc: null,
    legalName: null,
    fiscalAddress: null,
    birthDate: null,
    gender: null,
    notes: null,
    isMember: false,
    membershipExpiresAt: null,
    active: true,
    primaryLocationId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: null,
    primaryLocation: null,
    ...overrides,
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────

describe('CustomersService — FASE 1 / D5 — Auto-link + linkUser + dedupe', () => {
  let service: CustomersService;
  let prisma: PrismaMock;
  let config: ReturnType<typeof createConfigMock>;
  let loggerSpy: jest.SpyInstance;

  /** Inicializa el module con feature flag enabled/disabled. */
  async function setup(autoLinkEnabled: boolean = true) {
    prisma = createPrismaMock();
    config = createConfigMock(autoLinkEnabled);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    // Capturar audit logs vía logger.log spy
    loggerSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => {});

    // Stub computeStats — no es responsabilidad de estos tests
    // verificar stats (covered en otro lado). Evita necesitar mockear
    // 6+ queries de Prisma que computeStats ejecuta internamente.
    jest.spyOn(service as any, 'computeStats').mockResolvedValue({
      totalOrders: 0,
      paidOrders: 0,
      totalSpent: 0,
      averageTicket: 0,
      raffleEntries: 0,
      wonRaffles: 0,
      lastPurchaseAt: null,
    });
    jest.spyOn(service as any, 'resolveMembership').mockResolvedValue({
      isMember: false,
      membershipExpiresAt: null,
    });
  }

  /** Helper: extrae los audit events emitidos durante el test. */
  function getAuditEvents(): Array<Record<string, any>> {
    return loggerSpy.mock.calls
      .map((args: any[]) => String(args[0]))
      .filter((msg) => msg.startsWith('[customer.audit]'))
      .map((msg) => JSON.parse(msg.replace('[customer.audit] ', '')));
  }

  // ─── T5.* — create() con auto-link ──────────────────────────────────

  describe('create() — auto-link por DNI', () => {
    it('T5.1 — DNI coincide con User huérfano → auto-link + audit emitido', async () => {
      await setup(true);

      const dto = makeCreateDto({ dni: '72345678' });
      const actor = makeActor();

      // El User huérfano matchea por DNI
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'orphan-user-uuid',
        email: 'orphan@example.com',
      });
      // assertUniqueness queries (todas vacías)
      prisma.customer.findFirst.mockResolvedValue(null);
      // userId provisto post-autolink → assertUniqueness valida que existe
      prisma.user.findUnique.mockResolvedValue({ id: 'orphan-user-uuid' });
      // Order/raffle counts para resolveMembership (sin membership)
      prisma.order.findMany.mockResolvedValue([]);
      // Create efectivo
      prisma.customer.create.mockResolvedValue(
        makeCreatedCustomer({
          userId: 'orphan-user-uuid',
          dni: '72345678',
          email: 'orphan@example.com',
        }),
      );

      const result = await service.create(dto, actor);

      // 1. user.findFirst se llamó con dni + customerProfile null
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { dni: '72345678', customerProfile: null },
        select: { id: true, email: true },
      });

      // 2. customer.create recibió userId = orphan-user-uuid
      expect(prisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'orphan-user-uuid',
            dni: '72345678',
            email: 'orphan@example.com', // copiado del orphan
          }),
        }),
      );

      // 3. Audit emitido con shape correcto
      const audits = getAuditEvents();
      const autoLinkAudit = audits.find(
        (a) => a.action === 'customer.auto_link_by_dni',
      );
      expect(autoLinkAudit).toBeDefined();
      expect(autoLinkAudit).toMatchObject({
        audit: true,
        action: 'customer.auto_link_by_dni',
        actorId: 'actor-admin-uuid',
        actorRole: Role.ADMIN,
        customerId: 'cust-new-uuid',
        userId: 'orphan-user-uuid',
        source: 'customers.create',
        meta: { dni: '72345678' },
      });
      expect(autoLinkAudit?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      expect(result.userId).toBe('orphan-user-uuid');
    });

    it('T5.2 — DNI coincide con User YA con Customer → orphanUser filter lo excluye, NO auto-link', async () => {
      // El query usa customerProfile: null en el WHERE, así que un User
      // con customerProfile NUNCA aparece como huérfano. Demostramos que
      // el caller respeta esa semántica.
      await setup(true);

      const dto = makeCreateDto({ dni: '72345678' });
      const actor = makeActor();

      // findFirst devuelve null porque ningún User huérfano matchea
      // (el matching User tiene customerProfile, excluido por filter)
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.customer.create.mockResolvedValue(
        makeCreatedCustomer({ dni: '72345678' }),
      );

      const result = await service.create(dto, actor);

      // No hay audit de auto-link
      const audits = getAuditEvents();
      expect(audits.find((a) => a.action === 'customer.auto_link_by_dni')).toBeUndefined();

      // Customer creado SIN userId (huérfano normal)
      expect(prisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: null }),
        }),
      );
      expect(result.userId).toBeNull();
    });

    it('T5.3 — DNI nuevo (sin User huérfano matching) → Customer huérfano normal sin audit', async () => {
      await setup(true);

      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.customer.create.mockResolvedValue(
        makeCreatedCustomer({ dni: '99999999' }),
      );

      await service.create(makeCreateDto({ dni: '99999999' }), makeActor());

      const audits = getAuditEvents();
      expect(audits.find((a) => a.action === 'customer.auto_link_by_dni')).toBeUndefined();
    });

    it('T5.4 — Feature flag OFF: NO se ejecuta auto-link aunque haya match', async () => {
      await setup(false); // ← flag OFF

      const dto = makeCreateDto({ dni: '72345678' });
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.customer.create.mockResolvedValue(
        makeCreatedCustomer({ dni: '72345678' }),
      );

      await service.create(dto, makeActor());

      // user.findFirst NO se llama porque el bloque de auto-link no se ejecuta
      expect(prisma.user.findFirst).not.toHaveBeenCalled();

      // Audit NO emitido
      const audits = getAuditEvents();
      expect(audits.find((a) => a.action === 'customer.auto_link_by_dni')).toBeUndefined();
    });

    it('T5.5 — Sin DNI provisto: bloque auto-link no se ejecuta', async () => {
      await setup(true);

      const dto = makeCreateDto({ dni: undefined }); // sin DNI
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.customer.create.mockResolvedValue(makeCreatedCustomer({ dni: null }));

      await service.create(dto, makeActor());

      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── T6.* — linkUser() ─────────────────────────────────────────────

  describe('linkUser()', () => {
    it('T6.1 — Link válido: Customer huérfano + User huérfano → 200 + audit emitido', async () => {
      await setup(true);

      prisma.customer.findUnique.mockResolvedValueOnce({
        id: 'cust-uuid',
        userId: null,
        dni: '72345678',
        email: null,
        primaryLocationId: null,
        user: null,
        primaryLocation: null,
        firstName: 'Jane',
        lastName: 'Doe',
        fullName: 'Jane Doe',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-uuid',
        email: 'jane@example.com',
        dni: '72345678',
        customerProfile: null,
      });
      prisma.customer.update.mockResolvedValueOnce({
        id: 'cust-uuid',
        userId: 'user-uuid',
        dni: '72345678',
        email: 'jane@example.com',
        primaryLocationId: null,
        primaryLocation: null,
        user: { id: 'user-uuid', email: 'jane@example.com', active: true },
        firstName: 'Jane',
        lastName: 'Doe',
        fullName: 'Jane Doe',
        documentType: 'DNI',
        ruc: null,
        legalName: null,
        fiscalAddress: null,
        birthDate: null,
        gender: null,
        isMember: false,
        membershipExpiresAt: null,
        active: true,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        phone: null,
      });
      // computeStats queries
      prisma.order.findMany.mockResolvedValue([]);

      const actor = makeActor();
      const result = await service.linkUser('cust-uuid', 'user-uuid', actor);

      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cust-uuid' },
          data: expect.objectContaining({
            userId: 'user-uuid',
            dni: '72345678',
            email: 'jane@example.com',
          }),
        }),
      );

      // Audit emitido
      const audits = getAuditEvents();
      const linkAudit = audits.find((a) => a.action === 'customer.manual_link');
      expect(linkAudit).toMatchObject({
        audit: true,
        action: 'customer.manual_link',
        actorId: 'actor-admin-uuid',
        customerId: 'cust-uuid',
        userId: 'user-uuid',
        source: 'customers.linkUser',
      });
      expect(linkAudit?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      expect(result.userId).toBe('user-uuid');
    });

    it('T6.2 — User YA tiene Customer → 409 ConflictException', async () => {
      await setup(true);

      prisma.customer.findUnique.mockResolvedValue({
        id: 'cust-uuid',
        userId: null,
        dni: null,
        email: null,
        primaryLocationId: null,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid',
        email: 'x@x.com',
        dni: null,
        customerProfile: { id: 'other-cust-uuid' }, // ya tiene Customer
      });

      let thrown: unknown;
      try {
        await service.linkUser('cust-uuid', 'user-uuid', makeActor());
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(ConflictException);
      expect((thrown as Error).message).toBe(
        'El usuario ya tiene un cliente asociado',
      );

      // NO emite audit (TX rollback)
      const audits = getAuditEvents();
      expect(audits.find((a) => a.action === 'customer.manual_link')).toBeUndefined();
    });

    it('T6.3 — Customer ya linkeado → 409 ConflictException', async () => {
      await setup(true);

      prisma.customer.findUnique.mockResolvedValueOnce({
        id: 'cust-uuid',
        userId: 'existing-user-uuid', // YA linkeado
        dni: null,
        email: null,
        primaryLocationId: null,
      });

      await expect(
        service.linkUser('cust-uuid', 'new-user-uuid', makeActor()),
      ).rejects.toThrow('Este cliente ya está vinculado a una cuenta');

      // No llega a buscar User
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('T6.4 — DNIs no coinciden → 409 ConflictException', async () => {
      await setup(true);

      prisma.customer.findUnique.mockResolvedValueOnce({
        id: 'cust-uuid',
        userId: null,
        dni: '11111111',
        email: null,
        primaryLocationId: null,
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-uuid',
        email: 'x@x.com',
        dni: '22222222', // distinto
        customerProfile: null,
      });

      await expect(
        service.linkUser('cust-uuid', 'user-uuid', makeActor()),
      ).rejects.toThrow('Los DNIs del cliente y del usuario no coinciden');
    });

    it('T6.5 — Customer no encontrado → 404 NotFoundException', async () => {
      await setup(true);

      prisma.customer.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.linkUser('missing-uuid', 'user-uuid', makeActor()),
      ).rejects.toThrow(NotFoundException);
    });

    it('T6.6 — Defensive: Customer sin DNI + User con DNI → permite link y rellena DNI del User', async () => {
      await setup(true);

      prisma.customer.findUnique.mockResolvedValueOnce({
        id: 'cust-uuid',
        userId: null,
        dni: null, // sin DNI
        email: null,
        primaryLocationId: null,
        user: null,
        primaryLocation: null,
        firstName: 'X',
        lastName: 'Y',
        fullName: 'X Y',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-uuid',
        email: 'x@example.com',
        dni: '72345678',
        customerProfile: null,
      });
      prisma.customer.update.mockResolvedValueOnce({
        id: 'cust-uuid',
        userId: 'user-uuid',
        dni: '72345678',
        email: 'x@example.com',
        primaryLocationId: null,
        primaryLocation: null,
        user: { id: 'user-uuid', email: 'x@example.com', active: true },
        firstName: 'X',
        lastName: 'Y',
        fullName: 'X Y',
        documentType: 'DNI',
        ruc: null,
        legalName: null,
        fiscalAddress: null,
        birthDate: null,
        gender: null,
        isMember: false,
        membershipExpiresAt: null,
        active: true,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        phone: null,
      });
      prisma.order.findMany.mockResolvedValue([]);

      await service.linkUser('cust-uuid', 'user-uuid', makeActor());

      expect(prisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dni: '72345678', // rellenado del User
            email: 'x@example.com',
          }),
        }),
      );
    });
  });

  // ─── findDedupeCandidates ──────────────────────────────────────────

  describe('findDedupeCandidates() — SUPER_ADMIN gobierno de datos', () => {
    it('T6.7 — Actor no SUPER_ADMIN → ForbiddenException (defense-in-depth)', async () => {
      await setup(true);

      const admin = makeActor({ role: Role.ADMIN, roleSlugs: ['admin'] });

      let thrown: unknown;
      try {
        await service.findDedupeCandidates(admin);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(ForbiddenException);
      expect((thrown as Error).message).toBe(
        'Solo SUPER_ADMIN puede consultar candidatos de dedupe',
      );

      // No emite audit ni hace queries
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('T6.8 — SUPER_ADMIN: lista candidatos por DNI matching + audit', async () => {
      await setup(true);

      prisma.user.findMany.mockResolvedValueOnce([
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
          dni: '22222222',
        },
      ]);
      prisma.customer.findMany.mockResolvedValueOnce([
        { id: 'cust-1', fullName: 'A One', email: 'a@x.com', dni: '11111111' },
        { id: 'cust-2', fullName: 'Other', email: 'other@x.com', dni: '99999999' },
      ]);

      const result = await service.findDedupeCandidates(makeSuperAdmin());

      // Solo cust-1 matchea con user-1 por DNI
      expect(result.candidatesByDni).toHaveLength(1);
      expect(result.candidatesByDni[0]).toMatchObject({
        customerId: 'cust-1',
        matchedDni: '11111111',
        userId: 'user-1',
      });

      // No email matches (cust-1 ya está en byDni, se excluye)
      expect(result.candidatesByEmail).toHaveLength(0);

      // Audit emitido
      const audits = getAuditEvents();
      const readAudit = audits.find(
        (a) => a.action === 'customer.dedupe_candidates_read',
      );
      expect(readAudit).toMatchObject({
        audit: true,
        action: 'customer.dedupe_candidates_read',
        actorRole: Role.SUPER_ADMIN,
      });
    });

    it('T6.9 — Email matching aparece SOLO en candidatesByEmail (no auto-link)', async () => {
      await setup(true);

      prisma.user.findMany.mockResolvedValueOnce([
        {
          id: 'user-x',
          email: 'shared@example.com',
          firstName: 'X',
          lastName: 'X',
          dni: null, // sin DNI
        },
      ]);
      prisma.customer.findMany.mockResolvedValueOnce([
        {
          id: 'cust-x',
          fullName: 'X X',
          email: 'shared@example.com',
          dni: null,
        },
      ]);

      const result = await service.findDedupeCandidates(makeSuperAdmin());

      expect(result.candidatesByDni).toHaveLength(0);
      expect(result.candidatesByEmail).toHaveLength(1);
      expect(result.candidatesByEmail[0]).toMatchObject({
        customerId: 'cust-x',
        matchedEmail: 'shared@example.com',
        userId: 'user-x',
      });
    });
  });
});
