import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateHomeCategoryDto {
  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 99 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 'Joyería', maxLength: 60 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(60)
  eyebrow?: string;

  @ApiPropertyOptional({ example: 'Joyas', minLength: 1, maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label?: string;

  @ApiPropertyOptional({
    example: '/shop?category=joyas',
    description:
      'Ruta relativa (empieza con /) o URL absoluta http(s). Validado en service.',
    maxLength: 500,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  ctaHref?: string;

  @ApiPropertyOptional({
    description: 'URL absoluta HTTPS de la imagen para desktop.',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  imageDesktop?: string;

  @ApiPropertyOptional({
    description: 'URL absoluta HTTPS de la imagen para mobile.',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  imageMobile?: string;

  @ApiPropertyOptional({ example: '#0A0A0A' })
  @IsOptional()
  @IsHexColor()
  overlayColor?: string;

  @ApiPropertyOptional({ example: 35, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  overlayOpacity?: number;
}
