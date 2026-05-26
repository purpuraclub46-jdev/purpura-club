import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerDocumentType,
  OrderPaymentMethod,
  ReceiptSeriesType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PosSaleItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity!: number;
}

/**
 * Pago individual (efectivo, Yape, tarjeta, etc.). El frontend POS suma
 * `payments[].amount` y debe igualar el total del carrito calculado por el
 * backend — si no coincide, se rechaza la venta.
 */
export class PosSalePaymentDto {
  @ApiProperty({ enum: OrderPaymentMethod, enumName: 'OrderPaymentMethod' })
  @IsEnum(OrderPaymentMethod)
  method!: OrderPaymentMethod;

  @ApiProperty({ example: 50, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Referencia del pago (n° operación Yape, voucher tarjeta, etc.)',
    maxLength: 120,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  reference?: string;
}

/**
 * Snapshot fiscal del cliente que el cajero declara EN ESTA VENTA.
 * Se usa para emitir el comprobante (boleta o factura) con datos
 * actualizados sin depender del CRM. Si la venta tiene `customerId`,
 * estos datos sobreescriben los del Customer para el comprobante.
 *
 * Reglas:
 *  - Para FACTURA: `documentType=RUC`, `documentNumber` (11 dígitos válidos),
 *    `legalName` y `fiscalAddress` son obligatorios.
 *  - Para BOLETA: cualquier tipo de documento (incluso ninguno).
 */
export class PosSaleCustomerFiscalDto {
  @ApiProperty({
    enum: CustomerDocumentType,
    enumName: 'CustomerDocumentType',
  })
  @IsEnum(CustomerDocumentType)
  documentType!: CustomerDocumentType;

  @ApiPropertyOptional({
    example: '20512345678',
    description:
      'Número de documento (DNI: 8 dígitos, RUC: 11 con check digit). Requerido para FACTURA.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(20)
  documentNumber?: string;

  @ApiPropertyOptional({
    example: 'Comercializadora Aurora S.A.C.',
    maxLength: 200,
    description: 'Razón social o nombre legal. Requerido para FACTURA.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({
    maxLength: 300,
    description: 'Dirección fiscal. Requerida para FACTURA.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(300)
  fiscalAddress?: string;

  @ApiPropertyOptional({
    format: 'email',
    description: 'Email para envío del comprobante PDF.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'email debe tener un formato válido' })
  @MaxLength(254)
  email?: string;
}

export class CreatePosSaleDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description:
      'Sesión de caja abierta que registra la venta. Debe estar OPEN.',
  })
  @IsUUID()
  cashSessionId!: string;

  @ApiProperty({ type: [PosSaleItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosSaleItemDto)
  items!: PosSaleItemDto[];

  @ApiProperty({ type: [PosSalePaymentDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosSalePaymentDto)
  payments!: PosSalePaymentDto[];

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description:
      'Cliente CRM al que se asocia la venta (opcional). Habilita membresía y participaciones.',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Descuento manual aplicado por el cajero (S/).',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  manualDiscount?: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;

  // ─── Fiscal ─────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Si emitir comprobante (BOLETA por defecto). Default true.',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value === 'true' : Boolean(value),
  )
  issueReceipt?: boolean;

  @ApiPropertyOptional({
    enum: ReceiptSeriesType,
    enumName: 'ReceiptSeriesType',
    description:
      'Tipo de comprobante a emitir. BOLETA (default) o FACTURA. Para FACTURA se requiere customerFiscal con RUC válido.',
    default: 'BOLETA',
  })
  @IsOptional()
  @IsEnum(ReceiptSeriesType)
  receiptType?: ReceiptSeriesType;

  @ApiPropertyOptional({
    type: PosSaleCustomerFiscalDto,
    description:
      'Snapshot fiscal del cliente. Si se omite y la venta es BOLETA sin customerId, se emite a "Consumidor Final".',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PosSaleCustomerFiscalDto)
  customerFiscal?: PosSaleCustomerFiscalDto;
}
