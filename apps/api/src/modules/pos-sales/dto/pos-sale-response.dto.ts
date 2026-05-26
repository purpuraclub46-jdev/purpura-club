import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerDocumentType,
  OrderPaymentMethod,
  OrderStatus,
  ReceiptSeriesType,
  SunatStatus,
} from '@prisma/client';

export class PosSaleItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  productId!: string;
  @ApiProperty()
  productName!: string;
  @ApiProperty()
  quantity!: number;
  @ApiProperty({ type: Number })
  unitPrice!: number;
  @ApiProperty({ type: Number })
  subtotal!: number;

  // IGV breakdown por línea (UBL ready)
  @ApiProperty({ type: Number, description: 'Tasa IGV % aplicada a la línea.' })
  igvRate!: number;
  @ApiProperty({ type: Number, description: 'Precio unitario SIN IGV.' })
  unitPriceUntaxed!: number;
  @ApiProperty({ type: Number, description: 'Subtotal SIN IGV.' })
  subtotalUntaxed!: number;
  @ApiProperty({ type: Number, description: 'IGV de la línea.' })
  igvAmount!: number;
}

export class PosSalePaymentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ enum: OrderPaymentMethod, enumName: 'OrderPaymentMethod' })
  method!: OrderPaymentMethod;
  @ApiProperty({ type: Number })
  amount!: number;
  @ApiPropertyOptional({ type: String, nullable: true })
  reference!: string | null;
}

export class PosSaleReceiptDto {
  @ApiProperty({ enum: ReceiptSeriesType, enumName: 'ReceiptSeriesType' })
  type!: ReceiptSeriesType;
  @ApiProperty({ example: 'B001' })
  series!: string;
  @ApiProperty({ example: 123 })
  number!: number;
  @ApiProperty({ example: 'B001-00000123' })
  formatted!: string;
  @ApiProperty({ type: String, format: 'date-time' })
  issuedAt!: string;
  @ApiProperty({ enum: SunatStatus, enumName: 'SunatStatus' })
  sunatStatus!: SunatStatus;
}

export class PosSaleCustomerSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  fullName!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  dni!: string | null;
  @ApiProperty()
  isMember!: boolean;
}

/**
 * Snapshot fiscal que se grabó en la orden al momento de emitir. Inmutable
 * — corresponde a lo que aparece impreso en el comprobante.
 */
export class PosSaleFiscalSnapshotDto {
  @ApiPropertyOptional({
    enum: CustomerDocumentType,
    enumName: 'CustomerDocumentType',
    nullable: true,
  })
  documentType!: CustomerDocumentType | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  documentNumber!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  legalName!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  fiscalAddress!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  email!: string | null;
}

/**
 * Desglose IGV total de la venta (CON IGV, SIN IGV, IGV).
 */
export class PosSaleFiscalTotalsDto {
  @ApiProperty({
    type: Number,
    description: 'Tasa IGV % aplicada (típicamente 18).',
  })
  igvRate!: number;

  @ApiProperty({
    type: Number,
    description:
      'Base imponible — total SIN IGV. = round2(total / (1 + igvRate/100))',
  })
  subtotalUntaxed!: number;

  @ApiProperty({
    type: Number,
    description: 'Monto del IGV. = round2(total - subtotalUntaxed)',
  })
  igvAmount!: number;

  @ApiProperty({
    type: Number,
    description: 'Total final cobrado al cliente. CON IGV.',
  })
  total!: number;

  @ApiProperty({
    description:
      'Si los precios del catálogo ya incluyen IGV (true en Perú retail).',
  })
  pricesIncludeIgv!: boolean;
}

export class PosSaleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  number!: string;
  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;
  @ApiProperty({ type: Number })
  subtotal!: number;
  @ApiProperty({ type: Number })
  discount!: number;
  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: PosSaleFiscalTotalsDto })
  fiscal!: PosSaleFiscalTotalsDto;

  @ApiProperty({ type: [PosSaleItemResponseDto] })
  items!: PosSaleItemResponseDto[];
  @ApiProperty({ type: [PosSalePaymentResponseDto] })
  payments!: PosSalePaymentResponseDto[];
  @ApiPropertyOptional({ type: PosSaleReceiptDto, nullable: true })
  receipt!: PosSaleReceiptDto | null;
  @ApiPropertyOptional({ type: PosSaleCustomerSummaryDto, nullable: true })
  customer!: PosSaleCustomerSummaryDto | null;
  @ApiProperty({ type: PosSaleFiscalSnapshotDto })
  fiscalSnapshot!: PosSaleFiscalSnapshotDto;
  @ApiProperty()
  raffleEntriesGenerated!: number;
  @ApiProperty()
  membershipDiscountApplied!: boolean;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}
