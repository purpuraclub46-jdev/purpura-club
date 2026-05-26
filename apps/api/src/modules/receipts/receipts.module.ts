import { Global, Module } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';

@Global()
@Module({
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
