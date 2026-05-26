import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishWinnerDto {
  @ApiPropertyOptional({
    description: 'URL de la foto del ganador / entrega.',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  winnerPhoto?: string;

  @ApiPropertyOptional({
    description: 'URL del video del ganador / entrega.',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  winnerVideo?: string;

  @ApiPropertyOptional({
    description: 'Anuncio oficial / comentario / descripción de entrega.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  winnerAnnouncement?: string;
}
