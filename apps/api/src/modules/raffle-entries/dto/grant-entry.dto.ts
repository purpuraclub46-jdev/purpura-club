import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntryType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export class GrantEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  raffleId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number = 1;

  @ApiProperty({
    enum: EntryType,
    enumName: 'EntryType',
    description:
      'Origin of the granted entry. Use PURCHASE_REWARD / REFERRAL / BONUS for back-office grants.',
    example: EntryType.BONUS,
  })
  @IsEnum(EntryType)
  type!: EntryType;
}
