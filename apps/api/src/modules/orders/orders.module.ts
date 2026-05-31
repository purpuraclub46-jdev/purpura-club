import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';

@Module({
  // F2.7-A — Referrals ya no se inyecta directamente: el rebote al referente
  // vive dentro de MembershipsService.applyPaidPurchase.
  imports: [MembershipsModule, ReceiptsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
