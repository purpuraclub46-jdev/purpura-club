import { Module } from '@nestjs/common';
import { EmailsModule } from '../emails/emails.module';
import { MembershipsController } from './memberships.controller';
import { MembershipsScheduler } from './memberships.scheduler';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [EmailsModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsScheduler],
  exports: [MembershipsService],
})
export class MembershipsModule {}
