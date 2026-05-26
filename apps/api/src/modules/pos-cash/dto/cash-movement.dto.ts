import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Tipos válidos para movimientos manuales (apertura/cierre/venta se generan
 * automáticamente y NO se aceptan acá).
 */
export enum ManualMovementType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class CreateCashMovementDto {
  @ApiProperty({ enum: ManualMovementType, enumName: 'ManualMovementType' })
  @IsEnum(ManualMovementType)
  type!: ManualMovementType;

  @ApiProperty({ example: 25.5, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  amount!: number;

  @ApiProperty({
    description:
      'Motivo del movimiento (movilidad, limpieza, cambio inicial, ajuste, retiro, etc.).',
    maxLength: 120,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reason!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}
