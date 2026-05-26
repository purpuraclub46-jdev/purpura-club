import { Module } from '@nestjs/common';
import { PosContextController } from './pos-context.controller';
import { PosContextService } from './pos-context.service';

@Module({
  controllers: [PosContextController],
  providers: [PosContextService],
  exports: [PosContextService],
})
export class PosContextModule {}
