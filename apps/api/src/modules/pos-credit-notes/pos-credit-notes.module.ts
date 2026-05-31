import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { PosCreditNotesController } from './pos-credit-notes.controller';
import { PosCreditNotesService } from './pos-credit-notes.service';

@Module({
  // F2.7-A — Las NC delegan el rollback de membresía + tickets a
  // MembershipsService.revertPaidPurchase para no duplicar el smart-revert.
  imports: [ReceiptsModule, MembershipsModule],
  controllers: [PosCreditNotesController],
  providers: [PosCreditNotesService],
  exports: [PosCreditNotesService],
})
export class PosCreditNotesModule {}
