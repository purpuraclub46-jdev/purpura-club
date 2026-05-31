import { Test, TestingModule } from '@nestjs/testing';
import {
  EntryStatus,
  PaymentMethod,
  Prisma,
  RaffleStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RafflePricingService } from '../raffles/raffle-pricing.service';
import { RaffleEntriesService } from './raffle-entries.service';
import { PaymentProviderRegistry } from './payments/payment-provider.registry';
import { RaffleEntriesRepository } from './repositories/raffle-entries.repository';

/**
 * F2.7-B — Tests de RaffleEntriesService.purchase (T12.6–T12.9, T12.15).
 *
 * Foco: que TODO precio venga de RafflePricingService (cierra G9). El
 * cliente no puede influir en el precio (anti-tamper); el método de pago
 * recibe siempre el precio resuelto server-side.
 */

type PrismaTxClient = {
  raffle: {
    updateMany: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    update: jest.Mock;
  };
  raffleEntry: {
    create: jest.Mock;
  };
};

type PrismaMock = {
  raffle: {
    findUnique: jest.Mock;
  };
  $transaction: jest.Mock;
};

function createPrismaMock(): {
  prisma: PrismaMock;
  tx: PrismaTxClient;
} {
  const tx: PrismaTxClient = {
    raffle: {
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    raffleEntry: {
      create: jest.fn(),
    },
  };
  const prisma: PrismaMock = {
    raffle: { findUnique: jest.fn() },
    $transaction: jest.fn(
      async (callback: (txClient: PrismaTxClient) => Promise<unknown>) =>
        callback(tx),
    ),
  };
  return { prisma, tx };
}

function makeAuthUser(id = 'user-1') {
  return {
    id,
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: Role.USER,
    active: true,
    inventoryLocationId: null,
    roleSlugs: [],
    permissions: [],
  };
}

function makeRaffle(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'raffle-1',
    title: 'Sorteo iPhone',
    slug: 'sorteo-iphone',
    description: '...',
    bannerImage: null,
    prizeImage: null,
    countdown: null,
    ticketPrice: new Prisma.Decimal('10.00'),
    memberTicketPrice: new Prisma.Decimal('5.00'),
    totalTickets: 100,
    soldTickets: 0,
    status: RaffleStatus.PUBLISHED,
    visibility: 'PUBLIC',
    winnerUserId: null,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('RaffleEntriesService.purchase — F2.7-B precio socio (cierra G9)', () => {
  let service: RaffleEntriesService;
  let prisma: PrismaMock;
  let tx: PrismaTxClient;
  let rafflePricing: { resolveForUser: jest.Mock };
  let paymentProviderRegistry: { resolve: jest.Mock };
  let providerInitiate: jest.Mock;
  let entriesRepo: { findById: jest.Mock };

  beforeEach(async () => {
    const created = createPrismaMock();
    prisma = created.prisma;
    tx = created.tx;
    rafflePricing = { resolveForUser: jest.fn() };
    providerInitiate = jest.fn();
    paymentProviderRegistry = {
      resolve: jest.fn().mockReturnValue({
        method: PaymentMethod.YAPE,
        enabled: true,
        initiate: providerInitiate,
      }),
    };
    entriesRepo = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RaffleEntriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: RaffleEntriesRepository, useValue: entriesRepo },
        {
          provide: PaymentProviderRegistry,
          useValue: paymentProviderRegistry,
        },
        { provide: RafflePricingService, useValue: rafflePricing },
      ],
    }).compile();

    service = module.get<RaffleEntriesService>(RaffleEntriesService);
  });

  it('T12.6 — Socio activo (S/5) compra 1 ticket → unitPrice=5, totalAmount=5', async () => {
    prisma.raffle.findUnique.mockResolvedValueOnce(makeRaffle());
    rafflePricing.resolveForUser.mockResolvedValueOnce({
      publicPrice: 10,
      memberPrice: 5,
      applicablePrice: 5,
      savingPercentage: 50,
      savingAmount: 5,
      isMember: true,
      source: 'MEMBER',
    });
    providerInitiate.mockResolvedValueOnce({
      status: EntryStatus.PENDING_PAYMENT,
      reference: 'YAPE-123',
    });
    tx.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.raffle.findUniqueOrThrow.mockResolvedValueOnce(
      makeRaffle({ soldTickets: 1 }),
    );
    tx.raffleEntry.create.mockResolvedValueOnce({
      id: 'entry-1',
      userId: 'user-1',
      raffleId: 'raffle-1',
      ticketNumber: 1,
      type: 'DIRECT_PURCHASE',
      status: EntryStatus.PENDING_PAYMENT,
      paymentMethod: PaymentMethod.YAPE,
      paymentReference: 'YAPE-123',
      createdAt: new Date(),
      raffle: null,
      user: null,
    });

    const result = await service.purchase(makeAuthUser(), {
      raffleId: 'raffle-1',
      quantity: 1,
      paymentMethod: PaymentMethod.YAPE,
    });

    expect(rafflePricing.resolveForUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'raffle-1' }),
      'user-1',
    );
    expect(providerInitiate).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 5, totalAmount: 5 }),
    );
    expect(result.totalAmount).toBe(5);
  });

  it('T12.7 — NO socio compra 1 ticket → unitPrice=10, totalAmount=10', async () => {
    prisma.raffle.findUnique.mockResolvedValueOnce(makeRaffle());
    rafflePricing.resolveForUser.mockResolvedValueOnce({
      publicPrice: 10,
      memberPrice: 5,
      applicablePrice: 10,
      savingPercentage: 50,
      savingAmount: 5,
      isMember: false,
      source: 'PUBLIC',
    });
    providerInitiate.mockResolvedValueOnce({
      status: EntryStatus.PENDING_PAYMENT,
      reference: 'YAPE-X',
    });
    tx.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.raffle.findUniqueOrThrow.mockResolvedValueOnce(
      makeRaffle({ soldTickets: 1 }),
    );
    tx.raffleEntry.create.mockResolvedValueOnce({
      id: 'entry-x',
      userId: 'user-no-member',
      raffleId: 'raffle-1',
      ticketNumber: 1,
      type: 'DIRECT_PURCHASE',
      status: EntryStatus.PENDING_PAYMENT,
      paymentMethod: PaymentMethod.YAPE,
      paymentReference: 'YAPE-X',
      createdAt: new Date(),
      raffle: null,
      user: null,
    });

    const result = await service.purchase(makeAuthUser('user-no-member'), {
      raffleId: 'raffle-1',
      quantity: 1,
      paymentMethod: PaymentMethod.YAPE,
    });

    expect(providerInitiate).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 10, totalAmount: 10 }),
    );
    expect(result.totalAmount).toBe(10);
  });

  it('T12.8 — Compra múltiple (qty=5) socio → totalAmount=25', async () => {
    prisma.raffle.findUnique.mockResolvedValueOnce(makeRaffle());
    rafflePricing.resolveForUser.mockResolvedValueOnce({
      publicPrice: 10,
      memberPrice: 5,
      applicablePrice: 5,
      savingPercentage: 50,
      savingAmount: 5,
      isMember: true,
      source: 'MEMBER',
    });
    providerInitiate.mockResolvedValueOnce({
      status: EntryStatus.PAID,
      reference: 'auto',
    });
    tx.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.raffle.findUniqueOrThrow.mockResolvedValueOnce(
      makeRaffle({ soldTickets: 5 }),
    );
    tx.raffleEntry.create.mockResolvedValue({
      id: 'entry-x',
      userId: 'user-1',
      raffleId: 'raffle-1',
      ticketNumber: 1,
      type: 'DIRECT_PURCHASE',
      status: EntryStatus.PAID,
      paymentMethod: PaymentMethod.YAPE,
      paymentReference: 'auto',
      createdAt: new Date(),
      raffle: null,
      user: null,
    });

    const result = await service.purchase(makeAuthUser(), {
      raffleId: 'raffle-1',
      quantity: 5,
      paymentMethod: PaymentMethod.YAPE,
    });

    expect(providerInitiate).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 5, totalAmount: 25, quantity: 5 }),
    );
    expect(result.totalAmount).toBe(25);
  });

  it('T12.9 — Anti-tamper: el cliente NO puede forzar unitPrice (RaffleEntries usa server-side)', async () => {
    // El DTO PurchaseEntryDto NO incluye `unitPrice` — verificamos que el
    // único origen es el RafflePricingService y que el provider recibe el
    // valor server-side aunque la rifa tenga un memberTicketPrice legacy
    // distinto en DB.
    prisma.raffle.findUnique.mockResolvedValueOnce(
      makeRaffle({
        ticketPrice: new Prisma.Decimal('10.00'),
        memberTicketPrice: new Prisma.Decimal('2.00'), // legacy "trampa"
      }),
    );
    rafflePricing.resolveForUser.mockResolvedValueOnce({
      publicPrice: 10,
      memberPrice: 5, // ignora el 2.00 legacy
      applicablePrice: 5,
      savingPercentage: 50,
      savingAmount: 5,
      isMember: true,
      source: 'MEMBER',
    });
    providerInitiate.mockResolvedValueOnce({
      status: EntryStatus.PAID,
      reference: 'auto',
    });
    tx.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.raffle.findUniqueOrThrow.mockResolvedValueOnce(
      makeRaffle({ soldTickets: 1 }),
    );
    tx.raffleEntry.create.mockResolvedValueOnce({
      id: 'entry-1',
      userId: 'user-1',
      raffleId: 'raffle-1',
      ticketNumber: 1,
      type: 'DIRECT_PURCHASE',
      status: EntryStatus.PAID,
      paymentMethod: PaymentMethod.YAPE,
      paymentReference: 'auto',
      createdAt: new Date(),
      raffle: null,
      user: null,
    });

    await service.purchase(makeAuthUser(), {
      raffleId: 'raffle-1',
      quantity: 1,
      paymentMethod: PaymentMethod.YAPE,
    });

    expect(providerInitiate).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 5, totalAmount: 5 }),
    );
  });

  it('Cross-user isolation — userIds distintos resuelven precios distintos', async () => {
    prisma.raffle.findUnique.mockResolvedValue(makeRaffle());
    rafflePricing.resolveForUser
      .mockResolvedValueOnce({
        publicPrice: 10,
        memberPrice: 5,
        applicablePrice: 5,
        savingPercentage: 50,
        savingAmount: 5,
        isMember: true,
        source: 'MEMBER',
      })
      .mockResolvedValueOnce({
        publicPrice: 10,
        memberPrice: 5,
        applicablePrice: 10,
        savingPercentage: 50,
        savingAmount: 5,
        isMember: false,
        source: 'PUBLIC',
      });
    providerInitiate.mockResolvedValue({
      status: EntryStatus.PAID,
      reference: 'auto',
    });
    tx.raffle.updateMany.mockResolvedValue({ count: 1 });
    tx.raffle.findUniqueOrThrow.mockResolvedValue(
      makeRaffle({ soldTickets: 1 }),
    );
    tx.raffleEntry.create.mockResolvedValue({
      id: 'entry-x',
      userId: 'user-1',
      raffleId: 'raffle-1',
      ticketNumber: 1,
      type: 'DIRECT_PURCHASE',
      status: EntryStatus.PAID,
      paymentMethod: PaymentMethod.YAPE,
      paymentReference: 'auto',
      createdAt: new Date(),
      raffle: null,
      user: null,
    });

    await service.purchase(makeAuthUser('user-A'), {
      raffleId: 'raffle-1',
      quantity: 1,
      paymentMethod: PaymentMethod.YAPE,
    });
    await service.purchase(makeAuthUser('user-B'), {
      raffleId: 'raffle-1',
      quantity: 1,
      paymentMethod: PaymentMethod.YAPE,
    });

    type InitiateArgs = [{ unitPrice: number; totalAmount: number }];
    const calls = providerInitiate.mock.calls as InitiateArgs[];
    expect(calls[0][0].unitPrice).toBe(5);
    expect(calls[1][0].unitPrice).toBe(10);
  });
});
