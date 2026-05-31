import { Module } from '@nestjs/common';
import { RaffleTicketsService } from './raffle-tickets.service';

/**
 * Helper compartido para otorgar tickets de sorteo automáticos. Lo consumen
 * `MembershipsService` (vía `applyPaidPurchase`) y cualquier flujo futuro
 * que necesite asignar tickets fuera del path de compra directa.
 */
@Module({
  providers: [RaffleTicketsService],
  exports: [RaffleTicketsService],
})
export class RaffleTicketsModule {}
