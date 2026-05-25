import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import {
  EXPIRATION_REMINDER_DAYS,
} from './membership.constants';
import { computeDaysRemaining } from './membership.helpers';

/**
 * Tareas diarias del Membership Engine:
 *
 *   1. Desactivar membresías que ya vencieron (active=false).
 *   2. Enviar recordatorios a 7 / 3 / 1 día(s) del vencimiento.
 *
 * Los recordatorios se emiten una vez por ventana (búsqueda por rango
 * de horas para evitar duplicados ante reintentos del scheduler).
 */
@Injectable()
export class MembershipsScheduler {
  private readonly logger = new Logger(MembershipsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
  ) {}

  // Todos los días a las 09:00 server time. Cambiar fácilmente con cron expr.
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'memberships:daily-tick',
  })
  async dailyTick(): Promise<void> {
    const startedAt = Date.now();
    await this.deactivateExpired();
    const sent = await this.dispatchExpirationReminders();
    this.logger.log(
      `daily tick done in ${Date.now() - startedAt}ms — reminders sent: ${sent}`,
    );
  }

  /**
   * Marca como inactivas las membresías cuya `expiresAt` ya pasó.
   * No envía email; el aviso ya se mandó en la ventana 7/3/1.
   */
  async deactivateExpired(now: Date = new Date()): Promise<number> {
    const res = await this.prisma.membership.updateMany({
      where: { active: true, expiresAt: { lte: now } },
      data: { active: false },
    });
    if (res.count > 0) {
      this.logger.log(`Deactivated ${res.count} expired memberships`);
    }
    return res.count;
  }

  /**
   * Envía recordatorios para cada ventana definida en
   * `EXPIRATION_REMINDER_DAYS`. Para cada ventana, busca membresías que
   * expiran exactamente ese día calendario.
   */
  async dispatchExpirationReminders(now: Date = new Date()): Promise<number> {
    let totalSent = 0;
    for (const days of EXPIRATION_REMINDER_DAYS) {
      const windowStart = startOfDayOffset(now, days);
      const windowEnd = endOfDayOffset(now, days);
      const candidates = await this.prisma.membership.findMany({
        where: {
          active: true,
          expiresAt: { gte: windowStart, lte: windowEnd },
        },
        include: { user: { select: { email: true, firstName: true } } },
      });
      for (const m of candidates) {
        try {
          await this.emails.sendExpirationReminder(m.user.email, {
            firstName: m.user.firstName,
            expiresAt: m.expiresAt,
            daysRemaining: computeDaysRemaining(m.expiresAt, now),
          });
          totalSent += 1;
        } catch (error) {
          this.logger.warn(
            `expiration reminder failed for ${m.user.email}: ${String(error)}`,
          );
        }
      }
    }
    return totalSent;
  }
}

const startOfDayOffset = (now: Date, daysAhead: number): Date => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysAhead);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDayOffset = (now: Date, daysAhead: number): Date => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysAhead);
  d.setHours(23, 59, 59, 999);
  return d;
};
