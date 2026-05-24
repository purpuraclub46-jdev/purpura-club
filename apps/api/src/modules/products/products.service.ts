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
import { generateUniqueSlug, slugify } from '../../common/utils/slug.util';
import { CreateProductDto } from './dto/create-product.dto';
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

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly repository: ProductsRepository) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    this.assertPricing(dto.price, dto.memberPrice);

    if (await this.repository.findBySku(dto.sku)) {
      throw new ConflictException('Ya existe un producto con este SKU');
    }
    if (dto.barcode && (await this.repository.findByBarcode(dto.barcode))) {
      throw new ConflictException('Ya existe un producto con este código de barras');
    }

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
          memberPrice: new Prisma.Decimal(dto.memberPrice),
          cost: new Prisma.Decimal(dto.cost ?? 0),
          featured: dto.featured ?? false,
          active: dto.active ?? true,
        },
        categoryIds: dto.categoryIds ?? [],
        images: dto.images ?? [],
        variants: dto.variants ?? [],
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

    const price =
      dto.price ?? this.decimalToNumber(existing.price);
    const memberPrice =
      dto.memberPrice ?? this.decimalToNumber(existing.memberPrice);
    this.assertPricing(price, memberPrice);

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
          memberPrice:
            dto.memberPrice !== undefined
              ? new Prisma.Decimal(dto.memberPrice)
              : undefined,
          cost:
            dto.cost !== undefined ? new Prisma.Decimal(dto.cost) : undefined,
          featured: dto.featured,
          active: dto.active,
        },
        categoryIds: dto.categoryIds,
        images: dto.images,
        variants: dto.variants,
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

  async findById(id: string): Promise<ProductResponseDto> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.toResponse(product);
  }

  async findBySlugPublic(slug: string): Promise<ProductResponseDto> {
    const product = await this.repository.findBySlug(slug);
    if (!product || !product.active) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.toResponse(product);
  }

  async findMany(
    query: ProductQueryDto,
  ): Promise<Paginated<ProductResponseDto>> {
    const where: Prisma.ProductWhereInput = {};

    if (typeof query.active === 'boolean') where.active = query.active;
    if (typeof query.featured === 'boolean') where.featured = query.featured;

    if (query.categoryId) {
      where.categories = { some: { categoryId: query.categoryId } };
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
      items: items.map((p) => this.toResponse(p)),
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

  private assertPricing(price: number, memberPrice: number): void {
    if (memberPrice > price) {
      throw new BadRequestException(
        'El precio para miembros no puede ser mayor al precio normal',
      );
    }
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

  private toResponse(product: ProductWithRelations): ProductResponseDto {
    const totalStock = product.inventory.reduce(
      (sum, inv) => sum + inv.stock,
      0,
    );
    const totalReserved = product.inventory.reduce(
      (sum, inv) => sum + inv.reservedStock,
      0,
    );

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      price: this.decimalToNumber(product.price),
      memberPrice: this.decimalToNumber(product.memberPrice),
      cost: this.decimalToNumber(product.cost),
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
      inventory: {
        totalStock,
        totalReserved,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
