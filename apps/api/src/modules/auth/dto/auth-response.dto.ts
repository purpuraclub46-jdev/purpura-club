import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CustomerProfileSummaryDto } from './customer-profile-summary.dto';

export class AuthUserLocationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class AuthUserRoleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin_sucursal' })
  slug!: string;

  @ApiProperty({ example: 'Administrador de Sucursal' })
  name!: string;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.USER })
  role!: Role;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional({ type: AuthUserLocationDto, nullable: true })
  location!: AuthUserLocationDto | null;

  @ApiProperty({ type: [AuthUserRoleDto] })
  roles!: AuthUserRoleDto[];

  @ApiProperty({
    type: [String],
    description:
      'Claves de permisos efectivos. Contiene "*" si el usuario es SUPER_ADMIN.',
  })
  permissions!: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  // FASE 1 / D3: Customer asociado al User (CRM perfil comercial).
  //
  // - `null` si el User no tiene Customer linkeado (caso defensivo: Users
  //   creados antes del backfill FASE 1). Post-FASE 1, todo User nuevo
  //   creado vía /auth/register tiene Customer obligatorio.
  // - Campo opcional → backward compatible. Consumers que lo ignoren
  //   siguen funcionando sin cambios.
  @ApiPropertyOptional({
    type: CustomerProfileSummaryDto,
    nullable: true,
    description:
      'Perfil Customer asociado. null si el User no tiene Customer (Users legacy pre-FASE 1).',
  })
  customerProfile?: CustomerProfileSummaryDto | null;
}

export class AuthTokensDto {
  @ApiProperty({
    description: 'Short-lived JWT access token (Bearer)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description:
      'Refresh token. Also issued as a secure HTTP-only cookie. Treat as a secret.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({
    description: 'Access token lifetime in seconds',
    example: 900,
  })
  expiresIn!: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;
}
