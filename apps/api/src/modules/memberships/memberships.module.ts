import { Module } from '@nestjs/common';
import { EmailsModule } from '../emails/emails.module';
import { RaffleTicketsModule } from '../raffle-tickets/raffle-tickets.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { MembershipNotificationsService } from './membership-notifications.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsScheduler } from './memberships.scheduler';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [EmailsModule, RaffleTicketsModule, ReferralsModule],
  controllers: [MembershipsController],
  providers: [
    MembershipsService,
    MembershipsScheduler,
    // F2.7-E — Service centralizado para enviar y auditar notificaciones
    // del ciclo de vida del Club. Exportamos para que otros módulos
    // (ej. admin tooling futuro) puedan consultar el log.
    MembershipNotificationsService,
  ],
  exports: [MembershipsService, MembershipNotificationsService],
})
export class MembershipsModule {}
