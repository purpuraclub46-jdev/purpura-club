import { Injectable } from '@nestjs/common';
import { Prisma, RaffleEntry } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export const ENTRY_DETAIL_INCLUDE = {
  raffle: {
    select: {
      id: true,
      title: true,
      slug: true,
      startDate: true,
      endDate: true,
    },
  },
  user: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const satisfies Prisma.RaffleEntryInclude;

export type EntryWithDetails = Prisma.RaffleEntryGetPayload<{
  include: typeof ENTRY_DETAIL_INCLUDE;
}>;

export interface FindEntriesOptions {
  where: Prisma.RaffleEntryWhereInput;
  page: number;
  limit: number;
}

@Injectable()
export class RaffleEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<EntryWithDetails | null> {
    return this.prisma.raffleEntry.findUnique({
      where: { id },
      include: ENTRY_DETAIL_INCLUDE,
    });
  }

  findByTicketNumber(
    raffleId: string,
    ticketNumber: number,
  ): Promise<EntryWithDetails | null> {
    return this.prisma.raffleEntry.findUnique({
      where: { raffleId_ticketNumber: { raffleId, ticketNumber } },
      include: ENTRY_DETAIL_INCLUDE,
    });
  }

  async findMany(
    options: FindEntriesOptions,
  ): Promise<{ items: EntryWithDetails[]; total: number }> {
    const { where, page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.raffleEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ENTRY_DETAIL_INCLUDE,
      }),
      this.prisma.raffleEntry.count({ where }),
    ]);

    return { items, total };
  }

  countByUserAndRaffle(userId: string, raffleId: string): Promise<number> {
    return this.prisma.raffleEntry.count({
      where: {
        userId,
        raffleId,
        status: { in: ['PENDING_PAYMENT', 'PAID', 'WINNER'] },
      },
    });
  }

  async findRandomPaid(raffleId: string): Promise<RaffleEntry | null> {
    const total = await this.prisma.raffleEntry.count({
      where: { raffleId, status: 'PAID' },
    });

    if (total === 0) return null;

    const skip = Math.floor(Math.random() * total);
    const [entry] = await this.prisma.raffleEntry.findMany({
      where: { raffleId, status: 'PAID' },
      skip,
      take: 1,
      orderBy: { ticketNumber: 'asc' },
    });

    return entry ?? null;
  }

  updateStatus(
    id: string,
    data: Prisma.RaffleEntryUpdateInput,
  ): Promise<RaffleEntry> {
    return this.prisma.raffleEntry.update({ where: { id }, data });
  }
}
