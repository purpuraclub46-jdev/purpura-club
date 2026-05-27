import { ApiPropertyOptional } from '@nestjs/swagger';
import { HomeBannerAlign } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
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

/// Payload de edición de un slot del home. Todos los campos son opcionales —
/// el cliente envía solo lo que cambió. Se valida en el service que el banner
/// resultante quede consistente (title y ctaLabel/ctaHref no vacíos).
export class UpdateHomeBannerDto {
  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 'Joyería atemporal', maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(80)
  eyebrow?: string;

  @ApiPropertyOptional({
    example: 'El detalle que distingue',
    minLength: 1,
    maxLength: 160,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ example: 'Subcopy descriptiva.', maxLength: 320 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(320)
  subtitle?: string;

  @ApiPropertyOptional({
    example: 'Ver productos',
    minLength: 1,
    maxLength: 40,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  ctaLabel?: string;

  @ApiPropertyOptional({
    example: '/shop?category=joyas',
    description:
      'Ruta relativa (empieza con /) o URL absoluta HTTPS. Validado en service.',
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

  @ApiPropertyOptional({ example: 45, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  overlayOpacity?: number;

  @ApiPropertyOptional({
    enum: HomeBannerAlign,
    enumName: 'HomeBannerAlign',
  })
  @IsOptional()
  @IsEnum(HomeBannerAlign)
  align?: HomeBannerAlign;
}
