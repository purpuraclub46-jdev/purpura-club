import { Injectable } from '@nestjs/common';
import { InventoryLocation, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface LocationWithCount extends InventoryLocation {
  _count: { stock: number };
}

export interface FindLocationsOptions {
  where: Prisma.InventoryLocationWhereInput;
  page: number;
  limit: number;
}

export interface FindLocationsResult {
  items: LocationWithCount[];
  total: number;
}

@Injectable()
export class InventoryLocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.InventoryLocationCreateInput,
  ): Promise<InventoryLocation> {
    return this.prisma.inventoryLocation.create({ data });
  }

  findById(id: string): Promise<LocationWithCount | null> {
    return this.prisma.inventoryLocation.findUnique({
      where: { id },
      include: { _count: { select: { stock: true } } },
    });
  }

  findBySlug(slug: string): Promise<InventoryLocation | null> {
    return this.prisma.inventoryLocation.findUnique({ where: { slug } });
  }

  slugExists(slug: string, excludeId?: string): Promise<boolean> {
    return this.prisma.inventoryLocation
      .findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      })
      .then((row) => !!row);
  }

  async findMany(options: FindLocationsOptions): Promise<FindLocationsResult> {
    const { where, page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryLocation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { stock: true } } },
      }),
      this.prisma.inventoryLocation.count({ where }),
    ]);

    return { items, total };
  }

  update(
    id: string,
    data: Prisma.InventoryLocationUpdateInput,
  ): Promise<InventoryLocation> {
    return this.prisma.inventoryLocation.update({ where: { id }, data });
  }

  delete(id: string): Promise<InventoryLocation> {
    return this.prisma.inventoryLocation.delete({ where: { id } });
  }
}
