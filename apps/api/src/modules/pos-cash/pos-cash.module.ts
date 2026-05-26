import { Global, Module } from '@nestjs/common';
import { PosCashController } from './pos-cash.controller';
import { PosCashService } from './pos-cash.service';

@Global()
@Module({
  controllers: [PosCashController],
  providers: [PosCashService],
  exports: [PosCashService],
})
export class PosCashModule {}
