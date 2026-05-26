import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * En el update no se reasigna la contraseña — para eso existe el endpoint
 * dedicado `POST /users/:id/reset-password`.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  // Se sobreescribe el tipo de inventoryLocationId para aceptar `null`
  // explícito como "remover ubicación asignada".
  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      'Ubicación/sucursal asignada. Enviar `null` para remover la restricción.',
  })
  inventoryLocationId?: string | null;
}
