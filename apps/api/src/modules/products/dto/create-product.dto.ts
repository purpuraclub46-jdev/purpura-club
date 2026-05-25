import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductAvailabilityInputDto } from './product-availability.dto';
import { ProductImageInputDto } from './product-image.dto';
import { ProductVariantInputDto } from './product-variant.dto';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateProductDto {
  @ApiProperty({ example: 'Collar Eternidad Acero Dorado' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug. Auto-generated when omitted.',
    minLength: 3,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(SLUG_REGEX, {
    message:
      'slug must contain only lowercase letters, digits and single dashes',
  })
  slug?: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @ApiProperty({ example: 'JOY-COLL-001', maxLength: 60 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  sku!: string;

  @ApiPropertyOptional({ example: '7501234567890', maxLength: 60 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(60)
  barcode?: string;

  @ApiProperty({ example: 129.9, minimum: 0, description: 'Precio normal' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({
    example: 45,
    minimum: 0,
    description: 'Costo interno',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  // ─── OFERTA DINÁMICA ──────────────────────────────────────────────
  @ApiPropertyOptional({
    example: 20,
    minimum: 0,
    maximum: 100,
    description:
      'Porcentaje de descuento (0-100). Solo aplica si discountActive=true.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'Bandera maestra para habilitar/deshabilitar la oferta.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  discountActive?: boolean;

  @ApiPropertyOptional({
    description: 'Inicio de la ventana de la oferta. Si se omite, no hay piso.',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  discountStartsAt?: string;

  @ApiPropertyOptional({
    description: 'Fin de la ventana de la oferta. Si se omite, no hay tope.',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  discountEndsAt?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [ProductImageInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  @ApiPropertyOptional({ type: [ProductVariantInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];

  @ApiPropertyOptional({
    type: [ProductAvailabilityInputDto],
    description:
      'Disponibilidad por ubicación. En CREATE se aplican stock inicial y mínimo. En UPDATE el stock inicial se ignora.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductAvailabilityInputDto)
  availability?: ProductAvailabilityInputDto[];
}
