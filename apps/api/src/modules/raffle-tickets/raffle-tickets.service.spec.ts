import { Test, TestingModule } from '@nestjs/testing';
import { EntryType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RaffleTicketsService } from './raffle-tickets.service';

/**
 * F2.7-A — Tests del helper centralizado de asignación de tickets.
 * Cubre el CAS atómico, la ausencia de sorteo activo y el cap por capacidad.
 */

type CreateManyArgs = {
  data: Array<{
    userId: string;
    raffleId: string;
    ticketNumber: number;
    type: EntryType;
    orderId: string | null;
  }>;
};

type UpdateManyArgs = {
  where: Record<string, unknown>;
  data: { soldTickets: { increment: number } };
};

type PrismaMock = {
  raffle: {
    findFirst: jest.Mock;
    updateMany: jest.Mock;
  };
  raffleEntry: {
    createMany: jest.Mock;
  };
};

function createPrismaMock(): PrismaMock {
  return {
    raffle: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    raffleEntry: {
      createMany: jest.fn(),
    },
  };
}

describe('RaffleTicketsService — F2.7-A helper centralizado', () => {
  let service: RaffleTicketsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RaffleTicketsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<RaffleTicketsService>(RaffleTicketsService);
  });

  it('quantity <= 0 → retorna 0 sin tocar la DB', async () => {
    const granted = await service.grantToUser({
      userId: 'user-1',
      quantity: 0,
      reference: 'ORD-001',
    });
    expect(granted).toBe(0);
    expect(prisma.raffle.findFirst).not.toHaveBeenCalled();
  });

  it('sin sorteo activo → retorna 0 sin crear entradas', async () => {
    prisma.raffle.findFirst.mockResolvedValueOnce(null);
    const granted = await service.grantToUser({
      userId: 'user-1',
      quantity: 3,
      reference: 'ORD-001',
    });
    expect(granted).toBe(0);
    expect(prisma.raffleEntry.createMany).not.toHaveBeenCalled();
  });

  it('happy path → reserva CAS, crea N entradas con ticketNumber correlativo', async () => {
    prisma.raffle.findFirst.mockResolvedValueOnce({
      id: 'raffle-1',
      soldTickets: 10,
      totalTickets: 100,
    });
    prisma.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.raffleEntry.createMany.mockResolvedValueOnce({ count: 3 });

    const granted = await service.grantToUser({
      userId: 'user-1',
      quantity: 3,
      reference: 'ORD-001',
      orderId: 'order-1',
    });

    expect(granted).toBe(3);
    expect(prisma.raffle.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'raffle-1',
        status: 'PUBLISHED',
        soldTickets: 10,
        totalTickets: { gte: 13 },
      },
      data: { soldTickets: { increment: 3 } },
    });

    // ticketNumber 11, 12, 13 (soldTickets+1..+3) y type default PURCHASE_REWARD
    const createCalls = prisma.raffleEntry.createMany.mock.calls as Array<
      [CreateManyArgs]
    >;
    const createCall = createCalls[0][0];
    expect(createCall.data).toHaveLength(3);
    expect(createCall.data[0].ticketNumber).toBe(11);
    expect(createCall.data[2].ticketNumber).toBe(13);
    expect(createCall.data[0].type).toBe(EntryType.PURCHASE_REWARD);
    expect(createCall.data[0].orderId).toBe('order-1');
  });

  it('CAS pierde la carrera → retorna 0 sin crear entradas', async () => {
    prisma.raffle.findFirst.mockResolvedValueOnce({
      id: 'raffle-1',
      soldTickets: 10,
      totalTickets: 100,
    });
    prisma.raffle.updateMany.mockResolvedValueOnce({ count: 0 });

    const granted = await service.grantToUser({
      userId: 'user-1',
      quantity: 2,
      reference: 'ORD-001',
    });

    expect(granted).toBe(0);
    expect(prisma.raffleEntry.createMany).not.toHaveBeenCalled();
  });

  it('quantity > asientos disponibles → otorga solo lo que queda', async () => {
    prisma.raffle.findFirst.mockResolvedValueOnce({
      id: 'raffle-1',
      soldTickets: 98,
      totalTickets: 100,
    });
    prisma.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.raffleEntry.createMany.mockResolvedValueOnce({ count: 2 });

    const granted = await service.grantToUser({
      userId: 'user-1',
      quantity: 5,
      reference: 'ORD-001',
    });

    expect(granted).toBe(2);
    const updateCalls = prisma.raffle.updateMany.mock.calls as Array<
      [UpdateManyArgs]
    >;
    const updateCall = updateCalls[0][0];
    expect(updateCall.data).toEqual({ soldTickets: { increment: 2 } });
  });

  it('entryType BONUS se respeta (caso referral)', async () => {
    prisma.raffle.findFirst.mockResolvedValueOnce({
      id: 'raffle-1',
      soldTickets: 5,
      totalTickets: 50,
    });
    prisma.raffle.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.raffleEntry.createMany.mockResolvedValueOnce({ count: 1 });

    await service.grantToUser({
      userId: 'user-referrer',
      quantity: 1,
      entryType: EntryType.BONUS,
      reference: 'referido ORD-X',
    });

    const createCalls = prisma.raffleEntry.createMany.mock.calls as Array<
      [CreateManyArgs]
    >;
    const createCall = createCalls[0][0];
    expect(createCall.data[0].type).toBe(EntryType.BONUS);
  });
});
