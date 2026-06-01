import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EXPIRATION_REMINDER_DAYS } from './membership.constants';
import { computeDaysRemaining } from './membership.helpers';
import { MembershipNotificationsService } from './membership-notifications.service';

/**
 * F2.7-E — Tareas diarias del Membership Engine.
 *
 *   1. `deactivateExpired()` — marca `active=false` para todas las
 *      membresías cuya `expiresAt` ya pasó.
 *   2. `dispatchExpirationReminders()` — envía recordatorios 7/3/1 días
 *      antes del vencimiento, delegando la idempotencia a
 *      `MembershipNotificationsService`.
 *
 * ## Timezone (E2)
 *
 * El cron declara explícitamente `timeZone: 'America/Lima'`. Esto evita
 * que correr en una infraestructura UTC (Render, Fly, k8s con default
 * UTC) dispare el job a las 04:00 hora Perú. La constante `CRON_HOUR`
 * + `timeZone` lo deja claro y auditable.
 *
 * ## Multi-instance safety (E6)
 *
 * NO usamos lock distribuido externo (sin Redis, sin pg_advisory_lock).
 * La idempotencia la garantiza el unique constraint compuesto en
 * `MembershipNotificationLog` — si N instancias intentan mandar el mismo
 * reminder, la primera INSERT gana y el resto recibe P2002 →
 * SKIPPED_ALREADY_SENT en el service. Resultado: 1 email por (membership,
 * type, ciclo) garantizado.
 *
 * ## Re-run safety
 *
 * Si el scheduler corre 2 veces el mismo día (restart de contenedor,
 * cron disparado manualmente), el segundo run no produce duplicados por
 * la misma razón.
 */
@Injectable()
export class MembershipsScheduler {
  private readonly logger = new Logger(MembershipsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: MembershipNotificationsService,
  ) {}

  // Todos los días a las 09:00 hora Perú (UTC-5).
  // F2.7-E / E2 — timeZone explícito, NO confiar en TZ del host.
  @Cron('0 0 9 * * *', {
    name: 'memberships:daily-tick',
    timeZone: 'America/Lima',
  })
  async dailyTick(): Promise<void> {
    const startedAt = Date.now();
    await this.deactivateExpired();
    const stats = await this.dispatchExpirationReminders();
    this.logger.log(
      `daily tick done in ${Date.now() - startedAt}ms — ` +
        `reminders: sent=${stats.sent} skipped=${stats.skipped} failed=${stats.failed}`,
    );
  }

  /**
   * Marca como inactivas las membresías cuya `expiresAt` ya pasó.
   *
   * No envía email — el aviso ya se cursó vía los reminders 7/3/1; aquí
   * solo sincronizamos el flag para queries posteriores.
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
   * Envía recordatorios para cada ventana en `EXPIRATION_REMINDER_DAYS`.
   *
   * Estrategia de ventana: buscamos memberships cuya `expiresAt` cae
   * exactamente en el día calendario `today + N` (en hora Perú). Si
   * el job se atrasara y corriera al día siguiente, la ventana del día
   * anterior queda fuera de la búsqueda — preferimos perderlo a
   * duplicarlo (consistente con la garantía at-most-once del service).
   *
   * Cada candidato pasa por `sendReminderIdempotent`, que se encarga
   * de la dedup. Aquí solo enumeramos y reportamos.
   */
  async dispatchExpirationReminders(now: Date = new Date()): Promise<{
    sent: number;
    skipped: number;
    failed: number;
  }> {
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const days of EXPIRATION_REMINDER_DAYS) {
      const windowStart = startOfDayLima(now, days);
      const windowEnd = endOfDayLima(now, days);
      const candidates = await this.prisma.membership.findMany({
        where: {
          active: true,
          expiresAt: { gte: windowStart, lte: windowEnd },
        },
        include: {
          user: { select: { id: true, email: true, firstName: true } },
        },
      });

      for (const m of candidates) {
        // Defensa: si por alguna razón el user no tiene email,
        // `sendReminderIdempotent` retorna SKIPPED_NO_EMAIL.
        const outcome = await this.notifications.sendReminderIdempotent({
          membershipId: m.id,
          userId: m.userId,
          referenceExpiresAt: m.expiresAt,
          daysRemaining: days,
          toEmail: m.user.email,
          firstName: m.user.firstName,
        });

        if (outcome === 'SENT') sent += 1;
        else if (outcome === 'SEND_FAILED') failed += 1;
        else skipped += 1;
      }

      // `days` se mantiene en la firma por compatibilidad con tests/snapshots.
      void computeDaysRemaining; // util reservado por si futuras métricas
    }

    return { sent, skipped, failed };
  }
}

// ─── Boundaries de día calendario en hora Perú (UTC-5) ─────────────────
//
// Aunque @nestjs/schedule dispara el cron a las 09:00 hora Lima, las
// boundaries de fecha que pasamos a Prisma se evalúan en UTC dentro de la
// base. Convertimos `now + N días` a el día calendario en Lima y
// expandimos a `[00:00, 23:59:59.999]` Lima, luego serializamos a UTC
// implícitamente vía Date.
//
// Implementación: Lima = UTC-5 fijo (no DST en Perú). Sumamos 5h al inicio
// del día Lima para obtener el equivalente UTC, y restamos al final.
const LIMA_UTC_OFFSET_HOURS = 5;

const startOfDayLima = (now: Date, daysAhead: number): Date => {
  const limaNow = new Date(
    now.getTime() - LIMA_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  );
  // limaNow representa "ahora visto desde Lima" en UTC.
  limaNow.setUTCDate(limaNow.getUTCDate() + daysAhead);
  limaNow.setUTCHours(0, 0, 0, 0); // 00:00:00 Lima
  // Volver a UTC: Lima 00:00 = UTC 05:00 del mismo día.
  return new Date(limaNow.getTime() + LIMA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
};

const endOfDayLima = (now: Date, daysAhead: number): Date => {
  const limaNow = new Date(
    now.getTime() - LIMA_UTC_OFFSET_HOURS * 60 * 60 * 1000,
  );
  limaNow.setUTCDate(limaNow.getUTCDate() + daysAhead);
  limaNow.setUTCHours(23, 59, 59, 999); // 23:59:59.999 Lima
  return new Date(limaNow.getTime() + LIMA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
};

// Exportamos los helpers para que los tests verifiquen las boundaries.
export const __test = { startOfDayLima, endOfDayLima };
