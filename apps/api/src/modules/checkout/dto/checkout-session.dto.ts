import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderPaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CheckoutItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateCheckoutSessionDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'CustomerAddress.id de la dirección de envío. Debe pertenecer al cliente autenticado.',
  })
  @IsUUID()
  shippingAddressId!: string;

  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @ApiPropertyOptional({
    enum: OrderPaymentMethod,
    enumName: 'OrderPaymentMethod',
    default: OrderPaymentMethod.MERCADOPAGO,
    description: 'Método de pago. Hoy F2.6-A solo MERCADOPAGO.',
  })
  @IsOptional()
  @IsEnum(OrderPaymentMethod)
  paymentMethod?: OrderPaymentMethod;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckoutSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ example: 'PC-20260530-A1B2C3' })
  orderNumber!: string;

  @ApiProperty({
    enum: ['REDIRECT', 'PENDING_SETUP', 'UNSUPPORTED'],
    description:
      'REDIRECT: cliente debe ir a redirectUrl. PENDING_SETUP: pasarela en configuración (orden registrada pero sin link de pago). UNSUPPORTED: provider rechazó la sesión.',
  })
  verdict!: 'REDIRECT' | 'PENDING_SETUP' | 'UNSUPPORTED';

  @ApiPropertyOptional({ type: String, nullable: true })
  redirectUrl!: string | null;

  @ApiProperty({ example: 'NOT_CONFIGURED' })
  provider!: string;

  @ApiProperty({ enum: ['sandbox', 'production', 'none'] })
  mode!: 'sandbox' | 'production' | 'none';

  @ApiProperty()
  message!: string;
}
