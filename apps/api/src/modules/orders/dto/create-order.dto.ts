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
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description:
      'Precio unitario aplicado (CON IGV). Si se omite, se usa el precio del catálogo.',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}

/**
 * Snapshot fiscal del cliente para el checkout ecommerce.
 * Mismas reglas que en POS:
 *  - Para FACTURA: documentType=RUC, documentNumber válido, legalName y
 *    fiscalAddress son obligatorios.
 *  - Para BOLETA: opcional. Si hay documentNumber, se valida.
 */
export class OrderCustomerFiscalDto {
  @ApiProperty({
    enum: CustomerDocumentType,
    enumName: 'CustomerDocumentType',
  })
  @IsEnum(CustomerDocumentType)
  documentType!: CustomerDocumentType;

  @ApiPropertyOptional({ example: '20512345678', maxLength: 20 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(20)
  documentNumber?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(300)
  fiscalAddress?: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'email debe tener un formato válido' })
  @MaxLength(254)
  email?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Cliente CRM asociado al pedido (opcional).',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description:
      'Ubicación de inventario que afecta la venta (sucursal POS o ecommerce central).',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  inventoryLocationId?: string;

  @ApiProperty({
    enum: OrderPaymentMethod,
    enumName: 'OrderPaymentMethod',
  })
  @IsEnum(OrderPaymentMethod)
  paymentMethod!: OrderPaymentMethod;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  // ─── Fiscal (ecommerce checkout) ─────────────────────────────────────
  @ApiPropertyOptional({
    enum: ReceiptSeriesType,
    enumName: 'ReceiptSeriesType',
    description:
      'Comprobante deseado. BOLETA (default) o FACTURA. Para FACTURA requiere customerFiscal con RUC.',
    default: 'BOLETA',
  })
  @IsOptional()
  @IsEnum(ReceiptSeriesType)
  receiptType?: ReceiptSeriesType;

  @ApiPropertyOptional({
    type: OrderCustomerFiscalDto,
    description:
      'Snapshot fiscal del cliente. Si se omite, se infiere del Customer si está enlazado.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderCustomerFiscalDto)
  customerFiscal?: OrderCustomerFiscalDto;

  @ApiPropertyOptional({
    description:
      'Si se debe emitir comprobante al crear el pedido. Para flujo ecommerce simple, la emisión real se difiere a cambio de estado PAID; este flag fuerza la emisión inmediata para órdenes ya pagadas.',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value === 'true' : Boolean(value),
  )
  issueReceipt?: boolean;
}
