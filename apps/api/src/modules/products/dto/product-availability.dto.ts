import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { InventoryLocationType } from '@prisma/client';

export class ProductAvailabilityInputDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Ubicación de inventario donde el producto está disponible',
  })
  @IsUUID()
  @IsNotEmpty()
  inventoryLocationId!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Si el producto está activo en esta ubicación',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    description:
      'Stock inicial. Solo se aplica al CREAR el producto; al actualizar se ignora.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  initialStock?: number;

  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    description:
      'Stock mínimo (umbral de alerta) para esta ubicación. Se aplica en crear y editar.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumStock?: number;
}

export class ProductAvailabilityResponseDto {
  @ApiProperty({ format: 'uuid' })
  inventoryLocationId!: string;

  @ApiProperty()
  locationName!: string;

  @ApiProperty()
  locationSlug!: string;

  @ApiProperty({ enum: InventoryLocationType })
  locationType!: InventoryLocationType;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ example: 30, description: 'Stock disponible en la ubicación' })
  stock!: number;

  @ApiProperty({ example: 5 })
  minimumStock!: number;
}
