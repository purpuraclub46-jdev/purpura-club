import { ApiPropertyOptional } from '@nestjs/swagger';
import { EntryStatus, EntryType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class EntryQueryDto {
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

  @ApiPropertyOptional({ enum: EntryStatus, enumName: 'EntryStatus' })
  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;

  @ApiPropertyOptional({ enum: EntryType, enumName: 'EntryType' })
  @IsOptional()
  @IsEnum(EntryType)
  type?: EntryType;

  @ApiPropertyOptional({ enum: PaymentMethod, enumName: 'PaymentMethod' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by raffle id' })
  @IsOptional()
  @IsUUID()
  raffleId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by user id (admin only)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
