import { Module } from '@nestjs/common';
import { CustomerAddressesController } from './addresses/customer-addresses.controller';
import { CustomerAddressesService } from './addresses/customer-addresses.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  controllers: [CustomersController, CustomerAddressesController],
  providers: [CustomersService, CustomerAddressesService],
  exports: [CustomersService, CustomerAddressesService],
})
export class CustomersModule {}
