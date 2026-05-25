import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryGroup } from '@prisma/client';

export class CategoryParentRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  image!: string | null;

  @ApiProperty({ enum: CategoryGroup, enumName: 'CategoryGroup' })
  group!: CategoryGroup;

  @ApiProperty()
  order!: number;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  parentId!: string | null;

  @ApiPropertyOptional({ type: CategoryParentRefDto, nullable: true })
  parent!: CategoryParentRefDto | null;

  @ApiProperty({ description: 'Número de hijos directos' })
  childrenCount!: number;

  @ApiProperty({ description: 'Número de productos asociados' })
  productsCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedCategoriesResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  items!: CategoryResponseDto[];

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
