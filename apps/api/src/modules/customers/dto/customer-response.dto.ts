import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerDocumentType, CustomerGender } from '@prisma/client';

export class CustomerLocationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class CustomerLinkedUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  active!: boolean;
}

export class CustomerStatsDto {
  @ApiProperty({ description: 'Cantidad total de órdenes (cualquier estado).' })
  totalOrders!: number;

  @ApiProperty({ description: 'Cantidad de órdenes PAID.' })
  paidOrders!: number;

  @ApiProperty({
    type: Number,
    description: 'Total gastado (suma de órdenes PAID).',
  })
  totalSpent!: number;

  @ApiProperty({
    type: Number,
    description: 'Ticket promedio (totalSpent / paidOrders).',
  })
  averageTicket!: number;

  @ApiProperty()
  raffleEntries!: number;

  @ApiProperty({ description: 'Participaciones marcadas como ganadoras.' })
  wonRaffles!: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastPurchaseAt!: string | null;
}

export class CustomerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  userId!: string | null;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  fullName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  dni!: string | null;

  @ApiProperty({
    enum: CustomerDocumentType,
    enumName: 'CustomerDocumentType',
  })
  documentType!: CustomerDocumentType;

  @ApiPropertyOptional({ type: String, nullable: true })
  ruc!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  legalName!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  fiscalAddress!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  birthDate!: string | null;

  @ApiPropertyOptional({
    enum: CustomerGender,
    enumName: 'CustomerGender',
    nullable: true,
  })
  gender!: CustomerGender | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty()
  isMember!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  membershipExpiresAt!: string | null;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional({ type: CustomerLocationSummaryDto, nullable: true })
  primaryLocation!: CustomerLocationSummaryDto | null;

  @ApiPropertyOptional({ type: CustomerLinkedUserDto, nullable: true })
  linkedUser!: CustomerLinkedUserDto | null;

  @ApiProperty({ type: CustomerStatsDto })
  stats!: CustomerStatsDto;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

// ─── Detalle extendido con historial ──────────────────────────────────────

export class CustomerOrderItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  paymentMethod!: string;

  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty()
  itemsCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class CustomerRaffleEntryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  ticketNumber!: number;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ format: 'uuid' })
  raffleId!: string;

  @ApiProperty()
  raffleTitle!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class CustomerWonPrizeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty({ format: 'uuid' })
  raffleId!: string;

  @ApiProperty()
  raffleTitle!: string;

  @ApiProperty()
  winnerPublished!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;
}

export class CustomerDetailResponseDto extends CustomerResponseDto {
  @ApiProperty({ type: [CustomerOrderItemDto] })
  recentOrders!: CustomerOrderItemDto[];

  @ApiProperty({ type: [CustomerRaffleEntryDto] })
  recentRaffleEntries!: CustomerRaffleEntryDto[];

  @ApiProperty({ type: [CustomerWonPrizeDto] })
  wonPrizes!: CustomerWonPrizeDto[];
}

// ─── Stats globales ────────────────────────────────────────────────────────

export class CustomerOverviewStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  inactive!: number;

  @ApiProperty()
  members!: number;

  @ApiProperty()
  registeredLast30Days!: number;
}
