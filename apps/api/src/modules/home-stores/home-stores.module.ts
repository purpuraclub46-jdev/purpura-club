import { Module } from '@nestjs/common';
import { HomeStoresController } from './home-stores.controller';
import { HomeStoresService } from './home-stores.service';
import { HomeStoresRepository } from './repositories/home-stores.repository';

@Module({
  controllers: [HomeStoresController],
  providers: [HomeStoresService, HomeStoresRepository],
  exports: [HomeStoresService, HomeStoresRepository],
})
export class HomeStoresModule {}
