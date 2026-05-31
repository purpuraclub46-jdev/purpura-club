import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AddressType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Crear una dirección del cliente autenticado.
 *
 * Validaciones:
 *  - recipientName/phone obligatorios (envío B2C requiere receptor).
 *  - street/number/district/province/region obligatorios.
 *  - countryCode 2 chars ISO (default PE).
 *  - isDefault opcional; si true, el service lo promueve atómicamente
 *    desmarcando la anterior default del mismo `type`.
 */
export class CreateAddressDto {
  @ApiPropertyOptional({
    enum: AddressType,
    enumName: 'AddressType',
    default: AddressType.SHIPPING,
    example: AddressType.SHIPPING,
  })
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @ApiPropertyOptional({ maxLength: 60, example: 'Casa' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @ApiProperty({ maxLength: 120, example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  recipientName!: string;

  @ApiProperty({ maxLength: 20, example: '+51 987 654 321' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  recipientPhone!: string;

  @ApiProperty({ maxLength: 200, example: 'Av. Javier Prado Este' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  street!: string;

  @ApiProperty({ maxLength: 20, example: '1234' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number!: string;

  @ApiPropertyOptional({ maxLength: 60, example: 'Dpto 502' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  apartment?: string;

  @ApiProperty({ maxLength: 80, example: 'San Isidro' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  district!: string;

  @ApiProperty({ maxLength: 80, example: 'Lima' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  province!: string;

  @ApiProperty({ maxLength: 80, example: 'Lima' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  region!: string;

  @ApiPropertyOptional({
    description: 'Código ISO 3166-1 alpha-2. Default PE.',
    minLength: 2,
    maxLength: 2,
    example: 'PE',
    default: 'PE',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional({
    maxLength: 240,
    example: 'Edificio azul, frente al parque',
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reference?: string;

  @ApiPropertyOptional({
    description:
      'Si true, esta dirección se marca como principal de su tipo. La default anterior se desmarca atómicamente.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDefault?: boolean;
}

/**
 * PATCH parcial. Todos los campos son opcionales.
 * isDefault=true vía PATCH dispara la misma promoción atómica que en create.
 */
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}

export class AddressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AddressType, enumName: 'AddressType' })
  type!: AddressType;

  @ApiPropertyOptional({ nullable: true })
  label!: string | null;

  @ApiProperty()
  recipientName!: string;

  @ApiProperty()
  recipientPhone!: string;

  @ApiProperty()
  street!: string;

  @ApiProperty()
  number!: string;

  @ApiPropertyOptional({ nullable: true })
  apartment!: string | null;

  @ApiProperty()
  district!: string;

  @ApiProperty()
  province!: string;

  @ApiProperty()
  region!: string;

  @ApiProperty({ example: 'PE' })
  countryCode!: string;

  @ApiPropertyOptional({ nullable: true })
  reference!: string | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
