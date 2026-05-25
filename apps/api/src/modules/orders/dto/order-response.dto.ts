import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryLocationType,
  OrderPaymentMethod,
  OrderStatus,
} from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  productSku!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  subtotal!: number;
}

export class OrderCustomerRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;
}

export class OrderLocationRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    enum: InventoryLocationType,
    enumName: 'InventoryLocationType',
  })
  type!: InventoryLocationType;
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  number!: string;

  @ApiPropertyOptional({ type: OrderCustomerRefDto, nullable: true })
  customer!: OrderCustomerRefDto | null;

  @ApiPropertyOptional({ type: OrderLocationRefDto, nullable: true })
  location!: OrderLocationRefDto | null;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  discount!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ enum: OrderPaymentMethod, enumName: 'OrderPaymentMethod' })
  paymentMethod!: OrderPaymentMethod;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items!: OrderResponseDto[];

  @ApiProperty()
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
