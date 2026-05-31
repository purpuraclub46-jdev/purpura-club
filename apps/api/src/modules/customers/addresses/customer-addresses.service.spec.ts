import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddressType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerAddressesService } from './customer-addresses.service';

/**
 * Unit tests para CustomerAddressesService — FASE 2 / F2.5.
 *
 * Cobertura crítica:
 *   T9.x — ownership, anti-enumeration, default uniqueness, max limit,
 *          soft delete + promote next, cross-user isolation.
 *
 * El servicio NO tiene acceso a DB real: todos los mocks de prisma se
 * configuran por test. Las invariantes de transacción se simulan
 * inspeccionando llamadas a updateMany/update dentro de $transaction.
 */

type PrismaMock = {
  customer: { findFirst: jest.Mock };
  customerAddress: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  const customerAddress = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const mock: PrismaMock = {
    customer: { findFirst: jest.fn() },
    customerAddress,
    // $transaction invoca el callback con el mock como tx — todas las
    // operaciones dentro impactan los mismos jest.fn() del nivel raíz.
    $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) =>
      cb({ customerAddress }),
    ),
  };
  return mock;
}

function makeAddress(overrides: Partial<any> = {}) {
  return {
    id: 'addr-uuid-1',
    customerId: 'customer-uuid-1',
    type: AddressType.SHIPPING,
    label: 'Casa',
    recipientName: 'Juan Pérez',
    recipientPhone: '+51 987 654 321',
    street: 'Av. Javier Prado Este',
    number: '1234',
    apartment: null,
    district: 'San Isidro',
    province: 'Lima',
    region: 'Lima',
    countryCode: 'PE',
    reference: null,
    isDefault: false,
    active: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('CustomerAddressesService — F2.5', () => {
  let service: CustomerAddressesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAddressesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CustomerAddressesService);
  });

  describe('resolveCustomerId (via list)', () => {
    it('T9.1 — usuario sin Customer asociado → ForbiddenException', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.list('user-orphan')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('T9.1b — Customer inactivo es tratado como inexistente', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.list('user-disabled')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-disabled', active: true },
        select: { id: true },
      });
    });
  });

  describe('list', () => {
    it('T9.2 — retorna direcciones activas del customer, ordenadas por isDefault desc + createdAt desc', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findMany.mockResolvedValue([
        makeAddress({ id: 'a', isDefault: true }),
        makeAddress({ id: 'b' }),
      ]);

      const out = await service.list('user-uuid');

      expect(prisma.customerAddress.findMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-uuid-1', active: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      expect(out.map((a) => a.id)).toEqual(['a', 'b']);
    });
  });

  describe('findOne — anti-enumeration', () => {
    it('T9.3 — NotFoundException si addressId no pertenece al customer', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-uuid', 'foreign-addr')).rejects.toThrow(
        NotFoundException,
      );

      // Crítico: el WHERE include customerId — NO leak data de otros
      expect(prisma.customerAddress.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'foreign-addr',
          customerId: 'customer-uuid-1',
          active: true,
        },
      });
    });

    it('T9.4 — NotFoundException si la dirección está soft-deleted', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-uuid', 'addr-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
      // El filtro active=true excluye soft-deleted.
      expect(prisma.customerAddress.findFirst.mock.calls[0][0].where.active).toBe(
        true,
      );
    });

    it('T9.5 — retorna la dirección si es propia y activa', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findFirst.mockResolvedValue(makeAddress());

      const out = await service.findOne('user-uuid', 'addr-uuid-1');
      expect(out.id).toBe('addr-uuid-1');
    });
  });

  describe('create', () => {
    const baseDto = {
      recipientName: 'Juan Pérez',
      recipientPhone: '+51 987 654 321',
      street: 'Av. Javier Prado Este',
      number: '1234',
      district: 'San Isidro',
      province: 'Lima',
      region: 'Lima',
    };

    it('T9.6 — alcanzar el máximo (10) lanza ConflictException', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.count.mockResolvedValueOnce(10);

      await expect(service.create('user-uuid', baseDto as any)).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.customerAddress.create).not.toHaveBeenCalled();
    });

    it('T9.7 — primera dirección del tipo se marca isDefault=true automáticamente', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.count
        .mockResolvedValueOnce(0) // active total
        .mockResolvedValueOnce(0); // sameTypeCount
      prisma.customerAddress.create.mockResolvedValue(
        makeAddress({ isDefault: true }),
      );

      await service.create('user-uuid', baseDto as any);

      // El demote-previous siempre se ejecuta cuando willBeDefault=true como
      // defensa atómica (idempotente: matchea 0 rows si no hay previous).
      // Create con isDefault=true forzado
      const createArgs = prisma.customerAddress.create.mock.calls[0][0];
      expect(createArgs.data.isDefault).toBe(true);
      expect(createArgs.data.customerId).toBe('customer-uuid-1');
      expect(createArgs.data.type).toBe(AddressType.SHIPPING);
      expect(createArgs.data.countryCode).toBe('PE');
    });

    it('T9.8 — isDefault=true en DTO + ya existe otra default → demote previa y crea nueva', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.count
        .mockResolvedValueOnce(3) // active total
        .mockResolvedValueOnce(2); // sameTypeCount (ya hay otras)
      prisma.customerAddress.create.mockResolvedValue(
        makeAddress({ id: 'new-default', isDefault: true }),
      );

      await service.create('user-uuid', {
        ...baseDto,
        type: AddressType.SHIPPING,
        isDefault: true,
      } as any);

      // Demote previous default del mismo tipo
      expect(prisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: {
          customerId: 'customer-uuid-1',
          type: AddressType.SHIPPING,
          active: true,
          isDefault: true,
        },
        data: { isDefault: false },
      });
      // Create con isDefault=true
      expect(prisma.customerAddress.create.mock.calls[0][0].data.isDefault).toBe(
        true,
      );
    });

    it('T9.7b — countryCode se normaliza a uppercase', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.count.mockResolvedValue(0);
      prisma.customerAddress.create.mockResolvedValue(makeAddress());

      await service.create('user-uuid', {
        ...baseDto,
        countryCode: 'pe',
      } as any);

      expect(prisma.customerAddress.create.mock.calls[0][0].data.countryCode).toBe(
        'PE',
      );
    });

    it('T9.7c — PICKUP es un tipo válido aunque sin UI todavía', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.count.mockResolvedValue(0);
      prisma.customerAddress.create.mockResolvedValue(
        makeAddress({ type: AddressType.PICKUP, isDefault: true }),
      );

      const out = await service.create('user-uuid', {
        ...baseDto,
        type: AddressType.PICKUP,
      } as any);

      expect(prisma.customerAddress.create.mock.calls[0][0].data.type).toBe(
        AddressType.PICKUP,
      );
      expect(out.type).toBe(AddressType.PICKUP);
    });
  });

  describe('update', () => {
    it('T9.9 — 404 si la dirección no es propia', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-uuid', 'foreign-addr', { label: 'X' } as any),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.customerAddress.update).not.toHaveBeenCalled();
    });

    it('T9.10 — becomingDefault demote previous antes de update', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findFirst.mockResolvedValue(
        makeAddress({ id: 'addr-2', isDefault: false, type: AddressType.SHIPPING }),
      );
      prisma.customerAddress.update.mockResolvedValue(
        makeAddress({ id: 'addr-2', isDefault: true }),
      );

      await service.update('user-uuid', 'addr-2', { isDefault: true } as any);

      // Demote excluye addr-2 (la nueva default)
      expect(prisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: {
          customerId: 'customer-uuid-1',
          type: AddressType.SHIPPING,
          active: true,
          isDefault: true,
          NOT: { id: 'addr-2' },
        },
        data: { isDefault: false },
      });
      expect(prisma.customerAddress.update.mock.calls[0][0].data.isDefault).toBe(
        true,
      );
    });
  });

  describe('remove (soft delete) + promote next default', () => {
    it('T9.11 — borrar default activa: soft delete + promoteNextDefault', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findFirst
        // requireOwnedActive
        .mockResolvedValueOnce(
          makeAddress({ id: 'addr-default', isDefault: true }),
        )
        // promoteNextDefault picks the next active
        .mockResolvedValueOnce({ id: 'addr-next' });

      await service.remove('user-uuid', 'addr-default');

      // Soft delete: active=false + isDefault=false
      expect(prisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-default' },
        data: { active: false, isDefault: false },
      });
      // Promote next
      expect(prisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-next' },
        data: { isDefault: true },
      });
    });

    it('T9.11b — borrar dirección NO default no promueve a nadie', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findFirst.mockResolvedValue(
        makeAddress({ id: 'addr-x', isDefault: false }),
      );

      await service.remove('user-uuid', 'addr-x');

      expect(prisma.customerAddress.update).toHaveBeenCalledTimes(1);
      expect(prisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-x' },
        data: { active: false, isDefault: false },
      });
    });
  });

  describe('setDefault', () => {
    it('T9.12 — no-op si ya es default', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findFirst.mockResolvedValue(
        makeAddress({ isDefault: true }),
      );

      await service.setDefault('user-uuid', 'addr-uuid-1');

      expect(prisma.customerAddress.updateMany).not.toHaveBeenCalled();
      expect(prisma.customerAddress.update).not.toHaveBeenCalled();
    });

    it('T9.13 — demote previous + promote target en la misma transacción', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-uuid-1' });
      prisma.customerAddress.findFirst.mockResolvedValue(
        makeAddress({ id: 'addr-target', isDefault: false }),
      );
      prisma.customerAddress.update.mockResolvedValue(
        makeAddress({ id: 'addr-target', isDefault: true }),
      );

      await service.setDefault('user-uuid', 'addr-target');

      expect(prisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: {
          customerId: 'customer-uuid-1',
          type: AddressType.SHIPPING,
          active: true,
          isDefault: true,
          NOT: { id: 'addr-target' },
        },
        data: { isDefault: false },
      });
      expect(prisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-target' },
        data: { isDefault: true },
      });
      // Ambos ocurren dentro de un único $transaction
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('cross-user isolation', () => {
    it('T9.14 — User A NUNCA recibe customerId de User B en cualquier WHERE', async () => {
      // User A
      prisma.customer.findFirst.mockResolvedValueOnce({
        id: 'customer-A-uuid',
      });
      prisma.customerAddress.findMany.mockResolvedValueOnce([]);
      await service.list('user-A-uuid');

      // User B
      prisma.customer.findFirst.mockResolvedValueOnce({
        id: 'customer-B-uuid',
      });
      prisma.customerAddress.findMany.mockResolvedValueOnce([]);
      await service.list('user-B-uuid');

      const userACall = prisma.customerAddress.findMany.mock.calls[0][0];
      const userBCall = prisma.customerAddress.findMany.mock.calls[1][0];

      // Aislamiento absoluto: ningún rastro del otro user en sus queries
      const aJson = JSON.stringify(userACall);
      const bJson = JSON.stringify(userBCall);
      expect(aJson).not.toContain('customer-B-uuid');
      expect(aJson).not.toContain('user-B-uuid');
      expect(bJson).not.toContain('customer-A-uuid');
      expect(bJson).not.toContain('user-A-uuid');

      expect(userACall.where).toEqual({
        customerId: 'customer-A-uuid',
        active: true,
      });
      expect(userBCall.where).toEqual({
        customerId: 'customer-B-uuid',
        active: true,
      });
    });
  });
});
