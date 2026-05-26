import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  customer: {
    select: {
      id: true,
      fullName: true,
      dni: true,
      ruc: true,
      documentType: true,
      legalName: true,
      fiscalAddress: true,
      email: true,
    },
  },
  location: { select: { id: true, name: true, type: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
    },
  },
});

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export interface FindOrdersOptions {
  where: Prisma.OrderWhereInput;
  page: number;
  limit: number;
}

export interface FindOrdersResult {
  items: OrderWithRelations[];
  total: number;
}

@Injectable()
export class OrdersRepository {
  public readonly include = orderInclude;

  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<OrderWithRelations | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  }

  findByNumber(number: string): Promise<OrderWithRelations | null> {
    return this.prisma.order.findUnique({
      where: { number },
      include: orderInclude,
    });
  }

  async findMany(options: FindOrdersOptions): Promise<FindOrdersResult> {
    const { where, page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: orderInclude,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total };
  }

  numberExists(number: string): Promise<boolean> {
    return this.prisma.order
      .findUnique({ where: { number }, select: { id: true } })
      .then((row) => !!row);
  }
}
