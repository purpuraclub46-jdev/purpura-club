import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUrl, MaxLength, Min } from 'class-validator';

export class ProductImageInputDto {
  @ApiProperty({ format: 'uri' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  url!: string;

  @ApiProperty({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order: number = 0;
}

export class ProductImageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  order!: number;
}
