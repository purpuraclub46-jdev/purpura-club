import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomeStoreResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Plaza del Sol — Ica' })
  name!: string;

  @ApiProperty({ example: 'Ica' })
  city!: string;

  @ApiProperty({ example: 'Av. Cutervo 132' })
  address!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  reference!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  whatsapp!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  schedule!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  mapsUrl!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  imageDesktop!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  imageMobile!: string | null;

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
