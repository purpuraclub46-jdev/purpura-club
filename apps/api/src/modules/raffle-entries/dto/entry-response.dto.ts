import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntryStatus, EntryType, PaymentMethod } from '@prisma/client';

export class EntryRaffleSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startDate!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endDate!: Date;
}

export class EntryUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class RaffleEntryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  raffleId!: string;

  @ApiProperty({ example: 142 })
  ticketNumber!: number;

  @ApiProperty({ enum: EntryType, enumName: 'EntryType' })
  type!: EntryType;

  @ApiProperty({ enum: EntryStatus, enumName: 'EntryStatus' })
  status!: EntryStatus;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    nullable: true,
  })
  paymentMethod!: PaymentMethod | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  paymentReference!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: EntryRaffleSummaryDto })
  raffle?: EntryRaffleSummaryDto;

  @ApiPropertyOptional({ type: EntryUserSummaryDto })
  user?: EntryUserSummaryDto;
}

export class PurchaseEntryResponseDto {
  @ApiProperty({ type: [RaffleEntryResponseDto] })
  entries!: RaffleEntryResponseDto[];

  @ApiProperty({ example: 'yape-pending-1734567890123', nullable: true })
  paymentReference!: string | null;

  @ApiProperty({ example: 125.0 })
  totalAmount!: number;

  @ApiProperty({ enum: PaymentMethod, enumName: 'PaymentMethod' })
  paymentMethod!: PaymentMethod;
}

export class PaginatedEntriesResponseDto {
  @ApiProperty({ type: [RaffleEntryResponseDto] })
  items!: RaffleEntryResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 20,
      total: 5,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  })
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
