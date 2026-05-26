import { Module } from '@nestjs/common';
import { RafflePrizesController } from './raffle-prizes.controller';
import { RafflePrizesService } from './raffle-prizes.service';
import { RaffleTicketsExportService } from './raffle-tickets-export.service';

@Module({
  controllers: [RafflePrizesController],
  providers: [RafflePrizesService, RaffleTicketsExportService],
  exports: [RafflePrizesService, RaffleTicketsExportService],
})
export class RafflePrizesModule {}
