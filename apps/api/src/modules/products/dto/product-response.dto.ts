import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProductImageResponseDto,
} from './product-image.dto';
import { ProductVariantResponseDto } from './product-variant.dto';

export class ProductCategoryRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class ProductInventorySummaryDto {
  @ApiProperty({ description: 'Stock total a través de todas las sucursales' })
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

  @ApiProperty({ example: 129.9 })
  price!: number;

  @ApiProperty({ example: 99.9 })
  memberPrice!: number;

  @ApiProperty({ example: 45 })
  cost!: number;

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
