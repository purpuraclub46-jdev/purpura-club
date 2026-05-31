import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RaffleStatus, RaffleVisibility } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateRaffleDto {
  @ApiProperty({
    example: 'Sorteo iPhone 15 Pro',
    minLength: 3,
    maxLength: 200,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description:
      'URL-friendly slug. Auto-generated from `title` when omitted. Lowercase letters, digits and dashes only.',
    example: 'sorteo-iphone-15-pro',
    minLength: 3,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(SLUG_REGEX, {
    message:
      'slug must contain only lowercase letters, digits and single dashes (no leading/trailing dashes)',
  })
  slug?: string;

  @ApiProperty({
    example: 'Detalle completo del sorteo, condiciones y premio.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(10_000)
  description!: string;

  @ApiPropertyOptional({ description: 'Banner image URL', format: 'uri' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  bannerImage?: string;

  @ApiPropertyOptional({ description: 'Prize image URL', format: 'uri' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  prizeImage?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Countdown target — usually equal to the draw date.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  countdown?: Date;

  @ApiProperty({
    example: 25,
    minimum: 0,
    description: 'Public ticket price in PEN.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  ticketPrice!: number;

  /**
   * @deprecated F2.7-B — El precio socio es siempre 50 % del público; el
   * backend lo calcula automáticamente. Si el caller lo envía, se ignora.
   * Se mantiene como opcional únicamente para no romper integraciones
   * legacy (admin panel viejo).
   */
  @ApiPropertyOptional({
    example: 5,
    minimum: 0,
    deprecated: true,
    description:
      'DEPRECATED — Ignorado por el backend. El precio socio = round2(ticketPrice * 0.5).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  memberTicketPrice?: number;

  @ApiProperty({
    example: 500,
    minimum: 1,
    description: 'Total tickets in the raffle.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  totalTickets!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @ApiPropertyOptional({
    enum: RaffleStatus,
    enumName: 'RaffleStatus',
    default: RaffleStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(RaffleStatus)
  status?: RaffleStatus;

  @ApiPropertyOptional({
    enum: RaffleVisibility,
    enumName: 'RaffleVisibility',
    default: RaffleVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(RaffleVisibility)
  visibility?: RaffleVisibility;
}
