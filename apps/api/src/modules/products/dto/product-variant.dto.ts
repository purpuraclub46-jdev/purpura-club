import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ProductVariantInputDto {
  @ApiProperty({ example: 'Material', maxLength: 60 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiProperty({ example: 'Acero Dorado', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  value!: string;
}

export class ProductVariantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  value!: string;
}
