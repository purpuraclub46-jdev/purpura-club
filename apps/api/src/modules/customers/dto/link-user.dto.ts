import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Payload del endpoint `POST /customers/:id/link-user` (D5).
 *
 * El admin vincula manualmente un Customer huérfano con un User existente.
 * Caso de uso: walk-in capturado en POS hace tiempo y el admin descubre
 * que ya tenía cuenta ecommerce con el mismo DNI.
 *
 * El service valida:
 *   - Customer no debe tener `userId` previo (no relinkar).
 *   - User no debe tener `customerProfile` previo (no robar Customer).
 *   - Si ambos tienen DNI, deben coincidir (anti-typo).
 *
 * Toda vinculación manual emite audit trail estructurado.
 */
export class LinkUserDto {
  @ApiProperty({
    description: 'UUID del User a vincular con este Customer.',
    format: 'uuid',
  })
  @IsUUID()
  userId!: string;
}
