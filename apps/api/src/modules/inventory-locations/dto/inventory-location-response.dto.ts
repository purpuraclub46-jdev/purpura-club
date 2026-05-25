import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryLocationType } from '@prisma/client';

export class InventoryLocationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({
    enum: InventoryLocationType,
    enumName: 'InventoryLocationType',
  })
  type!: InventoryLocationType;

  @ApiPropertyOptional({ type: String, nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ description: 'Cantidad de productos con stock registrado' })
  productsTracked!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedInventoryLocationsResponseDto {
  @ApiProperty({ type: [InventoryLocationResponseDto] })
  items!: InventoryLocationResponseDto[];

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
