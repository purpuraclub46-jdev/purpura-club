import { Module } from '@nestjs/common';
import { InventoryLocationsController } from './inventory-locations.controller';
import { InventoryLocationsService } from './inventory-locations.service';
import { InventoryLocationsRepository } from './repositories/inventory-locations.repository';

@Module({
  controllers: [InventoryLocationsController],
  providers: [InventoryLocationsService, InventoryLocationsRepository],
  exports: [InventoryLocationsService, InventoryLocationsRepository],
})
export class InventoryLocationsModule {}
