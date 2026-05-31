import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

// DNI peruano: exactamente 8 dígitos. Para CE/PASSPORT el cliente edita
// `documentType` desde /mi-cuenta/perfil después del registro.
const DNI_REGEX = /^\d{8}$/;

// Teléfono permisivo: dígitos, espacios, guiones y prefijo opcional "+".
// Validación estricta de formato vive en el flujo de checkout, no en registro.
const PHONE_REGEX = /^[+\d][\d\s\-()]{5,29}$/;

// F2.7-C — Código de referido: formato PCLUB-XXXXXX (6 chars del alfabeto
// sin ambigüedad). Normalizado a uppercase en el service. La regex es
// case-insensitive a propósito para tolerar el copy-paste del usuario.
const REFERRAL_CODE_DTO_REGEX = /^PCLUB-[A-HJKMNP-Za-hjkmnp-z2-9]{6}$/;

export class RegisterDto {
  @ApiProperty({
    description: 'User email — must be unique',
    example: 'jane.doe@example.com',
    format: 'email',
    maxLength: 254,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description:
      'Strong password — minimum 8 characters, at least one uppercase, one lowercase, one digit and one special character',
    example: 'S3cure!P@ssword',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, one digit and one special character',
  })
  password!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Jane',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  // ─── Campos opcionales para dedupe + sync Customer ────────────────────
  //
  // El registro acepta DNI y teléfono de forma OPCIONAL. Si vienen, se
  // copian al perfil Customer y habilitan el auto-link con cualquier
  // Customer walk-in pre-existente que comparta DNI (FASE 1, CRÍTICO #1).
  // Si no vienen, se crea un Customer vacío de DNI — el cliente puede
  // completarlo más tarde desde /mi-cuenta/perfil.

  @ApiPropertyOptional({
    description:
      'DNI peruano (8 dígitos). Si coincide con un Customer walk-in existente sin cuenta, se enlaza automáticamente.',
    example: '72345678',
    pattern: '^\\d{8}$',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(DNI_REGEX, { message: 'dni must be exactly 8 digits' })
  dni?: string;

  @ApiPropertyOptional({
    description: 'Teléfono de contacto (opcional, sin formato estricto).',
    example: '+51 987 654 321',
    minLength: 6,
    maxLength: 30,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  @Matches(PHONE_REGEX, {
    message: 'phone must contain only digits, spaces, dashes and parentheses',
  })
  phone?: string;

  // ─── F2.7-C — Programa de referidos ───────────────────────────────────
  //
  // R1 — Soft-fail policy: si el código viene presente y la regex no
  // matchea, validamos en DTO (devolvemos 400 por DTO inválido). Pero si
  // la regex SÍ matchea y el código no existe en BD, el AuthService NO
  // rechaza el registro — solo loguea warning y procede sin linkage.
  //
  // El front siempre envía el código normalizado a uppercase; aquí también
  // aceptamos minúsculas para tolerar manipulación del usuario.

  @ApiPropertyOptional({
    description:
      'Código de referido del invitador (PCLUB-XXXXXX). Si es inválido o no existe, el registro continúa sin linkage (R1).',
    example: 'PCLUB-X8K2M7',
    pattern: '^PCLUB-[A-HJKMNP-Z2-9]{6}$',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(REFERRAL_CODE_DTO_REGEX, {
    message: 'referralCode must match PCLUB-XXXXXX format',
  })
  referralCode?: string;
}
