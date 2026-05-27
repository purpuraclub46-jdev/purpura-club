import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ComplaintDocumentType,
  ComplaintSubjectType,
  ComplaintType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Payload de presentación de un reclamo desde el storefront. Es el formulario
 * que el consumidor llena en `/libro-de-reclamaciones`. Una vez aceptado se
 * vuelve INMUTABLE — el admin solo puede actualizar `status`, `response` y
 * `internalNotes` vía {@link UpdateComplaintDto}.
 *
 * Los campos del guardian son requeridos cuando `isMinor=true` (validado en
 * el service para que la regla viva cerca del dominio, no esparcida en
 * decoradores).
 */
export class CreateComplaintDto {
  // ─── Consumidor ─────────────────────────────────

  @ApiProperty({ example: 'María' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional({
    enum: ComplaintDocumentType,
    enumName: 'ComplaintDocumentType',
    default: 'DNI',
  })
  @IsOptional()
  @IsEnum(ComplaintDocumentType)
  documentType?: ComplaintDocumentType;

  @ApiProperty({ example: '76543210' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  documentNumber!: string;

  @ApiProperty({ example: '+51 999 999 999' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  phone!: string;

  @ApiProperty({ example: 'maria@correo.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(120)
  email!: string;

  @ApiProperty({ example: 'Av. Larco 123, Miraflores, Lima' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(4)
  @MaxLength(240)
  address!: string;

  // ─── Menor de edad ──────────────────────────────

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMinor?: boolean;

  @ApiPropertyOptional({ example: 'Carmen Rosa Pérez' })
  @ValidateIf((o: CreateComplaintDto) => o.isMinor === true)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  guardianFullName?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @ValidateIf((o: CreateComplaintDto) => o.isMinor === true)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  guardianDocument?: string;

  // ─── Detalle del reclamo ────────────────────────

  @ApiProperty({ enum: ComplaintType, enumName: 'ComplaintType' })
  @IsEnum(ComplaintType)
  type!: ComplaintType;

  @ApiProperty({
    enum: ComplaintSubjectType,
    enumName: 'ComplaintSubjectType',
  })
  @IsEnum(ComplaintSubjectType)
  subjectType!: ComplaintSubjectType;

  @ApiProperty({ example: 'Collar Eternidad Acero Dorado (SKU CL-0042)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subjectDetail!: string;

  @ApiPropertyOptional({
    example: 149.9,
    description: 'Monto reclamado en soles (decimal con 2 dígitos).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @ApiProperty({
    example: 'El producto llegó con una pieza rota y no responde el servicio postventa.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({
    example: 'Solicito el reemplazo del producto o la devolución íntegra del monto.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  consumerRequest!: string;
}
