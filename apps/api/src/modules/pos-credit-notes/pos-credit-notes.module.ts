import { Module } from '@nestjs/common';
import { ReceiptsModule } from '../receipts/receipts.module';
import { PosCreditNotesController } from './pos-credit-notes.controller';
import { PosCreditNotesService } from './pos-credit-notes.service';

@Module({
  imports: [ReceiptsModule],
  controllers: [PosCreditNotesController],
  providers: [PosCreditNotesService],
  exports: [PosCreditNotesService],
})
export class PosCreditNotesModule {}
