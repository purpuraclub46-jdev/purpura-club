import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HomeBannerAlign, HomeBannerSlot } from '@prisma/client';

export class HomeBannerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: HomeBannerSlot, enumName: 'HomeBannerSlot' })
  slot!: HomeBannerSlot;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  eyebrow!: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  subtitle!: string | null;

  @ApiProperty({ example: 'Ver productos' })
  ctaLabel!: string;

  @ApiProperty({ example: '/shop?category=joyas' })
  ctaHref!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  imageDesktop!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  imageMobile!: string | null;

  @ApiProperty({ example: '#0A0A0A' })
  overlayColor!: string;

  @ApiProperty({ example: 45, minimum: 0, maximum: 100 })
  overlayOpacity!: number;

  @ApiProperty({ enum: HomeBannerAlign, enumName: 'HomeBannerAlign' })
  align!: HomeBannerAlign;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
