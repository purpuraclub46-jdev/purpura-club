import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryGroup } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Collares', minLength: 2, maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug. Auto-generated when omitted.',
    example: 'collares',
    minLength: 2,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(SLUG_REGEX, {
    message:
      'slug must contain only lowercase letters, digits and single dashes',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Imagen de la categoría', format: 'uri' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  image?: string;

  @ApiProperty({
    enum: CategoryGroup,
    enumName: 'CategoryGroup',
    default: CategoryGroup.JOYERIA,
  })
  @IsEnum(CategoryGroup)
  group: CategoryGroup = CategoryGroup.JOYERIA;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Id de la categoría padre (para jerarquía).',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
