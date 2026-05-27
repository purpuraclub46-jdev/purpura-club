import { Injectable } from '@nestjs/common';
import { HomeCategory, HomeCategorySlot, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class HomeCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<HomeCategory[]> {
    return this.prisma.homeCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  findActive(): Promise<HomeCategory[]> {
    return this.prisma.homeCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findBySlot(slot: HomeCategorySlot): Promise<HomeCategory | null> {
    return this.prisma.homeCategory.findUnique({ where: { slot } });
  }

  upsertBySlot(
    slot: HomeCategorySlot,
    update: Prisma.HomeCategoryUpdateInput,
    create: Prisma.HomeCategoryCreateInput,
  ): Promise<HomeCategory> {
    return this.prisma.homeCategory.upsert({
      where: { slot },
      create,
      update,
    });
  }
}
