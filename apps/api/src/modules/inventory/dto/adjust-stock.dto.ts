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

export class AdjustStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId!: string;

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
    enum: InventoryMovementType,
    enumName: 'InventoryMovementType',
    description: 'Motivo del movimiento',
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
