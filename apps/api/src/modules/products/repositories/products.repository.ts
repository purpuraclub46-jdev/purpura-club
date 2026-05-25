import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const productInclude = Prisma.validator<Prisma.ProductInclude>()({
  images: { orderBy: { order: 'asc' } },
  variants: { orderBy: { name: 'asc' } },
  categories: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
  availability: {
    include: {
      location: {
        select: { id: true, name: true, slug: true, type: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  stock: {
    select: {
      stock: true,
      reservedStock: true,
      minimumStock: true,
      inventoryLocationId: true,
    },
  },
});

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

export interface FindProductsOptions {
  where: Prisma.ProductWhereInput;
  orderBy: Prisma.ProductOrderByWithRelationInput;
  page: number;
  limit: number;
}

export interface FindProductsResult {
  items: ProductWithRelations[];
  total: number;
}

@Injectable()
export class ProductsRepository {
  public readonly include = productInclude;

  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
  }

  findBySlug(slug: string): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });
  }

  findBySku(sku: string): Promise<{ id: string } | null> {
    return this.prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
  }

  findByBarcode(barcode: string): Promise<{ id: string } | null> {
    return this.prisma.product.findUnique({
      where: { barcode },
      select: { id: true },
    });
  }

  slugExists(slug: string, excludeId?: string): Promise<boolean> {
    return this.prisma.product
      .findFirst({
        where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
        select: { id: true },
      })
      .then((row) => !!row);
  }

  async findMany(options: FindProductsOptions): Promise<FindProductsResult> {
    const { where, orderBy, page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: productInclude,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async createWithRelations(args: {
    data: Prisma.ProductCreateInput;
    categoryIds: string[];
    images: { url: string; order: number }[];
    variants: { name: string; value: string }[];
    availability: Array<{
      inventoryLocationId: string;
      active: boolean;
      initialStock: number;
      minimumStock: number;
    }>;
    createdByUserId?: string;
  }): Promise<ProductWithRelations> {
    const { data, categoryIds, images, variants, availability, createdByUserId } =
      args;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data });

      if (categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            productId: created.id,
            categoryId,
          })),
          skipDuplicates: true,
        });
      }

      if (images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((img) => ({
            productId: created.id,
            url: img.url,
            order: img.order,
          })),
        });
      }

      if (variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((v) => ({
            productId: created.id,
            name: v.name,
            value: v.value,
          })),
          skipDuplicates: true,
        });
      }

      for (const avail of availability) {
        await tx.productAvailability.create({
          data: {
            productId: created.id,
            inventoryLocationId: avail.inventoryLocationId,
            active: avail.active,
          },
        });

        await tx.inventoryStock.create({
          data: {
            productId: created.id,
            inventoryLocationId: avail.inventoryLocationId,
            stock: avail.initialStock,
            minimumStock: avail.minimumStock,
            reservedStock: 0,
          },
        });

        if (avail.initialStock > 0) {
          await tx.inventoryMovement.create({
            data: {
              productId: created.id,
              inventoryLocationId: avail.inventoryLocationId,
              quantity: avail.initialStock,
              type: 'RESTOCK',
              reason: 'Stock inicial al crear producto',
              createdByUserId: createdByUserId ?? null,
            },
          });
        }
      }

      const fresh = await tx.product.findUnique({
        where: { id: created.id },
        include: productInclude,
      });

      if (!fresh) {
        throw new Error('Failed to load created product');
      }

      return fresh;
    });
  }

  async updateWithRelations(args: {
    id: string;
    data: Prisma.ProductUpdateInput;
    categoryIds?: string[];
    images?: { url: string; order: number }[];
    variants?: { name: string; value: string }[];
    availability?: Array<{
      inventoryLocationId: string;
      active: boolean;
      minimumStock?: number;
    }>;
  }): Promise<ProductWithRelations> {
    const { id, data, categoryIds, images, variants, availability } = args;

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data });

      if (categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (categoryIds.length > 0) {
          await tx.productCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              productId: id,
              categoryId,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img) => ({
              productId: id,
              url: img.url,
              order: img.order,
            })),
          });
        }
      }

      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length > 0) {
          await tx.productVariant.createMany({
            data: variants.map((v) => ({
              productId: id,
              name: v.name,
              value: v.value,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (availability) {
        const desiredLocationIds = availability.map(
          (a) => a.inventoryLocationId,
        );

        await tx.productAvailability.deleteMany({
          where: {
            productId: id,
            inventoryLocationId: { notIn: desiredLocationIds },
          },
        });

        for (const avail of availability) {
          await tx.productAvailability.upsert({
            where: {
              productId_inventoryLocationId: {
                productId: id,
                inventoryLocationId: avail.inventoryLocationId,
              },
            },
            create: {
              productId: id,
              inventoryLocationId: avail.inventoryLocationId,
              active: avail.active,
            },
            update: { active: avail.active },
          });

          if (avail.minimumStock !== undefined) {
            await tx.inventoryStock.upsert({
              where: {
                inventoryLocationId_productId: {
                  inventoryLocationId: avail.inventoryLocationId,
                  productId: id,
                },
              },
              create: {
                inventoryLocationId: avail.inventoryLocationId,
                productId: id,
                stock: 0,
                reservedStock: 0,
                minimumStock: avail.minimumStock,
              },
              update: { minimumStock: avail.minimumStock },
            });
          }
        }
      }

      const fresh = await tx.product.findUnique({
        where: { id },
        include: productInclude,
      });

      if (!fresh) {
        throw new Error('Failed to load updated product');
      }

      return fresh;
    });
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.product.delete({
      where: { id },
      select: { id: true },
    });
  }
}
