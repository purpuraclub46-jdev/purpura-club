import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntryType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class PurchaseEntryDto {
  @ApiProperty({ format: 'uuid', description: 'Raffle to purchase entries for' })
  @IsUUID()
  @IsNotEmpty()
  raffleId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number = 1;

  @ApiProperty({
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    description:
      'Payment provider. Today only FREE is enabled; YAPE/MERCADOPAGO are scaffolded.',
    example: PaymentMethod.YAPE,
  })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    enum: EntryType,
    enumName: 'EntryType',
    default: EntryType.DIRECT_PURCHASE,
    description:
      'Origin of the entry. DIRECT_PURCHASE is the default; the other variants are created by other subsystems.',
  })
  @IsOptional()
  @IsEnum(EntryType)
  type?: EntryType;
}
