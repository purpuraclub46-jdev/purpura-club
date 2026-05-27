import { ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Update admin: solo permite cambiar estado, respuesta oficial y notas
 * internas. Los datos del consumidor son INMUTABLES por el formulario
 * (intencional — el Libro de Reclamaciones requiere preservar el registro
 * original tal como fue presentado).
 */
export class UpdateComplaintDto {
  @ApiPropertyOptional({ enum: ComplaintStatus, enumName: 'ComplaintStatus' })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @ApiPropertyOptional({
    description:
      'Respuesta oficial al consumidor. Se envía/imprime tal cual. Texto plano.',
    maxLength: 4000,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(4000)
  response?: string;

  @ApiPropertyOptional({
    description: 'Notas internas — no se comparten con el consumidor.',
    maxLength: 2000,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;
}
