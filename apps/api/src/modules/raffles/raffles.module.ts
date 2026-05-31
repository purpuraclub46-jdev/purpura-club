import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { RafflePricingService } from './raffle-pricing.service';
import { RafflesController } from './raffles.controller';
import { RafflesService } from './raffles.service';
import { RafflesRepository } from './repositories/raffles.repository';

/**
 * F2.7-B — RafflesModule importa MembershipsModule para que
 * `RafflePricingService` pueda resolver `MembershipsService.isActive(userId)`.
 *
 * Exporta `RafflePricingService` para que RaffleEntriesService lo consuma
 * como fuente única de verdad del precio de tickets.
 */
@Module({
  imports: [MembershipsModule],
  controllers: [RafflesController],
  providers: [RafflesService, RafflesRepository, RafflePricingService],
  exports: [RafflesService, RafflesRepository, RafflePricingService],
})
export class RafflesModule {}
