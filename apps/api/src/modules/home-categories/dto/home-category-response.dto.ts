import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HomeCategorySlot } from '@prisma/client';

export class HomeCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: HomeCategorySlot, enumName: 'HomeCategorySlot' })
  slot!: HomeCategorySlot;

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  eyebrow!: string | null;

  @ApiProperty({ example: 'Joyas' })
  label!: string;

  @ApiProperty({ example: '/shop?category=joyas' })
  ctaHref!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  imageDesktop!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  imageMobile!: string | null;

  @ApiProperty({ example: '#0A0A0A' })
  overlayColor!: string;

  @ApiProperty({ example: 35, minimum: 0, maximum: 100 })
  overlayOpacity!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
