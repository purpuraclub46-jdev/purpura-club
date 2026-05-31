import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * F2.7-C — Estado de cada referral en el historial visible al usuario.
 *
 *   PENDING_PURCHASE: el invitado se registró pero aún no completó una
 *                     compra ≥ S/25.
 *   QUALIFIED:        compra elegible confirmada → ticket otorgado.
 *
 * Mantener acotado a estos dos estados — el dominio de admin tiene granularidad
 * adicional (rewarded:boolean + timestamps), pero el customer panel debe
 * mostrar lenguaje accesible, no tecnicismo.
 */
export type ReferralHistoryStatus = 'PENDING_PURCHASE' | 'QUALIFIED';

export class ReferralStatsDto {
  @ApiProperty({ description: 'Cantidad total de invitados registrados' })
  registered!: number;

  @ApiProperty({
    description: 'Invitados con compra calificada (≥ S/25 confirmada)',
  })
  qualified!: number;

  @ApiProperty({
    description:
      'Tickets bonus de sorteo ganados por referidos (1 por calificado)',
  })
  ticketsEarned!: number;
}

export class ReferralHistoryItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'Nombre ofuscado del invitado (Pedro G.) — protege PII (R8).',
    example: 'Pedro G.',
  })
  displayName!: string;

  @ApiProperty({
    enum: ['PENDING_PURCHASE', 'QUALIFIED'],
    description: 'Estado del referral en lenguaje cliente.',
  })
  status!: ReferralHistoryStatus;

  @ApiProperty({
    description: 'Tickets de sorteo otorgados por este referral (0 o 1).',
  })
  ticketsAwarded!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  rewardedAt!: Date | null;
}

export class ReferralMeResponseDto {
  @ApiProperty({
    description: 'Código único del usuario (PCLUB-XXXXXX).',
    example: 'PCLUB-X8K2M7',
  })
  referralCode!: string;

  @ApiProperty({
    description: 'URL lista para compartir.',
    example: 'https://purpura.club/register?ref=PCLUB-X8K2M7',
  })
  referralUrl!: string;

  @ApiProperty({ type: () => ReferralStatsDto })
  stats!: ReferralStatsDto;

  @ApiProperty({
    type: () => ReferralHistoryItemDto,
    isArray: true,
    description: 'Historial reciente (máx 50, orden DESC por createdAt).',
  })
  history!: ReferralHistoryItemDto[];
}
