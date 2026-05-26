import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CustomerQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;

  @ApiPropertyOptional({
    description: 'Búsqueda parcial por nombre, email, teléfono o DNI.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  // `@Type(() => String)` neutraliza el `enableImplicitConversion` de la
  // ValidationPipe — class-transformer 0.5.1 coerce "false" a `true` con
  // Boolean(value) cuando el tipo TS es boolean. Con el override de tipo el
  // @Transform de abajo recibe el string crudo y lo interpreta correctamente.
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Solo miembros (true) o solo no miembros (false).' })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  isMember?: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description: 'Filtrar por sucursal de captación.',
  })
  @IsOptional()
  @IsUUID()
  primaryLocationId?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  registeredFrom?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  registeredTo?: string;

  @ApiPropertyOptional({
    description: 'Monto mínimo gastado por el cliente (se evalúa al post-procesar).',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minSpent?: number;
}
