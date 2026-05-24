import { Injectable } from '@nestjs/common';
import { Prisma, Raffle } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface FindRafflesOptions {
  where: Prisma.RaffleWhereInput;
  page: number;
  limit: number;
}

export interface FindRafflesResult {
  items: Raffle[];
  total: number;
}

@Injectable()
export class RafflesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RaffleCreateInput): Promise<Raffle> {
    return this.prisma.raffle.create({ data });
  }

  findById(id: string): Promise<Raffle | null> {
    return this.prisma.raffle.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Raffle | null> {
    return this.prisma.raffle.findUnique({ where: { slug } });
  }

  async findMany(options: FindRafflesOptions): Promise<FindRafflesResult> {
    const { where, page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.raffle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.raffle.count({ where }),
    ]);

    return { items, total };
  }

  update(id: string, data: Prisma.RaffleUpdateInput): Promise<Raffle> {
    return this.prisma.raffle.update({ where: { id }, data });
  }

  delete(id: string): Promise<Raffle> {
    return this.prisma.raffle.delete({ where: { id } });
  }

  slugExists(slug: string, excludeId?: string): Promise<boolean> {
    return this.prisma.raffle
      .findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      })
      .then((raffle) => !!raffle);
  }
}
