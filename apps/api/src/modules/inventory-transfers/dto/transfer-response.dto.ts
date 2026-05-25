import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InventoryLocationType,
  InventoryTransferStatus,
} from '@prisma/client';

export class TransferLocationRefDto {
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

export class TransferItemResponseDto {
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
}

export class TransferResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty({ type: TransferLocationRefDto })
  fromLocation!: TransferLocationRefDto;

  @ApiProperty({ type: TransferLocationRefDto })
  toLocation!: TransferLocationRefDto;

  @ApiProperty({
    enum: InventoryTransferStatus,
    enumName: 'InventoryTransferStatus',
  })
  status!: InventoryTransferStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  createdByUserName!: string | null;

  @ApiProperty({ type: [TransferItemResponseDto] })
  items!: TransferItemResponseDto[];

  @ApiProperty({ description: 'Suma de cantidades de todos los ítems' })
  totalQuantity!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  completedAt!: Date | null;
}

export class PaginatedTransfersResponseDto {
  @ApiProperty({ type: [TransferResponseDto] })
  items!: TransferResponseDto[];

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
