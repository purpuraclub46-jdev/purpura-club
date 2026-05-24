import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RaffleStatus, RaffleVisibility } from '@prisma/client';

export class RaffleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  bannerImage!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  prizeImage!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  countdown!: Date | null;

  @ApiProperty({ example: 25 })
  ticketPrice!: number;

  @ApiProperty({ example: 15 })
  memberTicketPrice!: number;

  @ApiProperty({ example: 500 })
  totalTickets!: number;

  @ApiProperty({ example: 42 })
  soldTickets!: number;

  @ApiProperty({ example: 458, description: 'totalTickets minus soldTickets' })
  remainingTickets!: number;

  @ApiProperty({ enum: RaffleStatus, enumName: 'RaffleStatus' })
  status!: RaffleStatus;

  @ApiProperty({ enum: RaffleVisibility, enumName: 'RaffleVisibility' })
  visibility!: RaffleVisibility;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  winnerUserId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  startDate!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endDate!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedRafflesResponseDto {
  @ApiProperty({ type: [RaffleResponseDto] })
  items!: RaffleResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 20,
      total: 42,
      totalPages: 3,
      hasNextPage: true,
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
