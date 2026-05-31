import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { PosSalesController } from './pos-sales.controller';
import { PosSalesService } from './pos-sales.service';

@Module({
  // F2.7-A — POS comparte el Membership Engine con ecommerce. Toda la lógica
  // de side effects (activar/renovar membresía, otorgar tickets, recompensar
  // referido, sincronizar Customer.isMember) vive en MembershipsService.
  imports: [MembershipsModule],
  controllers: [PosSalesController],
  providers: [PosSalesService],
  exports: [PosSalesService],
})
export class PosSalesModule {}
