import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerDocumentType,
  POSCreditNoteType,
  ReceiptSeriesType,
  SunatStatus,
} from '@prisma/client';

export class CreditNoteItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  orderItemId!: string | null;
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

  // IGV breakdown por línea
  @ApiProperty({ type: Number })
  igvRate!: number;
  @ApiProperty({ type: Number })
  unitPriceUntaxed!: number;
  @ApiProperty({ type: Number })
  subtotalUntaxed!: number;
  @ApiProperty({ type: Number })
  igvAmount!: number;
}

export class CreditNoteUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  firstName!: string;
  @ApiProperty()
  lastName!: string;
  @ApiProperty()
  email!: string;
}

export class CreditNoteOrderSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  number!: string;
  @ApiProperty({ type: Number })
  total!: number;
  @ApiPropertyOptional({
    enum: ReceiptSeriesType,
    enumName: 'ReceiptSeriesType',
    nullable: true,
  })
  receiptType!: ReceiptSeriesType | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  receiptSeries!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  receiptNumber!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  formattedReceipt!: string | null;
}

/** Totales con desglose IGV de la NC. */
export class CreditNoteFiscalTotalsDto {
  @ApiProperty({ type: Number })
  igvRate!: number;
  @ApiProperty({ type: Number })
  subtotalUntaxed!: number;
  @ApiProperty({ type: Number })
  igvAmount!: number;
  @ApiProperty({ type: Number })
  total!: number;
  @ApiProperty()
  pricesIncludeIgv!: boolean;
}

/** Snapshot fiscal del cliente al momento de la NC (heredado de la orden). */
export class CreditNoteFiscalSnapshotDto {
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

export class CreditNoteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ example: 'NC-20260525-A1B2C3' })
  number!: string;
  @ApiProperty({ enum: POSCreditNoteType, enumName: 'POSCreditNoteType' })
  type!: POSCreditNoteType;
  @ApiProperty()
  reason!: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;
  @ApiProperty({ type: Number })
  subtotal!: number;
  @ApiProperty({ type: Number })
  total!: number;
  @ApiProperty({ type: Number })
  refundedCash!: number;

  @ApiProperty({ type: CreditNoteFiscalTotalsDto })
  fiscal!: CreditNoteFiscalTotalsDto;

  @ApiProperty({ type: CreditNoteFiscalSnapshotDto })
  fiscalSnapshot!: CreditNoteFiscalSnapshotDto;

  @ApiPropertyOptional({
    enum: ReceiptSeriesType,
    enumName: 'ReceiptSeriesType',
    nullable: true,
  })
  receiptType!: ReceiptSeriesType | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  receiptSeries!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  receiptNumber!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  formattedReceipt!: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  receiptIssuedAt!: string | null;
  @ApiProperty({ enum: SunatStatus, enumName: 'SunatStatus' })
  sunatStatus!: SunatStatus;

  @ApiProperty({ type: CreditNoteOrderSummaryDto })
  order!: CreditNoteOrderSummaryDto;
  @ApiPropertyOptional({ type: CreditNoteOrderSummaryDto, nullable: true })
  exchangeOrder!: CreditNoteOrderSummaryDto | null;

  @ApiProperty({ format: 'uuid' })
  inventoryLocationId!: string;
  @ApiProperty()
  inventoryLocationName!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  cashSessionId!: string | null;

  @ApiProperty({ type: CreditNoteUserSummaryDto })
  createdBy!: CreditNoteUserSummaryDto;

  @ApiProperty({ type: [CreditNoteItemResponseDto] })
  items!: CreditNoteItemResponseDto[];

  @ApiProperty()
  raffleEntriesReversed!: number;
  @ApiProperty()
  membershipReverted!: boolean;
  @ApiProperty()
  orderRefunded!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

/**
 * Resumen "live" de una orden POS para la pantalla de devoluciones:
 * total, total ya devuelto, y items con cantidad disponible para devolver.
 */
export class ReturnableOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  orderItemId!: string;
  @ApiProperty({ format: 'uuid' })
  productId!: string;
  @ApiProperty()
  productName!: string;
  @ApiProperty()
  quantitySold!: number;
  @ApiProperty()
  quantityReturned!: number;
  @ApiProperty()
  quantityAvailable!: number;
  @ApiProperty({ type: Number })
  unitPrice!: number;
  @ApiProperty({ type: Number })
  subtotal!: number;
}

export class ReturnableOrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  number!: string;
  @ApiProperty({ type: Number })
  subtotal!: number;
  @ApiProperty({ type: Number })
  discount!: number;
  @ApiProperty({ type: Number })
  total!: number;
  @ApiProperty()
  status!: string;
  @ApiPropertyOptional({
    enum: ReceiptSeriesType,
    enumName: 'ReceiptSeriesType',
    nullable: true,
  })
  receiptType!: ReceiptSeriesType | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  receiptSeries!: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  receiptNumber!: number | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  formattedReceipt!: string | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: Number })
  refundedTotal!: number;
  @ApiProperty()
  hasOpenSession!: boolean;
  @ApiProperty()
  fullyReturned!: boolean;

  @ApiProperty({ type: [ReturnableOrderItemDto] })
  items!: ReturnableOrderItemDto[];

  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: true })
  customer!: {
    id: string;
    fullName: string;
    dni: string | null;
    isMember: boolean;
  } | null;

  @ApiProperty({ format: 'uuid' })
  inventoryLocationId!: string;
  @ApiProperty()
  inventoryLocationName!: string;

  @ApiProperty({ type: [CreditNoteResponseDto] })
  creditNotes!: CreditNoteResponseDto[];
}
