import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role as AccessLevel } from '@prisma/client';

export class UserRoleSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin_sucursal' })
  slug!: string;

  @ApiProperty({ example: 'Administrador de Sucursal' })
  name!: string;
}

export class UserLocationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Purpura Store - Plaza del Sol ICA' })
  name!: string;

  @ApiProperty({ example: 'plaza-del-sol-ica' })
  slug!: string;
}

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'asesora.ica@purpura.club' })
  email!: string;

  @ApiProperty({ example: 'María' })
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  lastName!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  dni!: string | null;

  @ApiProperty({
    enum: AccessLevel,
    enumName: 'Role',
    description: 'Nivel de acceso legacy. Derivado del rol oficial principal.',
  })
  accessLevel!: AccessLevel;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastLoginAt!: Date | null;

  @ApiPropertyOptional({ type: UserLocationSummaryDto, nullable: true })
  location!: UserLocationSummaryDto | null;

  @ApiProperty({ type: [UserRoleSummaryDto] })
  roles!: UserRoleSummaryDto[];

  @ApiProperty({
    type: [String],
    description: 'Permisos efectivos del usuario (claves canónicas).',
  })
  permissions!: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
