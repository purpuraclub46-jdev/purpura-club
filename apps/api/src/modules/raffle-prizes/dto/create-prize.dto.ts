import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePrizeDto {
  @ApiProperty({ example: 'iPhone 16 Pro Max' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 10_000 })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  description?: string;

  @ApiPropertyOptional({
    description: 'URL pública de la foto del premio.',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;

  @ApiProperty({
    minimum: 1,
    description: 'Posición del premio (1° lugar, 2° lugar, etc.).',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;
}
