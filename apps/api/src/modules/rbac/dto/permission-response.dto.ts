import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'inventory.view' })
  key!: string;

  @ApiProperty({ example: 'Ver inventario' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'Inventario' })
  module!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
