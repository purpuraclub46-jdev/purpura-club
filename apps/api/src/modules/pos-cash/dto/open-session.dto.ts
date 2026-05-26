import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class OpenSessionDto {
  @ApiPropertyOptional({
    description:
      'ID de la caja. Si se omite, se usa la caja principal de la sucursal del usuario.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  cashRegisterId?: string;

  @ApiProperty({
    description: 'Monto inicial en efectivo declarado al abrir la caja.',
    example: 100,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  openingAmount!: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;
}
