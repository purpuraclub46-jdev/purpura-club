import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHomeStoreDto {
  @ApiProperty({ example: 'Plaza del Sol — Ica', minLength: 1, maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'Ica', minLength: 1, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city!: string;

  @ApiProperty({
    example: 'Av. Cutervo 132, Ica',
    minLength: 1,
    maxLength: 240,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  address!: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(240)
  reference?: string;

  @ApiPropertyOptional({
    example: '+51999111222',
    description: 'Número con código país. Solo dígitos y opcional + inicial.',
    maxLength: 32,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(32)
  whatsapp?: string;

  @ApiPropertyOptional({
    example: 'Lun a sáb · 10:00 – 22:00',
    maxLength: 160,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(160)
  schedule?: string;

  @ApiPropertyOptional({
    description: 'URL de Google Maps para "Cómo llegar".',
    format: 'uri',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  mapsUrl?: string;

  @ApiPropertyOptional({
    description: 'URL absoluta HTTPS de la imagen para desktop.',
    format: 'uri',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  imageDesktop?: string;

  @ApiPropertyOptional({
    description: 'URL absoluta HTTPS de la imagen para mobile.',
    format: 'uri',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  imageMobile?: string;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
