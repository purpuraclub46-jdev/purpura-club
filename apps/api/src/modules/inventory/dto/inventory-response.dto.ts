import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryLocationType,
  InventoryMovementType,
} from '@prisma/client';

export class StockRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  inventoryLocationId!: string;

  @ApiProperty()
  locationName!: string;

  @ApiProperty({
    enum: InventoryLocationType,
    enumName: 'InventoryLocationType',
  })
  locationType!: InventoryLocationType;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  productSku!: string;

  @ApiProperty()
  stock!: number;

  @ApiProperty()
  reservedStock!: number;

  @ApiProperty()
  minimumStock!: number;

  @ApiProperty({ description: 'stock - reservedStock' })
  availableStock!: number;

  @ApiProperty({
    description: 'Estado: OK, LOW (≤ mínimo) o OUT_OF_STOCK.',
  })
  stockLevel!: 'OK' | 'LOW' | 'OUT_OF_STOCK';

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedStockResponseDto {
  @ApiProperty({ type: [StockRowDto] })
  items!: StockRowDto[];

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

export class InventoryMovementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  inventoryLocationId!: string;

  @ApiProperty()
  locationName!: string;

  @ApiProperty({
    enum: InventoryLocationType,
    enumName: 'InventoryLocationType',
  })
  locationType!: InventoryLocationType;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  productSku!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: InventoryMovementType, enumName: 'InventoryMovementType' })
  type!: InventoryMovementType;

  @ApiPropertyOptional({ type: String, nullable: true })
  reason!: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  transferId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  transferNumber!: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  createdByUserName!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class PaginatedMovementsResponseDto {
  @ApiProperty({ type: [InventoryMovementResponseDto] })
  items!: InventoryMovementResponseDto[];

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
