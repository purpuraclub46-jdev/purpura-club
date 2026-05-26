import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerDocumentType, CustomerGender } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Acepta dígitos con un + opcional al inicio, entre 7 y 20 caracteres.
const PHONE_REGEX = /^\+?\d[\d\s-]{6,20}$/;
// DNI peruano = 8 dígitos; CE = hasta 12. Aceptamos 6-20 alfanuméricos
// para no romper documentos extranjeros futuros.
const DNI_REGEX = /^[A-Za-z0-9]{6,20}$/;
// RUC peruano = 11 dígitos numéricos. Validación de check digit se hace en
// el service (document-validators.ts).
const RUC_REGEX = /^\d{11}$/;

export class CreateCustomerDto {
  @ApiProperty({ example: 'María', maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Pérez', maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional({ example: 'maria.perez@correo.com', format: 'email' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim().toLowerCase();
    return v === '' ? undefined : v;
  })
  @IsEmail({}, { message: 'email debe tener un formato válido' })
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: '+51 987 654 321' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    return v === '' ? undefined : v;
  })
  @IsString()
  @Matches(PHONE_REGEX, {
    message: 'teléfono debe contener solo dígitos, espacios o guiones (7-20)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: '70123456' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim().toUpperCase();
    return v === '' ? undefined : v;
  })
  @IsString()
  @Matches(DNI_REGEX, {
    message: 'DNI debe ser alfanumérico (6-20 caracteres)',
  })
  dni?: string;

  // ─── Datos fiscales (SUNAT Perú) ────────────────────────────────────
  @ApiPropertyOptional({
    enum: CustomerDocumentType,
    enumName: 'CustomerDocumentType',
    description:
      'Tipo de documento fiscal. DNI por defecto (persona natural). RUC requiere razón social y dirección fiscal.',
  })
  @IsOptional()
  @IsEnum(CustomerDocumentType)
  documentType?: CustomerDocumentType;

  @ApiPropertyOptional({
    example: '20512345678',
    description:
      'RUC del cliente (11 dígitos). Requerido para emitir facturas. Validación de check digit en el backend.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    return v === '' ? undefined : v;
  })
  @IsString()
  @Matches(RUC_REGEX, { message: 'RUC debe tener 11 dígitos numéricos' })
  ruc?: string;

  @ApiPropertyOptional({
    example: 'Comercializadora Aurora S.A.C.',
    maxLength: 200,
    description:
      'Razón social (para facturas) o nombre legal completo. Si se omite, se usa firstName + lastName.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    return v === '' ? undefined : v;
  })
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({
    example: 'Av. Javier Prado Este 1234, San Isidro, Lima',
    maxLength: 300,
    description: 'Dirección fiscal (obligatoria para facturas SUNAT).',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    return v === '' ? undefined : v;
  })
  @IsString()
  @MaxLength(300)
  fiscalAddress?: string;

  @ApiPropertyOptional({ type: String, format: 'date', example: '1995-04-21' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: CustomerGender, enumName: 'CustomerGender' })
  @IsOptional()
  @IsEnum(CustomerGender)
  gender?: CustomerGender;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description:
      'Sucursal de captación. Útil en POS — los usuarios de sucursal solo ven clientes de su ubicación.',
  })
  @IsOptional()
  @IsUUID()
  primaryLocationId?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    description:
      'Si se enlaza a una cuenta de autenticación existente. El email/DNI del User no se copia automáticamente.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
