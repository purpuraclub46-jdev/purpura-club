import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export type ProductSort =
  | 'createdAt:desc'
  | 'createdAt:asc'
  | 'name:asc'
  | 'name:desc'
  | 'price:asc'
  | 'price:desc';

export const PRODUCT_SORTS: ProductSort[] = [
  'createdAt:desc',
  'createdAt:asc',
  'name:asc',
  'name:desc',
  'price:asc',
  'price:desc',
];

export class ProductQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Búsqueda libre por nombre o SKU' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value === 'true' : Boolean(value),
  )
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value === 'true' : Boolean(value),
  )
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS, default: 'createdAt:desc' })
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort: ProductSort = 'createdAt:desc';
}
