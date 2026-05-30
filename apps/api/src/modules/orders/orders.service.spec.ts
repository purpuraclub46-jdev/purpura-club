import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { FiscalConfigService } from '../fiscal/fiscal-config.service';
import { MembershipsService } from '../memberships/memberships.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { ReferralsService } from '../referrals/referrals.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';

/**
 * Unit tests para OrdersService — FASE 1 / CRÍTICO #2.
 *
 * Cobertura T3.*–T4.* del Plan FASE 1 con énfasis ABSOLUTO en seguridad:
 *
 *   T3.3 — User A NUNCA debe ver órdenes de User B, bajo ninguna
 *   circunstancia. Este test es el más crítico de FASE 1.
 *
 * Estrategia de mocks: el comportamiento real del WHERE OR contra
 * Postgres se valida en integration (D7 staging) — aquí verificamos que
 * el WHERE construido es correcto y que el filtro NUNCA contiene el id
 * del User equivocado.
 *
 * Estrategia de unit tests vs integration:
 *   - Unit (este archivo): valida control flow + estructura del WHERE.
 *   - Integration (D7): valida que Postgres ejecuta el filtro
 *     correctamente y que un Customer.userId equivocado no leak datos.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────

type RepoMock = {
  include: object;
  findMany: jest.Mock;
  findById: jest.Mock;
  findByNumber: jest.Mock;
  numberExists: jest.Mock;
};

type PrismaMock = {
  order: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
  };
  inventoryLocation: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

function createRepoMock(): RepoMock {
  return {
    include: { user: true, customer: true, items: true, location: true },
    findMany: jest.fn(),
    findById: jest.fn(),
    findByNumber: jest.fn(),
    numberExists: jest.fn(),
  };
}

function createPrismaMock(): PrismaMock {
  return {
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    inventoryLocation: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
}

function defaultQuery(overrides: Partial<OrderQueryDto> = {}): OrderQueryDto {
  return {
    page: 1,
    limit: 20,
    ...overrides,
  } as OrderQueryDto;
}

/** Order mock minimalista. toResponse() en service maneja campos null. */
function makeOrderFixture(overrides: Partial<any> = {}) {
  return {
    id: 'order-uuid',
    number: 'ORD-001',
    userId: null,
    customerId: null,
    channel: 'ECOMMERCE',
    status: 'PAID',
    subtotal: '100.00',
    discount: '0.00',
    total: '100.00',
    paymentMethod: 'YAPE',
    igvRate: '18.00',
    subtotalUntaxed: '84.75',
    igvAmount: '15.25',
    pricesIncludeIgv: true,
    receiptType: null,
    receiptSeries: null,
    receiptNumber: null,
    receiptIssuedAt: null,
    customerDocumentType: null,
    customerDocumentNumber: null,
    customerLegalName: null,
    customerFiscalAddress: null,
    customerEmail: null,
    sunatStatus: 'PENDING',
    sunatErrorCode: null,
    sunatErrorMessage: null,
    sunatSubmittedAt: null,
    cashSessionId: null,
    inventoryLocationId: null,
    notes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: null,
    customer: null,
    location: null,
    items: [],
    ...overrides,
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────

describe('OrdersService — FASE 1 / D4 — Historial unificado + ownership seguro', () => {
  let service: OrdersService;
  let repository: RepoMock;
  let prisma: PrismaMock;

  beforeEach(async () => {
    repository = createRepoMock();
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: repository },
        { provide: PrismaService, useValue: prisma },
        // Stub services no usados por findMine/findOneForCustomer
        {
          provide: MembershipsService,
          useValue: { activateOrRenew: jest.fn() },
        },
        {
          provide: ReferralsService,
          useValue: { claimRewardForFirstPurchase: jest.fn() },
        },
        {
          provide: ReceiptsService,
          useValue: { issue: jest.fn() },
        },
        {
          provide: FiscalConfigService,
          useValue: {
            effectiveIgvRate: jest.fn().mockReturnValue(18),
            pricesIncludeIgv: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // ─── findMine ─────────────────────────────────────────────────────────

  describe('findMine — Historial unificado /orders/me', () => {
    it('T3.1 — Órdenes Ecommerce (userId directo) son listadas', async () => {
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      await service.findMine('user-a-uuid', defaultQuery());

      expect(repository.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userId: 'user-a-uuid' },
            { customer: { userId: 'user-a-uuid' } },
          ],
        },
        page: 1,
        limit: 20,
      });
    });

    it('T3.2 — WHERE incluye rama customer.userId para órdenes POS de walk-ins linkeados', async () => {
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      await service.findMine('user-a-uuid', defaultQuery());

      const call = repository.findMany.mock.calls[0][0];
      // Verificar EXPLÍCITAMENTE que rama 2 del OR es el JOIN nested
      // (no es customerId IN raw — que sería vulnerable a anomalías)
      expect(call.where.OR[1]).toEqual({
        customer: { userId: 'user-a-uuid' },
      });
    });

    // ─── T3.3 — TEST DE SEGURIDAD CRÍTICO ─────────────────────────────
    it('T3.3 — SECURITY: User A NUNCA recibe filtro con userId de User B', async () => {
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      // User A solicita su lista
      await service.findMine('user-a-uuid', defaultQuery());
      const userACall = repository.findMany.mock.calls[0][0];

      // User B solicita su lista
      await service.findMine('user-b-uuid', defaultQuery());
      const userBCall = repository.findMany.mock.calls[1][0];

      // AISLAMIENTO TOTAL: la query de User A no menciona user-b-uuid
      // en NINGÚN nivel del objeto WHERE (recursivo).
      const userAQueryJson = JSON.stringify(userACall.where);
      const userBQueryJson = JSON.stringify(userBCall.where);

      expect(userAQueryJson).not.toContain('user-b-uuid');
      expect(userBQueryJson).not.toContain('user-a-uuid');

      // VERIFICACIÓN ADICIONAL: la rama OR(customer.userId) nunca
      // se construye con cualquier valor distinto al JWT.id.
      expect(userACall.where.OR).toEqual([
        { userId: 'user-a-uuid' },
        { customer: { userId: 'user-a-uuid' } },
      ]);
      expect(userBCall.where.OR).toEqual([
        { userId: 'user-b-uuid' },
        { customer: { userId: 'user-b-uuid' } },
      ]);
    });

    it('T3.4 — Órdenes anónimas (customer.userId=null) NUNCA aparecen — el JOIN las excluye por construcción', async () => {
      // Esta es una propiedad del filtro Prisma: customer: { userId }
      // se traduce a JOIN. Una orden con customerId=null no satisface
      // la cláusula (no hay row Customer asociada). Una orden con
      // Customer.userId=null tampoco la satisface.
      //
      // Validamos que el filtro construido NO contiene cláusulas que
      // permitan que órdenes con userId=null y customer.userId=null
      // sean incluidas accidentalmente.
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      await service.findMine('user-a-uuid', defaultQuery());
      const call = repository.findMany.mock.calls[0][0];

      // Inspección estructural: NO debe haber rama OR sin valor de userId
      expect(call.where.OR).toHaveLength(2);
      expect(call.where.OR[0]).toEqual({ userId: 'user-a-uuid' });
      expect(call.where.OR[1]).toEqual({
        customer: { userId: 'user-a-uuid' },
      });
      // Ninguna rama es { userId: null } ni { customerId: { not: null } }
      expect(call.where.OR.some((b: any) => b.userId === null)).toBe(false);
      expect(call.where.OR.some((b: any) => 'customerId' in b)).toBe(false);
    });

    it('T3.5 — Filtros adicionales (status, paymentMethod) se aplican como AND sobre el OR', async () => {
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      await service.findMine(
        'user-a-uuid',
        defaultQuery({ status: 'PAID' as any, paymentMethod: 'YAPE' as any }),
      );

      const call = repository.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.status).toBe('PAID');
      expect(call.where.paymentMethod).toBe('YAPE');
    });

    it('T3.6 — Paginación se respeta y no afecta el WHERE de ownership', async () => {
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      await service.findMine(
        'user-a-uuid',
        defaultQuery({ page: 3, limit: 50 }),
      );

      const call = repository.findMany.mock.calls[0][0];
      expect(call.page).toBe(3);
      expect(call.limit).toBe(50);
      expect(call.where.OR).toEqual([
        { userId: 'user-a-uuid' },
        { customer: { userId: 'user-a-uuid' } },
      ]);
    });

    it('T3.7 — ANOMALY: Si historicamente Order.customerId apunta a Customer cuyo userId difiere de JWT, el JOIN lo excluye (responsabilidad del filtro, no del backfill)', async () => {
      // Este test verifica que el FILTRO depende del JOIN nested
      // (`customer: { userId }`), NO de Order.customerId directo. Esto
      // significa que aunque por anomalía histórica Order.customerId
      // apunte a un Customer "extraviado", la query solo lo incluirá
      // si ese Customer está vinculado a este User.
      //
      // En unit test, mostramos que el filtro NO usa Order.customerId
      // como criterio directo — el WHERE no debe contener `customerId`
      // sin JOIN.
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      await service.findMine('user-a-uuid', defaultQuery());
      const call = repository.findMany.mock.calls[0][0];

      // Asegurar que NO usamos Order.customerId IN ... ni similar
      const whereJson = JSON.stringify(call.where);
      expect(whereJson).not.toMatch(/"customerId"\s*:\s*\{/);
      expect(whereJson).not.toMatch(/"customerId"\s*:\s*"/);

      // El check de ownership por Customer va EXCLUSIVAMENTE via JOIN
      // customer: { userId } — esto delega la verificación a Postgres
      // que aplica el unique constraint Customer.userId@unique.
      expect(call.where.OR[1].customer.userId).toBe('user-a-uuid');
    });
  });

  // ─── findOneForCustomer ──────────────────────────────────────────────

  describe('findOneForCustomer — Detalle /orders/me/:idOrNumber', () => {
    it('T4.1 — Orden propia por UUID (userId directo) → retorna detalle', async () => {
      prisma.order.findFirst.mockResolvedValue(
        makeOrderFixture({
          id: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
          userId: 'user-a-uuid',
        }),
      );

      const result = await service.findOneForCustomer(
        'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
        'user-a-uuid',
      );

      expect(result.id).toBe('a1b2c3d4-e5f6-7890-abcd-ef0123456789');
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { id: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789' },
              {
                OR: [
                  { userId: 'user-a-uuid' },
                  { customer: { userId: 'user-a-uuid' } },
                ],
              },
            ],
          },
        }),
      );
    });

    it('T4.2 — Orden propia por número humano (Order.number) → retorna detalle', async () => {
      prisma.order.findFirst.mockResolvedValue(
        makeOrderFixture({ number: 'ORD-20260101-0001', userId: 'user-a-uuid' }),
      );

      const result = await service.findOneForCustomer(
        'ORD-20260101-0001',
        'user-a-uuid',
      );

      expect(result.number).toBe('ORD-20260101-0001');
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { number: 'ORD-20260101-0001' },
              {
                OR: [
                  { userId: 'user-a-uuid' },
                  { customer: { userId: 'user-a-uuid' } },
                ],
              },
            ],
          },
        }),
      );
    });

    it('T4.3 — Orden POS propia vía Customer link → ownership por customer.userId', async () => {
      prisma.order.findFirst.mockResolvedValue(
        makeOrderFixture({
          number: 'POS-001',
          userId: null, // legacy POS antes del link
          customerId: 'cust-uuid',
          customer: { userId: 'user-a-uuid' }, // ahora linkeado
        }),
      );

      const result = await service.findOneForCustomer('POS-001', 'user-a-uuid');

      expect(result.number).toBe('POS-001');
    });

    it('T4.4 — SECURITY: Orden ajena → NotFoundException (NO ForbiddenException) — anti-enumeration', async () => {
      // El service NO carga la orden y luego compara — el WHERE incluye
      // ownership desde el inicio. Si la orden existe pero no es mía,
      // findFirst devuelve null exactamente igual que si no existiera.
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneForCustomer(
          'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
          'user-a-uuid',
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findOneForCustomer(
          'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
          'user-a-uuid',
        ),
      ).rejects.toThrow('Pedido no encontrado');
    });

    it('T4.5 — SECURITY: el WHERE de findOneForCustomer nunca contiene userId ajeno', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      try {
        await service.findOneForCustomer(
          'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
          'user-a-uuid',
        );
      } catch {
        /* expected NotFound */
      }

      const call = prisma.order.findFirst.mock.calls[0][0];
      const whereJson = JSON.stringify(call.where);
      // Verificar aislamiento: la query SOLO contiene user-a-uuid.
      expect(whereJson).toContain('user-a-uuid');
      expect(whereJson).not.toContain('user-b-uuid');
      expect(whereJson).not.toContain('user-c-uuid');
    });

    it('T4.6 — UUID detection: input con guión pero no UUID es tratado como número', async () => {
      prisma.order.findFirst.mockResolvedValue(
        makeOrderFixture({ number: 'ORD-2026-001' }),
      );

      await service.findOneForCustomer('ORD-2026-001', 'user-a-uuid');

      const call = prisma.order.findFirst.mock.calls[0][0];
      // Debe tratarlo como number, no como id
      expect(call.where.AND[0]).toEqual({ number: 'ORD-2026-001' });
    });
  });
});
