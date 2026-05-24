import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BranchResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ description: 'Cantidad de productos con stock asignado' })
  productsTracked!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedBranchesResponseDto {
  @ApiProperty({ type: [BranchResponseDto] })
  items!: BranchResponseDto[];

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
