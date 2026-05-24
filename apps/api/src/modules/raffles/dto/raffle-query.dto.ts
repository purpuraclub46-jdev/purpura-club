import { ApiPropertyOptional } from '@nestjs/swagger';
import { RaffleStatus, RaffleVisibility } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum RaffleTimeFilter {
  UPCOMING = 'upcoming',
  PAST = 'past',
  ALL = 'all',
}

export class RaffleQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    enum: RaffleTimeFilter,
    default: RaffleTimeFilter.UPCOMING,
    description: 'Filter by time relative to now',
  })
  @IsOptional()
  @IsEnum(RaffleTimeFilter)
  timeFilter: RaffleTimeFilter = RaffleTimeFilter.UPCOMING;

  @ApiPropertyOptional({
    description: 'Free-text search on title',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class AdminRaffleQueryDto extends RaffleQueryDto {
  @ApiPropertyOptional({ enum: RaffleStatus, enumName: 'RaffleStatus' })
  @IsOptional()
  @IsEnum(RaffleStatus)
  status?: RaffleStatus;

  @ApiPropertyOptional({ enum: RaffleVisibility, enumName: 'RaffleVisibility' })
  @IsOptional()
  @IsEnum(RaffleVisibility)
  visibility?: RaffleVisibility;
}
