import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { ComplaintsRepository } from './repositories/complaints.repository';

@Module({
  controllers: [ComplaintsController],
  providers: [ComplaintsService, ComplaintsRepository],
  exports: [ComplaintsService, ComplaintsRepository],
})
export class ComplaintsModule {}
