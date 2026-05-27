import { Injectable } from '@nestjs/common';
import { HomeStore, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class HomeStoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<HomeStore[]> {
    return this.prisma.homeStore.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findActive(): Promise<HomeStore[]> {
    return this.prisma.homeStore.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string): Promise<HomeStore | null> {
    return this.prisma.homeStore.findUnique({ where: { id } });
  }

  create(data: Prisma.HomeStoreCreateInput): Promise<HomeStore> {
    return this.prisma.homeStore.create({ data });
  }

  update(
    id: string,
    data: Prisma.HomeStoreUpdateInput,
  ): Promise<HomeStore> {
    return this.prisma.homeStore.update({ where: { id }, data });
  }

  delete(id: string): Promise<HomeStore> {
    return this.prisma.homeStore.delete({ where: { id } });
  }
}
