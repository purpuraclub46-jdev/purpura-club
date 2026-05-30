import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerDocumentType, CustomerGender } from '@prisma/client';

/**
 * Resumen del Customer asociado al User autenticado.
 *
 * Embebido en `AuthUserDto.customerProfile` y devuelto por:
 *   - GET /auth/me
 *   - POST /auth/register (immediately after creation)
 *   - POST /auth/login
 *   - POST /auth/refresh
 *
 * Campos NO incluidos a propósito:
 *   - `notes`: nota interna CRM, no debe filtrarse al cliente.
 *   - `userId`: redundante con el parent (AuthUserDto.id).
 *   - `email`: redundante con AuthUserDto.email (User es source of truth
 *     para login; Customer.email puede divergir y se reconcilia en checkout).
 *   - `active`: si el Customer está inactivo, el cliente no debería
 *     autenticarse (validación a futuro).
 *   - `createdAt`/`updatedAt`: no útiles para UI cliente.
 *
 * Backward compatibility: el campo `customerProfile` en `AuthUserDto` es
 * opcional y nullable. Consumers que lo ignoren siguen funcionando.
 */
export class CustomerProfileSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ example: 'Jane Doe' })
  fullName!: string;

  @ApiPropertyOptional({ nullable: true, example: '+51 987 654 321' })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '72345678' })
  dni!: string | null;

  @ApiProperty({
    enum: CustomerDocumentType,
    enumName: 'CustomerDocumentType',
    example: CustomerDocumentType.DNI,
  })
  documentType!: CustomerDocumentType;

  @ApiPropertyOptional({
    nullable: true,
    description: 'RUC (11 dígitos). Presente si el cliente puede recibir factura.',
    example: '20498123456',
  })
  ruc!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Razón social — para facturas. En personas naturales = nombre legal.',
  })
  legalName!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Dirección fiscal (requerida para facturas SUNAT).',
  })
  fiscalAddress!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
  })
  birthDate!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: CustomerGender,
    enumName: 'CustomerGender',
  })
  gender!: CustomerGender | null;

  @ApiProperty({
    description: 'Cache denormalizada del status de membership Club Púrpura.',
  })
  isMember!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
    description: 'Fecha de expiración de la membership activa.',
  })
  membershipExpiresAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description: 'Sucursal de captación (POS). Null = ecommerce o sin asignar.',
  })
  primaryLocationId!: string | null;
}
