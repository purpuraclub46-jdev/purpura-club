import { Test, TestingModule } from '@nestjs/testing';
import { MembershipNotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { MembershipNotificationsService } from './membership-notifications.service';

/**
 * F2.7-E — Tests del MembershipNotificationsService (T14.1–T14.10).
 *
 * Cubren:
 *   - Welcome idempotency (insert + send + claim ya tomado)
 *   - Welcome reactivation (E1)
 *   - Reminder idempotency por (membership, type, expiresAt)
 *   - Reminder cross-cycle: cambio de expiresAt permite nuevo envío
 *   - Provider failure post-claim: log row preservado (at-most-once)
 *   - Race entre 2 instancias → solo una gana
 */

type PrismaMock = {
  user: { findUnique: jest.Mock };
  membershipNotificationLog: {
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
};

function createPrismaMock(): PrismaMock {
  return {
    user: { findUnique: jest.fn() },
    membershipNotificationLog: {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'updated' }),
      count: jest.fn(),
    },
  };
}

function p2002(
  target = 'uq_membership_notif_per_cycle',
): Prisma.PrismaClientKnownRequestError {
  const err = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError;
  Object.assign(err, {
    name: 'PrismaClientKnownRequestError',
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
    message: `Unique constraint failed on ${target}`,
  });
  return err;
}

