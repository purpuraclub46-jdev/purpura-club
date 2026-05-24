import { Module } from '@nestjs/common';
import { RafflesController } from './raffles.controller';
import { RafflesService } from './raffles.service';
import { RafflesRepository } from './repositories/raffles.repository';

@Module({
  controllers: [RafflesController],
  providers: [RafflesService, RafflesRepository],
  exports: [RafflesService, RafflesRepository],
})
export class RafflesModule {}
