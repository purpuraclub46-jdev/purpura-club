import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PrizeWinnerRefDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  dni!: string | null;

  @ApiProperty()
  ticketNumber!: number;
}

export class PrizeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  raffleId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  image!: string | null;

  @ApiProperty()
  position!: number;

  @ApiPropertyOptional({
    type: () => PrizeWinnerRefDto,
    nullable: true,
    description: 'Ganador asignado (puede no estar publicado aún).',
  })
  winner!: PrizeWinnerRefDto | null;

  @ApiProperty({
    description:
      'true si el ganador fue publicado oficialmente (con foto/video/comunicado).',
  })
  winnerPublished!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  winnerPhoto!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  winnerVideo!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  winnerAnnouncement!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  publishedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
