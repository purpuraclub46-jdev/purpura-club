import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryMovementType } from '@prisma/client';

export class InventoryRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  branchId!: string;

  @ApiProperty()
  branchName!: string;

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
  availableStock!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedInventoryResponseDto {
  @ApiProperty({ type: [InventoryRowDto] })
  items!: InventoryRowDto[];

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
  branchId!: string;

  @ApiProperty()
  branchName!: string;

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
