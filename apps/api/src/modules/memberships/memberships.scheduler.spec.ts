import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { MembershipNotificationsService } from './membership-notifications.service';
import {
  MembershipsScheduler,
  __test as schedulerTestUtils,
} from './memberships.scheduler';

/**
 * F2.7-E — Tests del MembershipsScheduler (T14.11–T14.17).
 *
 * Cubren:
 *   - dailyTick orquesta deactivate + dispatch
 *   - filtros: solo memberships active=true
 *   - boundaries de día en hora Lima (no UTC)
 *   - @Cron declarado con timeZone 'America/Lima'
 *   - re-run del cron no duplica (delegado a service por unique constraint)
 *   - dispatcher cuenta sent/skipped/failed correctamente
 */

type PrismaMock = {
  membership: { updateMany: jest.Mock; findMany: jest.Mock };
};

function createPrismaMock(): PrismaMock {
  return {
    membership: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('MembershipsScheduler', () => {
  let scheduler: MembershipsScheduler;
  let prisma: PrismaMock;
  let notifications: {
    sendReminderIdempotent: jest.Mock;
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notifications = {
      sendReminderIdempotent: jest.fn().mockResolvedValue('SENT'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsScheduler,
        { provide: PrismaService, useValue: prisma },
        {
          provide: MembershipNotificationsService,
          useValue: notifications,
        },
        // SchedulerRegistry y Reflector se inyectan implícitamente cuando
        // hay decoradores @Cron, pero como Test.createTestingModule no los
        // monta, los stubeamos para evitar errores de DI cuando @nestjs/schedule
        // explora los providers.
        { provide: SchedulerRegistry, useValue: {} },
        { provide: Reflector, useValue: { get: () => undefined } },
      ],
    }).compile();

    scheduler = module.get<MembershipsScheduler>(MembershipsScheduler);
  });

  // ─── T14.11 ────────────────────────────────────────────────────────────
  describe('dailyTick (T14.11)', () => {
    it('T14.11 — orquesta deactivate + dispatch en orden', async () => {
      const order: string[] = [];
      const spyDeactivate = jest
        .spyOn(scheduler, 'deactivateExpired')
        .mockImplementation(() => {
          order.push('deactivate');
          return Promise.resolve(0);
        });
      const spyDispatch = jest
        .spyOn(scheduler, 'dispatchExpirationReminders')
        .mockImplementation(() => {
          order.push('dispatch');
          return Promise.resolve({ sent: 0, skipped: 0, failed: 0 });
        });

      await scheduler.dailyTick();

      expect(order).toEqual(['deactivate', 'dispatch']);
      spyDeactivate.mockRestore();
      spyDispatch.mockRestore();
    });
  });

  // ─── T14.12 ────────────────────────────────────────────────────────────
  describe('dispatchExpirationReminders filter (T14.12)', () => {
    it('T14.12 — query filtra active=true', async () => {
      await scheduler.dispatchExpirationReminders(
        new Date('2026-05-31T14:00:00Z'),
      );

      // Se llamó 3 veces (una por cada window 7/3/1).
      expect(prisma.membership.findMany).toHaveBeenCalledTimes(3);
      type FindManyCall = [
        { where: { active: boolean; expiresAt: { gte: Date; lte: Date } } },
      ];
      const calls = prisma.membership.findMany.mock.calls as FindManyCall[];
      for (const call of calls) {
        expect(call[0].where.active).toBe(true);
        expect(call[0].where.expiresAt.gte).toBeInstanceOf(Date);
        expect(call[0].where.expiresAt.lte).toBeInstanceOf(Date);
      }
    });

    it('T14.17 — membership vencida (active=false) nunca llega al dispatcher porque la query la excluye', async () => {
      // Ni siquiera devolvemos candidates; el filter ya excluye.
      prisma.membership.findMany.mockResolvedValue([]);

      const stats = await scheduler.dispatchExpirationReminders(
        new Date('2026-05-31T14:00:00Z'),
      );

      expect(stats).toEqual({ sent: 0, skipped: 0, failed: 0 });
      expect(notifications.sendReminderIdempotent).not.toHaveBeenCalled();
    });
  });

  // ─── T14.13 / T14.16 ──────────────────────────────────────────────────
  describe('boundaries Lima (T14.13, T14.16)', () => {
    it('T14.13 — startOfDayLima(now, 7) representa 00:00:00 hora Lima', () => {
      // now = 2026-05-31 14:00 UTC = 2026-05-31 09:00 Lima
      const now = new Date('2026-05-31T14:00:00Z');
      const start = schedulerTestUtils.startOfDayLima(now, 7);
      // start debe ser 2026-06-07 00:00:00 Lima = 2026-06-07 05:00:00 UTC.
      expect(start.toISOString()).toBe('2026-06-07T05:00:00.000Z');
    });

    it('T14.13b — endOfDayLima(now, 7) representa 23:59:59.999 hora Lima', () => {
      const now = new Date('2026-05-31T14:00:00Z');
      const end = schedulerTestUtils.endOfDayLima(now, 7);
      // end debe ser 2026-06-07 23:59:59.999 Lima = 2026-06-08 04:59:59.999 UTC.
      expect(end.toISOString()).toBe('2026-06-08T04:59:59.999Z');
    });

    it('T14.16 — membership con expiresAt mañana NO matchea ventana 7d', () => {
      // now = hoy 14:00 UTC. Ventana 7d apunta a hoy+7.
      const now = new Date('2026-05-31T14:00:00Z');
      // expiresAt mañana → no debe caer en [hoy+7 00:00 Lima, hoy+7 23:59 Lima].
      const tomorrow = new Date('2026-06-01T14:00:00Z');

      // Verificamos manualmente que tomorrow < start of day 7d.
      const start7 = schedulerTestUtils.startOfDayLima(now, 7);
      expect(tomorrow.getTime()).toBeLessThan(start7.getTime());
    });
  });

  // ─── T14.14 ────────────────────────────────────────────────────────────
  describe('@Cron metadata (T14.14)', () => {
    it('T14.14 — dailyTick declara timeZone America/Lima', () => {
      // Leemos los metadatos del decorador @Cron. `getMetadata` necesita
      // la referencia original del método, no la bound — la lint warning
      // unbound-method no aplica acá (sólo leemos metadata, no invocamos).
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const dailyTick = scheduler.dailyTick;
      const meta: unknown = Reflect.getMetadata(
        'SCHEDULE_CRON_OPTIONS',
        dailyTick,
      );
      expect(meta).toBeDefined();
      expect((meta as { timeZone?: string }).timeZone).toBe('America/Lima');
      expect((meta as { name?: string }).name).toBe('memberships:daily-tick');
    });
  });

  // ─── T14.15 ────────────────────────────────────────────────────────────
  describe('re-run idempotency (T14.15)', () => {
    it('T14.15 — doble ejecución del scheduler no duplica reminders (delegado al service)', async () => {
      // El service mockeado devuelve SENT la primera vez, SKIPPED la segunda.
      // Probamos que el scheduler simplemente refleja lo que el service le dice.
      const m = {
        id: 'm-1',
        userId: 'user-1',
        expiresAt: new Date('2026-06-07T05:00:00Z'),
        user: {
          id: 'user-1',
          email: 'jane@x.com',
          firstName: 'Jane',
        },
      };
      prisma.membership.findMany
        .mockResolvedValueOnce([m]) // 7d window run 1
        .mockResolvedValueOnce([]) // 3d window
        .mockResolvedValueOnce([]) // 1d window
        .mockResolvedValueOnce([m]) // 7d window run 2
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      notifications.sendReminderIdempotent
        .mockResolvedValueOnce('SENT')
        .mockResolvedValueOnce('SKIPPED_ALREADY_SENT');

      const stats1 = await scheduler.dispatchExpirationReminders(
        new Date('2026-05-31T14:00:00Z'),
      );
      const stats2 = await scheduler.dispatchExpirationReminders(
        new Date('2026-05-31T14:30:00Z'),
      );

      expect(stats1.sent).toBe(1);
      expect(stats2.sent).toBe(0);
      expect(stats2.skipped).toBe(1);
    });
  });

  // ─── Dispatcher counters ──────────────────────────────────────────────
  describe('dispatcher counters', () => {
    it('cuenta SENT / SKIPPED / FAILED correctamente', async () => {
      const m1 = {
        id: 'm-1',
        userId: 'u-1',
        expiresAt: new Date('2026-06-07T05:00:00Z'),
        user: { id: 'u-1', email: 'a@x.com', firstName: 'A' },
      };
      const m2 = {
        ...m1,
        id: 'm-2',
        userId: 'u-2',
        user: { ...m1.user, id: 'u-2', email: 'b@x.com' },
      };
      const m3 = {
        ...m1,
        id: 'm-3',
        userId: 'u-3',
        user: { ...m1.user, id: 'u-3', email: 'c@x.com' },
      };

      prisma.membership.findMany
        .mockResolvedValueOnce([m1, m2, m3])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      notifications.sendReminderIdempotent
        .mockResolvedValueOnce('SENT')
        .mockResolvedValueOnce('SKIPPED_ALREADY_SENT')
        .mockResolvedValueOnce('SEND_FAILED');

      const stats = await scheduler.dispatchExpirationReminders(
        new Date('2026-05-31T14:00:00Z'),
      );

      expect(stats).toEqual({ sent: 1, skipped: 1, failed: 1 });
    });
  });

  // ─── deactivateExpired ───────────────────────────────────────────────
  describe('deactivateExpired', () => {
    it('updateMany con active=true + expiresAt<=now → data: active=false', async () => {
      prisma.membership.updateMany.mockResolvedValueOnce({ count: 3 });
      const now = new Date('2026-05-31T14:00:00Z');

      const count = await scheduler.deactivateExpired(now);

      expect(count).toBe(3);
      expect(prisma.membership.updateMany).toHaveBeenCalledWith({
        where: { active: true, expiresAt: { lte: now } },
        data: { active: false },
      });
    });
  });
});
