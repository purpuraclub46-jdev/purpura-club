import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Búsqueda optimizada para el POS. Devuelve resultados livianos (sin stats)
 * filtrando por nombre/email/teléfono/DNI con un solo término.
 */
export class CustomerSearchDto {
  @ApiPropertyOptional({ description: 'Término libre — busca en nombre, email, DNI o teléfono.' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
