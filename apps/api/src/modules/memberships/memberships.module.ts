import { Module } from '@nestjs/common';
import { EmailsModule } from '../emails/emails.module';
import { RaffleTicketsModule } from '../raffle-tickets/raffle-tickets.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { MembershipsController } from './memberships.controller';
import { MembershipsScheduler } from './memberships.scheduler';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [EmailsModule, RaffleTicketsModule, ReferralsModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsScheduler],
  exports: [MembershipsService],
})
export class MembershipsModule {}