describe('MembershipNotificationsService', () => {
  let service: MembershipNotificationsService;
  let prisma: PrismaMock;
  let emails: {
    sendWelcomeMembership: jest.Mock;
    sendExpirationReminder: jest.Mock;
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    emails = {
      sendWelcomeMembership: jest
        .fn()
        .mockResolvedValue({ id: 'msg-welcome-1', sent: true }),
      sendExpirationReminder: jest
        .fn()
        .mockResolvedValue({ id: 'msg-reminder-1', sent: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipNotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailsService, useValue: emails },
      ],
    }).compile();

    service = module.get<MembershipNotificationsService>(
      MembershipNotificationsService,
    );
  });

  // ─── sendWelcomeIdempotent ────────────────────────────────────────────

  describe('sendWelcomeIdempotent (T14.1–T14.4)', () => {
    const baseArgs = {
      membershipId: 'm-1',
      userId: 'user-1',
      referenceExpiresAt: new Date('2026-07-30T05:00:00Z'),
      toEmail: 'jane@example.com',
      firstName: 'Jane',
    };

    it('T14.1 — alta nueva: insert + send → SENT + emailMessageId guardado', async () => {
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-1',
      });

      const result = await service.sendWelcomeIdempotent(baseArgs);

      expect(result).toBe('SENT');
      expect(prisma.membershipNotificationLog.create).toHaveBeenCalledWith({
        data: {
          membershipId: 'm-1',
          userId: 'user-1',
          type: MembershipNotificationType.WELCOME,
          referenceExpiresAt: baseArgs.referenceExpiresAt,
          toEmail: 'jane@example.com',
        },
        select: { id: true },
      });
      expect(emails.sendWelcomeMembership).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({
          firstName: 'Jane',
          expiresAt: baseArgs.referenceExpiresAt,
        }),
      );
      expect(prisma.membershipNotificationLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { emailMessageId: 'msg-welcome-1' },
      });
    });

    it('T14.2 — segundo intento mismo ciclo (P2002) → SKIPPED_ALREADY_SENT, NO envía email', async () => {
      prisma.membershipNotificationLog.create.mockRejectedValueOnce(p2002());

      const result = await service.sendWelcomeIdempotent(baseArgs);

      expect(result).toBe('SKIPPED_ALREADY_SENT');
      expect(emails.sendWelcomeMembership).not.toHaveBeenCalled();
    });

    it('T14.3 — caller decide cuándo invocar; el service no chequea active', async () => {
      // Este test documenta que la decisión "esta es una reactivación" la
      // toma activateOrRenew (con wasInactiveBefore). El service solo
      // garantiza idempotencia — confía en el caller.
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-2',
      });

      const result = await service.sendWelcomeIdempotent(baseArgs);
      expect(result).toBe('SENT');
    });

    it('T14.4 — reactivación tras vencer: nuevo expiresAt → nuevo claim posible', async () => {
      // Ciclo 1 ya tiene un row con expiresAt=enero. Ciclo 2 después de
      // vencer, user vuelve a comprar → upserted.expiresAt=julio. Mismo
      // membershipId, distinto referenceExpiresAt → unique key distinta.
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-cycle-2',
      });

      const cycle2Args = {
        ...baseArgs,
        referenceExpiresAt: new Date('2026-09-01T05:00:00Z'),
      };

      const result = await service.sendWelcomeIdempotent(cycle2Args);

      expect(result).toBe('SENT');
      expect(prisma.membershipNotificationLog.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          referenceExpiresAt: cycle2Args.referenceExpiresAt,
        }),
        select: { id: true },
      });
    });

    it('Provider falla tras claim → SEND_FAILED, log row queda', async () => {
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-fail',
      });
      emails.sendWelcomeMembership.mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      const result = await service.sendWelcomeIdempotent(baseArgs);

      expect(result).toBe('SEND_FAILED');
      // El row del claim NO se borra — at-most-once intencional.
      expect(prisma.membershipNotificationLog.update).not.toHaveBeenCalled();
    });

    it('Resolve email del User si no se pasa toEmail', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        email: 'resolved@example.com',
        firstName: 'Resolved',
      });
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-3',
      });

      const result = await service.sendWelcomeIdempotent({
        membershipId: 'm-1',
        userId: 'user-1',
        referenceExpiresAt: new Date('2026-07-30T05:00:00Z'),
      });

      expect(result).toBe('SENT');
      expect(emails.sendWelcomeMembership).toHaveBeenCalledWith(
        'resolved@example.com',
        expect.any(Object),
      );
    });

    it('User no existe → SKIPPED_NO_EMAIL', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.sendWelcomeIdempotent({
        membershipId: 'm-1',
        userId: 'ghost-uuid',
        referenceExpiresAt: new Date('2026-07-30T05:00:00Z'),
      });

      expect(result).toBe('SKIPPED_NO_EMAIL');
      expect(prisma.membershipNotificationLog.create).not.toHaveBeenCalled();
    });
  });

  // ─── sendReminderIdempotent ───────────────────────────────────────────

  describe('sendReminderIdempotent (T14.5–T14.10)', () => {
    const baseArgs = {
      membershipId: 'm-1',
      userId: 'user-1',
      referenceExpiresAt: new Date('2026-06-30T05:00:00Z'),
      toEmail: 'jane@example.com',
      firstName: 'Jane',
    };

    it('T14.5 — reminder 7d primera vez → SENT', async () => {
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-r7',
      });

      const result = await service.sendReminderIdempotent({
        ...baseArgs,
        daysRemaining: 7,
      });

      expect(result).toBe('SENT');
      expect(prisma.membershipNotificationLog.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          type: MembershipNotificationType.REMINDER_7D,
          referenceExpiresAt: baseArgs.referenceExpiresAt,
        }),
        select: { id: true },
      });
      expect(emails.sendExpirationReminder).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ daysRemaining: 7 }),
      );
    });

    it('T14.6 — reminder 7d ya enviado mismo ciclo → SKIPPED_ALREADY_SENT', async () => {
      prisma.membershipNotificationLog.create.mockRejectedValueOnce(p2002());

      const result = await service.sendReminderIdempotent({
        ...baseArgs,
        daysRemaining: 7,
      });

      expect(result).toBe('SKIPPED_ALREADY_SENT');
      expect(emails.sendExpirationReminder).not.toHaveBeenCalled();
    });

    it('T14.7 — reminder 3d tras 7d mismo ciclo → SENT (distinto type)', async () => {
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-r3',
      });

      const result = await service.sendReminderIdempotent({
        ...baseArgs,
        daysRemaining: 3,
      });

      expect(result).toBe('SENT');
      expect(prisma.membershipNotificationLog.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          type: MembershipNotificationType.REMINDER_3D,
        }),
        select: { id: true },
      });
    });

    it('T14.8 — reminder 7d nuevo ciclo (post-renovación) → SENT', async () => {
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-r7-cycle2',
      });

      const newCycleExpires = new Date('2026-08-15T05:00:00Z');
      const result = await service.sendReminderIdempotent({
        ...baseArgs,
        referenceExpiresAt: newCycleExpires,
        daysRemaining: 7,
      });

      expect(result).toBe('SENT');
      expect(prisma.membershipNotificationLog.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          type: MembershipNotificationType.REMINDER_7D,
          referenceExpiresAt: newCycleExpires,
        }),
        select: { id: true },
      });
    });

    it('T14.9 — provider falla tras claim → SEND_FAILED, no retry hoy', async () => {
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-failed-send',
      });
      emails.sendExpirationReminder.mockRejectedValueOnce(
        new Error('SMTP timeout'),
      );

      const result = await service.sendReminderIdempotent({
        ...baseArgs,
        daysRemaining: 7,
      });

      expect(result).toBe('SEND_FAILED');
      expect(prisma.membershipNotificationLog.update).not.toHaveBeenCalled();
    });

    it('T14.10 — race entre 2 instancias: una gana, otra recibe P2002', async () => {
      // Instancia A gana.
      prisma.membershipNotificationLog.create.mockResolvedValueOnce({
        id: 'log-winner',
      });
      // Instancia B intenta tras A.
      prisma.membershipNotificationLog.create.mockRejectedValueOnce(p2002());

      const [outA, outB] = await Promise.all([
        service.sendReminderIdempotent({ ...baseArgs, daysRemaining: 7 }),
        service.sendReminderIdempotent({ ...baseArgs, daysRemaining: 7 }),
      ]);

      const outcomes = [outA, outB].sort();
      expect(outcomes).toEqual(['SENT', 'SKIPPED_ALREADY_SENT']);
      // Solo un email enviado.
      expect(emails.sendExpirationReminder).toHaveBeenCalledTimes(1);
    });

    it('daysRemaining inválido → throw (defensa)', async () => {
      await expect(
        service.sendReminderIdempotent({
          ...baseArgs,
          daysRemaining: 5, // no está en [7, 3, 1]
        }),
      ).rejects.toThrow(/Invalid daysRemaining/);
    });

    it('toEmail vacío → SKIPPED_NO_EMAIL', async () => {
      const result = await service.sendReminderIdempotent({
        ...baseArgs,
        toEmail: '',
        daysRemaining: 7,
      });
      expect(result).toBe('SKIPPED_NO_EMAIL');
      expect(prisma.membershipNotificationLog.create).not.toHaveBeenCalled();
    });
  });

  // ─── hasBeenNotified helper ───────────────────────────────────────────

  describe('hasBeenNotified', () => {
    it('count > 0 → true', async () => {
      prisma.membershipNotificationLog.count.mockResolvedValueOnce(1);
      const out = await service.hasBeenNotified({
        membershipId: 'm-1',
        type: MembershipNotificationType.WELCOME,
        referenceExpiresAt: new Date(),
      });
      expect(out).toBe(true);
    });

    it('count === 0 → false', async () => {
      prisma.membershipNotificationLog.count.mockResolvedValueOnce(0);
      const out = await service.hasBeenNotified({
        membershipId: 'm-1',
        type: MembershipNotificationType.REMINDER_7D,
        referenceExpiresAt: new Date(),
      });
      expect(out).toBe(false);
    });
  });
});
