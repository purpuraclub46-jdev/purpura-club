import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { POSCreditNoteType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Item devuelto en una nota de crédito parcial.
 * Para FULL_RETURN y SALE_CANCELLATION los items se derivan de la orden
 * original y este array se ignora.
 * Para PARTIAL_RETURN y PRODUCT_EXCHANGE el cajero indica qué OrderItem y
 * cuántas unidades devolver. La cantidad no puede exceder lo realmente
 * vendido menos lo ya devuelto en notas anteriores.
 */
export class CreditNoteItemDto {
  @ApiProperty({ format: 'uuid', description: 'OrderItem original devuelto.' })
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;
}

export class CreateCreditNoteDto {
  @ApiProperty({ format: 'uuid', description: 'Orden POS original a devolver.' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: POSCreditNoteType, enumName: 'POSCreditNoteType' })
  @IsEnum(POSCreditNoteType)
  type!: POSCreditNoteType;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description:
      'Sesión de caja abierta donde se procesa la nota. Requerida si se devuelve efectivo. Si no se indica, se busca la sesión OPEN de la sucursal.',
  })
  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @ApiProperty({
    description: 'Motivo de la devolución (visible para auditoría).',
    minLength: 4,
    maxLength: 240,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(240)
  reason!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    type: [CreditNoteItemDto],
    description:
      'Items a devolver. Solo para PARTIAL_RETURN y PRODUCT_EXCHANGE. En FULL_RETURN y SALE_CANCELLATION se ignora y se devuelven todos los items pendientes.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreditNoteItemDto)
  items?: CreditNoteItemDto[];

  @ApiPropertyOptional({
    description:
      'Efectivo que se entregó físicamente al cliente al momento de la devolución. Si no se indica, se asume el total de la nota.',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  refundedCash?: number;
}
