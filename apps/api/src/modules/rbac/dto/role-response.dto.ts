import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin_sucursal' })
  slug!: string;

  @ApiProperty({ example: 'Administrador de Sucursal' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({
    description: 'Si el rol corresponde a uno de los oficiales del sistema y no puede ser eliminado.',
  })
  isOfficial!: boolean;

  @ApiProperty({ type: [String], description: 'Claves de permisos asignados' })
  permissionKeys!: string[];

  @ApiProperty()
  usersCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
