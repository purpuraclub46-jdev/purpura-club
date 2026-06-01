import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryGroup } from '@prisma/client';
import { ProductAvailabilityResponseDto } from './product-availability.dto';
import { ProductImageResponseDto } from './product-image.dto';
import { ProductVariantResponseDto } from './product-variant.dto';

export class ProductCategoryRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  // F2.7-D / D3 — Exponemos el grupo para que el storefront decida si el
  // producto es Club-eligible (JOYERIA | PERFUMES) sin replicar la lista
  // del backend ni adivinar por slug. Acoplado al enum Prisma; cambios al
  // enum son ABI-breaking para el frontend.
  @ApiProperty({
    enum: ['JOYERIA', 'PERFUMES', 'ACCESORIOS'],
    description:
      'Grupo macro de la categoría. JOYERIA y PERFUMES son elegibles para el +10% del Club Púrpura; ACCESORIOS no.',
    example: 'JOYERIA',
  })
  group!: CategoryGroup;
}

export class ProductInventorySummaryDto {
  @ApiProperty({
    description: 'Stock total a través de todas las ubicaciones de inventario',
  })
  totalStock!: number;

  @ApiProperty({ description: 'Stock reservado total' })
  totalReserved!: number;
}

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  sku!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  barcode!: string | null;

  @ApiProperty({ example: 129.9, description: 'Precio normal' })
  price!: number;

  @ApiProperty({ example: 45, description: 'Costo interno' })
  cost!: number;

  // ─── OFERTA DINÁMICA ──────────────────────────────────────────────
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 20,
    description: 'Porcentaje de descuento configurado (0-100). null si no aplica.',
  })
  discountPercentage!: number | null;

  @ApiProperty({
    example: true,
    description:
      'true si la oferta está configurada como activa Y está dentro de la ventana de fechas.',
  })
  discountActive!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  discountStartsAt!: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  discountEndsAt!: Date | null;

  // ─── PRECIOS COMPUTADOS ──────────────────────────────────────────
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 103.92,
    description:
      'Precio con la oferta aplicada (precio - descuento %). null si no hay oferta vigente.',
  })
  salePrice!: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 93.53,
    description:
      'Precio con la oferta + 10% adicional de miembro. Solo != null si el solicitante es miembro Y la oferta está vigente.',
  })
  memberPrice!: number | null;

  @ApiProperty({
    example: 103.92,
    description:
      'Precio final que se cobraría al solicitante (memberPrice ?? salePrice ?? price).',
  })
  finalPrice!: number;

  @ApiProperty()
  featured!: boolean;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ type: [ProductImageResponseDto] })
  images!: ProductImageResponseDto[];

  @ApiProperty({ type: [ProductVariantResponseDto] })
  variants!: ProductVariantResponseDto[];

  @ApiProperty({ type: [ProductCategoryRefDto] })
  categories!: ProductCategoryRefDto[];

  @ApiProperty({
    type: [ProductAvailabilityResponseDto],
    description: 'Ubicaciones donde el producto está disponible',
  })
  availability!: ProductAvailabilityResponseDto[];

  @ApiProperty({ type: ProductInventorySummaryDto })
  inventory!: ProductInventorySummaryDto;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  items!: ProductResponseDto[];

  @ApiProperty()
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
