import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';

@Module({
  imports: [MembershipsModule, ReferralsModule, ReceiptsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
