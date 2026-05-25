import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryMovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Tipos de movimiento permitidos para ajustes manuales en stock. */
export const ADJUSTMENT_MOVEMENT_TYPES = [
  InventoryMovementType.RESTOCK,
  InventoryMovementType.ADJUSTMENT,
  InventoryMovementType.LOSS,
] as const;

export class AdjustStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  inventoryLocationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    description:
      'Cantidad firmada: positiva añade stock, negativa lo reduce.',
    example: -2,
  })
  @Type(() => Number)
  @IsInt()
  quantity!: number;

  @ApiProperty({
    enum: ADJUSTMENT_MOVEMENT_TYPES,
    enumName: 'AdjustmentMovementType',
    default: InventoryMovementType.ADJUSTMENT,
  })
  @IsEnum(InventoryMovementType)
  type: InventoryMovementType = InventoryMovementType.ADJUSTMENT;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class UpdateMinimumStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  inventoryLocationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  minimumStock!: number;
}

export class ReserveStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  inventoryLocationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    description:
      'Cantidad a reservar (positiva). Para liberar use release-stock.',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  quantity!: number;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
