import { Injectable } from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const categoryInclude = Prisma.validator<Prisma.CategoryInclude>()({
  parent: { select: { id: true, name: true, slug: true } },
  _count: { select: { products: true, children: true } },
});

export type CategoryWithRelations = Prisma.CategoryGetPayload<{
  include: typeof categoryInclude;
}>;

export interface FindCategoriesOptions {
  where: Prisma.CategoryWhereInput;
  page: number;
  limit: number;
}

export interface FindCategoriesResult {
  items: CategoryWithRelations[];
  total: number;
}

@Injectable()
export class CategoriesRepository {
  public readonly include = categoryInclude;

  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  findById(id: string): Promise<CategoryWithRelations | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: categoryInclude,
    });
  }

  findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  async findMany(options: FindCategoriesOptions): Promise<FindCategoriesResult> {
    const { where, page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ group: 'asc' }, { order: 'asc' }, { name: 'asc' }],
        include: categoryInclude,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items, total };
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }

  slugExists(slug: string, excludeId?: string): Promise<boolean> {
    return this.prisma.category
      .findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      })
      .then((row) => !!row);
  }
}
