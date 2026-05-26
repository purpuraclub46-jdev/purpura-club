import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrderPaymentMethod,
  POSCashMovementType,
  POSCashSessionStatus,
} from '@prisma/client';

export class CashRegisterSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  active!: boolean;
}

export class CashSessionUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  email!: string;
  @ApiProperty()
  firstName!: string;
  @ApiProperty()
  lastName!: string;
}

export class CashSessionMovementDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ enum: POSCashMovementType, enumName: 'POSCashMovementType' })
  type!: POSCashMovementType;
  @ApiProperty({ type: Number })
  amount!: number;
  @ApiPropertyOptional({ type: String, nullable: true })
  reason!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  orderId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  orderNumber!: string | null;
  @ApiPropertyOptional({ type: CashSessionUserDto, nullable: true })
  createdBy!: CashSessionUserDto | null;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class PaymentMethodTotalDto {
  @ApiProperty({ enum: OrderPaymentMethod, enumName: 'OrderPaymentMethod' })
  method!: OrderPaymentMethod;
  @ApiProperty({ type: Number })
  total!: number;
  @ApiProperty()
  count!: number;
}

export class CashSessionTotalsDto {
  @ApiProperty({ type: Number })
  salesTotal!: number;
  @ApiProperty({ type: Number })
  salesCount!: number;
  @ApiProperty({ type: Number })
  incomeTotal!: number;
  @ApiProperty({ type: Number })
  expenseTotal!: number;
  /** Efectivo esperado = apertura + ingresos efectivo - egresos efectivo + ventas efectivo */
  @ApiProperty({ type: Number })
  expectedCash!: number;
  @ApiProperty({ type: [PaymentMethodTotalDto] })
  byPaymentMethod!: PaymentMethodTotalDto[];
}

export class CashSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ format: 'uuid' })
  cashRegisterId!: string;
  @ApiProperty({ type: CashRegisterSummaryDto })
  cashRegister!: CashRegisterSummaryDto;
  @ApiProperty({
    enum: POSCashSessionStatus,
    enumName: 'POSCashSessionStatus',
  })
  status!: POSCashSessionStatus;
  @ApiProperty({ type: CashSessionUserDto })
  openedBy!: CashSessionUserDto;
  @ApiPropertyOptional({ type: CashSessionUserDto, nullable: true })
  closedBy!: CashSessionUserDto | null;
  @ApiProperty({ type: Number })
  openingAmount!: number;
  @ApiPropertyOptional({ type: Number, nullable: true })
  closingAmount!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  expectedAmount!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  differenceAmount!: number | null;
  @ApiProperty({ type: String, format: 'date-time' })
  openedAt!: string;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  closedAt!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;
  @ApiProperty({ type: CashSessionTotalsDto })
  totals!: CashSessionTotalsDto;
  @ApiProperty({ type: [CashSessionMovementDto] })
  movements!: CashSessionMovementDto[];
}
