import { Injectable } from '@nestjs/common';
import { Branch, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface BranchWithCount extends Branch {
  _count: { inventory: number };
}

export interface FindBranchesOptions {
  where: Prisma.BranchWhereInput;
  page: number;
  limit: number;
}

export interface FindBranchesResult {
  items: BranchWithCount[];
  total: number;
}

@Injectable()
export class BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BranchCreateInput): Promise<Branch> {
    return this.prisma.branch.create({ data });
  }

  findById(id: string): Promise<BranchWithCount | null> {
    return this.prisma.branch.findUnique({
      where: { id },
      include: { _count: { select: { inventory: true } } },
    });
  }

  findBySlug(slug: string): Promise<Branch | null> {
    return this.prisma.branch.findUnique({ where: { slug } });
  }

  slugExists(slug: string, excludeId?: string): Promise<boolean> {
    return this.prisma.branch
      .findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      })
      .then((row) => !!row);
  }

  async findMany(options: FindBranchesOptions): Promise<FindBranchesResult> {
    const { where, page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { inventory: true } } },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return { items, total };
  }

  update(id: string, data: Prisma.BranchUpdateInput): Promise<Branch> {
    return this.prisma.branch.update({ where: { id }, data });
  }

  delete(id: string): Promise<Branch> {
    return this.prisma.branch.delete({ where: { id } });
  }
}
