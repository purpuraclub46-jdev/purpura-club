import { Injectable } from '@nestjs/common';
import { HomeBanner, HomeBannerSlot, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class HomeBannersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<HomeBanner[]> {
    return this.prisma.homeBanner.findMany({
      orderBy: { order: 'asc' },
    });
  }

  findActive(): Promise<HomeBanner[]> {
    return this.prisma.homeBanner.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
  }

  findBySlot(slot: HomeBannerSlot): Promise<HomeBanner | null> {
    return this.prisma.homeBanner.findUnique({ where: { slot } });
  }

  upsertBySlot(
    slot: HomeBannerSlot,
    data: Prisma.HomeBannerUpdateInput,
    createData: Prisma.HomeBannerCreateInput,
  ): Promise<HomeBanner> {
    return this.prisma.homeBanner.upsert({
      where: { slot },
      create: createData,
      update: data,
    });
  }
}
