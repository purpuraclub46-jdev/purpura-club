import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RaffleStatus, RaffleVisibility } from '@prisma/client';
import { RafflePricingDto } from './raffle-pricing.dto';

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

  @ApiProperty({
    example: 10,
    description: 'Precio público del ticket en PEN.',
  })
  ticketPrice!: number;

  /**
   * @deprecated F2.7-B — Mantenido por compatibilidad. El precio socio es
   * siempre 50 % del público; se persiste en la columna legacy con ese
   * valor derivado y no se acepta por la API. Usa `pricing.memberPrice`.
   */
  @ApiProperty({
    example: 5,
    deprecated: true,
    description:
      'DEPRECATED — Precio socio derivado (50 % off). Conservado para compatibilidad. Usa `pricing.memberPrice` como fuente canónica.',
  })
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

  @ApiProperty({
    type: RafflePricingDto,
    description:
      'F2.7-B — Bloque pricing resuelto al solicitante. Fuente canónica para el frontend.',
  })
  pricing!: RafflePricingDto;
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
