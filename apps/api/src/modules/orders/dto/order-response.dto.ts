import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerDocumentType,
  InventoryLocationType,
  OrderPaymentMethod,
  OrderStatus,
  ReceiptSeriesType,
  SunatStatus,
} from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  productSku!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
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

export class OrderCustomerRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;
}

export class OrderLocationRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    enum: InventoryLocationType,
    enumName: 'InventoryLocationType',
  })
  type!: InventoryLocationType;
}

/** Desglose IGV total de la orden. */
export class OrderFiscalTotalsDto {
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

/** Snapshot fiscal del cliente al momento de la emisión. */
export class OrderFiscalSnapshotDto {
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

/** Resumen del comprobante emitido. */
export class OrderReceiptDto {
  @ApiProperty({ enum: ReceiptSeriesType, enumName: 'ReceiptSeriesType' })
  type!: ReceiptSeriesType;
  @ApiProperty()
  series!: string;
  @ApiProperty()
  number!: number;
  @ApiProperty()
  formatted!: string;
  @ApiProperty({ type: String, format: 'date-time' })
  issuedAt!: string;
  @ApiProperty({ enum: SunatStatus, enumName: 'SunatStatus' })
  sunatStatus!: SunatStatus;
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  number!: string;

  @ApiPropertyOptional({ type: OrderCustomerRefDto, nullable: true })
  customer!: OrderCustomerRefDto | null;

  @ApiPropertyOptional({ type: OrderLocationRefDto, nullable: true })
  location!: OrderLocationRefDto | null;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  discount!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: OrderFiscalTotalsDto })
  fiscal!: OrderFiscalTotalsDto;

  @ApiProperty({ type: OrderFiscalSnapshotDto })
  fiscalSnapshot!: OrderFiscalSnapshotDto;

  @ApiPropertyOptional({ type: OrderReceiptDto, nullable: true })
  receipt!: OrderReceiptDto | null;

  @ApiProperty({ enum: OrderPaymentMethod, enumName: 'OrderPaymentMethod' })
  paymentMethod!: OrderPaymentMethod;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items!: OrderResponseDto[];

  @ApiProperty()
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
