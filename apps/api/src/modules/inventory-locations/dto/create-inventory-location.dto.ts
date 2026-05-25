import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryLocationType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateInventoryLocationDto {
  @ApiProperty({ example: 'Ecommerce Central' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'ecommerce-central' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(SLUG_REGEX, {
    message: 'slug solo permite minúsculas, números y guiones',
  })
  slug?: string;

  @ApiProperty({
    enum: InventoryLocationType,
    enumName: 'InventoryLocationType',
    description: 'ECOMMERCE para inventario online, SUCURSAL para tienda física, ALMACEN para depósitos.',
  })
  @IsEnum(InventoryLocationType)
  type!: InventoryLocationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
