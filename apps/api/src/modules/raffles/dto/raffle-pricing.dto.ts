import { ApiProperty } from '@nestjs/swagger';

/**
 * F2.7-B — Bloque "pricing" resuelto por usuario que se adjunta a cada
 * RaffleResponseDto. La fuente única de verdad es `RafflePricingService`.
 */
export class RafflePricingDto {
  @ApiProperty({
    example: 10,
    description: 'Precio público del ticket (Raffle.ticketPrice).',
  })
  publicPrice!: number;

  @ApiProperty({
    example: 5,
    description:
      'Precio para socios Púrpura Club. Siempre 50 % del precio público (regla fija).',
  })
  memberPrice!: number;

  @ApiProperty({
    example: 5,
    description:
      'Precio que se cobraría al solicitante (memberPrice si es socio activo, publicPrice si no).',
  })
  applicablePrice!: number;

  @ApiProperty({
    example: 50,
    description: 'Porcentaje de ahorro del precio socio sobre el público.',
  })
  savingPercentage!: number;

  @ApiProperty({
    example: 5,
    description: 'Monto absoluto de ahorro (publicPrice - memberPrice).',
  })
  savingAmount!: number;

  @ApiProperty({
    example: true,
    description: 'Si el solicitante tiene membresía activa en el momento.',
  })
  isMember!: boolean;

  @ApiProperty({
    enum: ['PUBLIC', 'MEMBER'],
    example: 'MEMBER',
    description: 'Indica qué precio aplica: el público o el de socio.',
  })
  source!: 'PUBLIC' | 'MEMBER';
}
