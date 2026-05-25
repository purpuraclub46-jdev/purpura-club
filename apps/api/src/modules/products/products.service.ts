import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { generateUniqueSlug, slugify } from '../../common/utils/slug.util';
import { computeProductPricing } from '../../common/utils/pricing.util';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductAvailabilityInputDto } from './dto/product-availability.dto';
import {
  ProductQueryDto,
  ProductSort,
} from './dto/product-query.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductsRepository,
  ProductWithRelations,
} from './repositories/products.repository';

interface NormalizedAvailability {
  inventoryLocationId: string;
  active: boolean;
  initialStock: number;
  minimumStock: number;
}

interface ToResponseOptions {
  isMember?: boolean;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly repository: ProductsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateProductDto,
    actorUserId?: string,
  ): Promise<ProductResponseDto> {
    this.assertDiscount(dto);

    if (await this.repository.findBySku(dto.sku)) {
      throw new ConflictException('Ya existe un producto con este SKU');
    }
    if (dto.barcode && (await this.repository.findByBarcode(dto.barcode))) {
      throw new ConflictException(
        'Ya existe un producto con este código de barras',
      );
    }

    const availability = await this.normalizeAvailability(dto.availability);

    const slug = await this.resolveSlug(dto.slug, dto.name);

    try {
      const created = await this.repository.createWithRelations({
        data: {
          name: dto.name,
          slug,
          description: dto.description ?? null,
          sku: dto.sku,
          barcode: dto.barcode ?? null,
          price: new Prisma.Decimal(dto.price),
          cost: new Prisma.Decimal(dto.cost ?? 0),
          discountPercentage:
            dto.discountPercentage !== undefined
              ? new Prisma.Decimal(dto.discountPercentage)
              : null,
          discountActive: dto.discountActive ?? false,
          discountStartsAt: dto.discountStartsAt
            ? new Date(dto.discountStartsAt)
            : null,
          discountEndsAt: dto.discountEndsAt
            ? new Date(dto.discountEndsAt)
            : null,
          featured: dto.featured ?? false,
          active: dto.active ?? true,
        },
        categoryIds: dto.categoryIds ?? [],
        images: dto.images ?? [],
        variants: dto.variants ?? [],
        availability,
        createdByUserId: actorUserId,
      });

      this.logger.log(`Product created ${created.id} (${created.slug})`);
      return this.toResponse(created);
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }

    this.assertDiscount({
      discountPercentage: dto.discountPercentage,
      discountActive: dto.discountActive,
      discountStartsAt: dto.discountStartsAt,
      discountEndsAt: dto.discountEndsAt,
    });

    if (dto.sku !== undefined && dto.sku !== existing.sku) {
      const found = await this.repository.findBySku(dto.sku);
      if (found && found.id !== id) {
        throw new ConflictException('Ya existe un producto con este SKU');
      }
    }

    if (
      dto.barcode !== undefined &&
      dto.barcode !== null &&
      dto.barcode !== existing.barcode
    ) {
      const found = await this.repository.findByBarcode(dto.barcode);
      if (found && found.id !== id) {
        throw new ConflictException(
          'Ya existe un producto con este código de barras',
        );
      }
    }

    let slug = existing.slug;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const normalized = slugify(dto.slug);
      if (await this.repository.slugExists(normalized, id)) {
        throw new ConflictException('Ya existe un producto con este slug');
      }
      slug = normalized;
    }

    const availability =
      dto.availability !== undefined
        ? (await this.normalizeAvailability(dto.availability)).map((a) => ({
            inventoryLocationId: a.inventoryLocationId,
            active: a.active,
            minimumStock: a.minimumStock,
          }))
        : undefined;

    try {
      const updated = await this.repository.updateWithRelations({
        id,
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          sku: dto.sku,
          barcode: dto.barcode,
          price:
            dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
          cost:
            dto.cost !== undefined ? new Prisma.Decimal(dto.cost) : undefined,
          discountPercentage:
            dto.discountPercentage !== undefined
              ? new Prisma.Decimal(dto.discountPercentage)
              : undefined,
          discountActive: dto.discountActive,
          discountStartsAt:
            dto.discountStartsAt !== undefined
              ? dto.discountStartsAt
                ? new Date(dto.discountStartsAt)
                : null
              : undefined,
          discountEndsAt:
            dto.discountEndsAt !== undefined
              ? dto.discountEndsAt
                ? new Date(dto.discountEndsAt)
                : null
              : undefined,
          featured: dto.featured,
          active: dto.active,
        },
        categoryIds: dto.categoryIds,
        images: dto.images,
        variants: dto.variants,
        availability,
      });

      return this.toResponse(updated);
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Producto no encontrado');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: el producto tiene movimientos o pedidos asociados',
        );
      }
      throw error;
    }
  }

  async findById(
    id: string,
    options: ToResponseOptions = {},
  ): Promise<ProductResponseDto> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.toResponse(product, options);
  }

  async findBySlugPublic(
    slug: string,
    options: ToResponseOptions = {},
  ): Promise<ProductResponseDto> {
    const product = await this.repository.findBySlug(slug);
    if (!product || !product.active) {
      throw new NotFoundException('Producto no encontrado');
    }
    const hasEcommerceAvailability = product.availability.some(
      (a) => a.active && a.location.type === 'ECOMMERCE',
    );
    if (!hasEcommerceAvailability) {
      throw new NotFoundException('Producto no disponible');
    }
    return this.toResponse(product, options);
  }

  async findMany(
    query: ProductQueryDto & {
      availableForType?: 'ECOMMERCE' | 'SUCURSAL' | 'ALMACEN';
    },
    options: ToResponseOptions = {},
  ): Promise<Paginated<ProductResponseDto>> {
    const where: Prisma.ProductWhereInput = {};

    if (typeof query.active === 'boolean') where.active = query.active;
    if (typeof query.featured === 'boolean') where.featured = query.featured;

    if (query.categoryId) {
      where.categories = { some: { categoryId: query.categoryId } };
    }

    if (query.inventoryLocationId) {
      where.availability = {
        some: {
          inventoryLocationId: query.inventoryLocationId,
          active: true,
        },
      };
    } else if (query.availableForType) {
      where.availability = {
        some: {
          active: true,
          location: { active: true, type: query.availableForType },
        },
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const { items, total } = await this.repository.findMany({
      where,
      orderBy: this.toOrderBy(query.sort),
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((p) => this.toResponse(p, options)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  private toOrderBy(
    sort: ProductSort,
  ): Prisma.ProductOrderByWithRelationInput {
    const [field, direction] = sort.split(':') as [string, 'asc' | 'desc'];
    return { [field]: direction } as Prisma.ProductOrderByWithRelationInput;
  }

  private async resolveSlug(
    candidate: string | undefined,
    name: string,
  ): Promise<string> {
    if (candidate) {
      const normalized = slugify(candidate);
      if (await this.repository.slugExists(normalized)) {
        throw new ConflictException('Ya existe un producto con este slug');
      }
      return normalized;
    }

    const base = slugify(name);
    if (!(await this.repository.slugExists(base))) {
      return base;
    }

    let attempts = 0;
    while (attempts < 5) {
      const generated = generateUniqueSlug(name);
      if (!(await this.repository.slugExists(generated))) {
        return generated;
      }
      attempts += 1;
    }

    throw new ConflictException('No se pudo generar un slug único');
  }

  private assertDiscount(input: {
    discountPercentage?: number | null;
    discountActive?: boolean;
    discountStartsAt?: string | null;
    discountEndsAt?: string | null;
  }): void {
    const {
      discountPercentage,
      discountActive,
      discountStartsAt,
      discountEndsAt,
    } = input;

    if (
      discountActive === true &&
      (discountPercentage === undefined ||
        discountPercentage === null ||
        discountPercentage <= 0)
    ) {
      throw new BadRequestException(
        'Para activar la oferta debes indicar un porcentaje mayor a 0',
      );
    }

    if (discountStartsAt && discountEndsAt) {
      const start = new Date(discountStartsAt);
      const end = new Date(discountEndsAt);
      if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
        if (start > end) {
          throw new BadRequestException(
            'La fecha de inicio de la oferta no puede ser posterior a la fecha de fin',
          );
        }
      }
    }
  }

  private async normalizeAvailability(
    input?: ProductAvailabilityInputDto[],
  ): Promise<NormalizedAvailability[]> {
    if (!input || input.length === 0) return [];

    const byLocation = new Map<string, NormalizedAvailability>();
    for (const item of input) {
      const existing = byLocation.get(item.inventoryLocationId);
      const normalized: NormalizedAvailability = {
        inventoryLocationId: item.inventoryLocationId,
        active: item.active ?? true,
        initialStock: item.initialStock ?? 0,
        minimumStock: item.minimumStock ?? 0,
      };
      byLocation.set(item.inventoryLocationId, {
        ...existing,
        ...normalized,
      });
    }

    const ids = Array.from(byLocation.keys());
    const locations = await this.prisma.inventoryLocation.findMany({
      where: { id: { in: ids } },
      select: { id: true, active: true, name: true },
    });
    const foundIds = new Set(locations.map((l) => l.id));

    for (const id of ids) {
      if (!foundIds.has(id)) {
        throw new BadRequestException(
          `Ubicación de inventario no encontrada: ${id}`,
        );
      }
    }
    for (const loc of locations) {
      if (!loc.active) {
        throw new BadRequestException(
          `La ubicación "${loc.name}" no está activa`,
        );
      }
    }

    return Array.from(byLocation.values());
  }

  private translateUniqueError(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[] | undefined)?.join(', ');
      return new ConflictException(
        target
          ? `Ya existe un producto con el mismo valor en: ${target}`
          : 'Conflicto de unicidad en el producto',
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private decimalToNumber(value: Prisma.Decimal | number | string): number {
    if (value instanceof Prisma.Decimal) return value.toNumber();
    return Number(value);
  }

  private toResponse(
    product: ProductWithRelations,
    options: ToResponseOptions = {},
  ): ProductResponseDto {
    const stockByLocation = new Map(
      product.stock.map((s) => [s.inventoryLocationId, s]),
    );

    const totalStock = product.stock.reduce(
      (sum, inv) => sum + inv.stock,
      0,
    );
    const totalReserved = product.stock.reduce(
      (sum, inv) => sum + inv.reservedStock,
      0,
    );

    const pricing = computeProductPricing(
      {
        price: product.price,
        discountPercentage: product.discountPercentage,
        discountActive: product.discountActive,
        discountStartsAt: product.discountStartsAt,
        discountEndsAt: product.discountEndsAt,
      },
      { isMember: options.isMember ?? false },
    );

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      price: pricing.price,
      cost: this.decimalToNumber(product.cost),
      discountPercentage: pricing.discountPercentage,
      discountActive: pricing.discountActive,
      discountStartsAt: product.discountStartsAt,
      discountEndsAt: product.discountEndsAt,
      salePrice: pricing.salePrice,
      memberPrice: pricing.memberPrice,
      finalPrice: pricing.finalPrice,
      featured: product.featured,
      active: product.active,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        order: img.order,
      })),
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        value: v.value,
      })),
      categories: product.categories.map((rel) => ({
        id: rel.category.id,
        name: rel.category.name,
        slug: rel.category.slug,
      })),
      availability: product.availability.map((a) => {
        const inv = stockByLocation.get(a.inventoryLocationId);
        return {
          inventoryLocationId: a.inventoryLocationId,
          locationName: a.location.name,
          locationSlug: a.location.slug,
          locationType: a.location.type,
          active: a.active,
          stock: inv?.stock ?? 0,
          minimumStock: inv?.minimumStock ?? 0,
        };
      }),
      inventory: {
        totalStock,
        totalReserved,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
