import { Injectable, Logger } from '@nestjs/common';
import {
  MembershipNotificationType,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
import { EXPIRATION_REMINDER_DAYS } from './membership.constants';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * F2.7-E — Resultado posible de un intento de notificación. Capturamos
 * todos los caminos para que los callers puedan loggear/telemetrar sin
 * inspeccionar excepciones.
 */
export type NotificationOutcome =
  /** Insert + send exitosos. */
  | 'SENT'
  /** Unique constraint violado → ya se notificó este ciclo. */
  | 'SKIPPED_ALREADY_SENT'
  /** Insert OK pero el provider falló. La fila queda (at-most-once). */
  | 'SEND_FAILED'
  /** El usuario no tiene email registrado — caso defensivo. */
  | 'SKIPPED_NO_EMAIL';

export interface SendWelcomeArgs {
  membershipId: string;
  userId: string;
  /** expiresAt del ciclo actual; sirve como scope-key del dedup. */
  referenceExpiresAt: Date;
  /** Email destinatario; si no se pasa, lo lee de User. */
  toEmail?: string;
  /** firstName para el template; si no se pasa, lo lee de User. */
  firstName?: string;
  /** Cliente transaccional opcional para integrar al flujo de activateOrRenew. */
  tx?: Tx;
}

export interface SendReminderArgs {
  membershipId: string;
  userId: string;
  /** expiresAt del ciclo actual. */
  referenceExpiresAt: Date;
  /** 7 | 3 | 1 — único valor permitido. */
  daysRemaining: number;
  /** Email destinatario. */
  toEmail: string;
  firstName: string;
}

/**
 * F2.7-E — Servicio de notificaciones del ciclo de vida del Club.
 *
 * Encapsula la lógica idempotente de envío de welcome + reminders. La fuente
 * de verdad es la tabla `MembershipNotificationLog` con unique compuesto
 * `(membershipId, type, referenceExpiresAt)` que funciona simultáneamente
 * como:
 *
 *   - Idempotencia: el mismo (membership, tipo, ciclo) sólo se notifica 1 vez.
 *   - Lock distribuido: bajo concurrencia (re-runs del scheduler, cluster
 *     multi-instancia), el primer INSERT gana; los demás reciben P2002
 *     y retornan SKIPPED_ALREADY_SENT silenciosamente.
 *
 * Estrategia de envío: insert FIRST, send AFTER.
 *
 *   1. Insertamos la fila → si conflict (P2002) → SKIPPED.
 *   2. Mandamos el email → si throw → quedamos at-most-once (no
 *      reintentamos). El usuario verá en mi-cuenta el banner F2.7-D y
 *      será notificado vía UI; preferimos no-spam sobre completitud.
 *   3. Si el send devuelve `id`, lo guardamos como `emailMessageId` para
 *      trazabilidad.
 *
 * Nota arquitectónica: este servicio NO conoce el cron expression ni los
 * timezone — eso vive en MembershipsScheduler. Acá solo respondemos
 * "manda este reminder específico, pero idempotentemente".
 */
@Injectable()
export class MembershipNotificationsService {
  private readonly logger = new Logger(MembershipNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
  ) {}

  /**
   * Envia el welcome email de forma idempotente.
   *
   * E1 — El caller (activateOrRenew) ya decidió que es necesario un welcome
   * (alta nueva o reactivación tras vencer). Aquí solo garantizamos que
   * no se envíe dos veces para el mismo `referenceExpiresAt`.
   *
   * Idempotencia: si esta misma orden dispara `activateOrRenew` dos veces
   * por error (race en setImmediate, reintento manual), el segundo intento
   * recibe SKIPPED_ALREADY_SENT.
   */
  async sendWelcomeIdempotent(
    args: SendWelcomeArgs,
  ): Promise<NotificationOutcome> {
    const db = args.tx ?? this.prisma;

    // Resolver email + firstName del User si no vinieron pre-cargados.
    let { toEmail, firstName } = args;
    if (!toEmail || !firstName) {
      const user = await db.user.findUnique({
        where: { id: args.userId },
        select: { email: true, firstName: true },
      });
      if (!user) {
        this.logger.warn(`Welcome skipped: user ${args.userId} not found`);
        return 'SKIPPED_NO_EMAIL';
      }
      toEmail = toEmail ?? user.email;
      firstName = firstName ?? user.firstName;
    }

    if (!toEmail) return 'SKIPPED_NO_EMAIL';

    // ─── CLAIM (insert) ────────────────────────────────────────────
    let logRowId: string;
    try {
      const created = await db.membershipNotificationLog.create({
        data: {
          membershipId: args.membershipId,
          userId: args.userId,
          type: MembershipNotificationType.WELCOME,
          referenceExpiresAt: args.referenceExpiresAt,
          toEmail,
        },
        select: { id: true },
      });
      logRowId = created.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return 'SKIPPED_ALREADY_SENT';
      }
      throw error;
    }

    // ─── SEND ──────────────────────────────────────────────────────
    try {
      const result = await this.emails.sendWelcomeMembership(toEmail, {
        firstName: firstName ?? '',
        expiresAt: args.referenceExpiresAt,
      });
      if (result?.id) {
        await db.membershipNotificationLog.update({
          where: { id: logRowId },
          data: { emailMessageId: result.id },
        });
      }
      this.logger.log(
        `Welcome sent → ${toEmail} (membership=${args.membershipId})`,
      );
      return 'SENT';
    } catch (error) {
      this.logger.warn(
        `Welcome send failed for ${toEmail}: ${String(error)} — log row preserved`,
      );
      return 'SEND_FAILED';
    }
  }

  /**
   * Envia un reminder de expiración (7/3/1 días) idempotentemente.
   *
   * Idempotencia: la combinación `(membershipId, REMINDER_<D>D,
   * referenceExpiresAt)` garantiza que un mismo cliente no recibe más de un
   * reminder por ventana por ciclo, sin importar cuántas veces corra el
   * scheduler o cuántas instancias intenten enviarlo.
   */
  async sendReminderIdempotent(
    args: SendReminderArgs,
  ): Promise<NotificationOutcome> {
    const type = this.resolveReminderType(args.daysRemaining);
    if (!type) {
      throw new Error(
        `Invalid daysRemaining for reminder: ${args.daysRemaining} (allowed: ${EXPIRATION_REMINDER_DAYS.join(', ')})`,
      );
    }

    if (!args.toEmail) return 'SKIPPED_NO_EMAIL';

    // ─── CLAIM (insert) ────────────────────────────────────────────
    let logRowId: string;
    try {
      const created = await this.prisma.membershipNotificationLog.create({
        data: {
          membershipId: args.membershipId,
          userId: args.userId,
          type,
          referenceExpiresAt: args.referenceExpiresAt,
          toEmail: args.toEmail,
        },
        select: { id: true },
      });
      logRowId = created.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return 'SKIPPED_ALREADY_SENT';
      }
      throw error;
    }

    // ─── SEND ──────────────────────────────────────────────────────
    try {
      const result = await this.emails.sendExpirationReminder(args.toEmail, {
        firstName: args.firstName,
        expiresAt: args.referenceExpiresAt,
        daysRemaining: args.daysRemaining,
      });
      if (result?.id) {
        await this.prisma.membershipNotificationLog.update({
          where: { id: logRowId },
          data: { emailMessageId: result.id },
        });
      }
      this.logger.log(
        `Reminder ${type} sent → ${args.toEmail} (membership=${args.membershipId})`,
      );
      return 'SENT';
    } catch (error) {
      this.logger.warn(
        `Reminder ${type} send failed for ${args.toEmail}: ${String(error)} — log row preserved`,
      );
      return 'SEND_FAILED';
    }
  }

  /**
   * Indica si ya se notificó al usuario para un (membership, type, ciclo)
   * dado. Útil para tests o para pintar estado en UI de admin.
   */
  async hasBeenNotified(args: {
    membershipId: string;
    type: MembershipNotificationType;
    referenceExpiresAt: Date;
  }): Promise<boolean> {
    const count = await this.prisma.membershipNotificationLog.count({
      where: {
        membershipId: args.membershipId,
        type: args.type,
        referenceExpiresAt: args.referenceExpiresAt,
      },
    });
    return count > 0;
  }

  /**
   * Mapea `daysRemaining` (7|3|1) al enum correspondiente. Defensivo —
   * devuelve null si el valor no es uno de los oficiales para que el caller
   * lance un error explícito.
   */
  private resolveReminderType(
    daysRemaining: number,
  ): MembershipNotificationType | null {
    switch (daysRemaining) {
      case 7:
        return MembershipNotificationType.REMINDER_7D;
      case 3:
        return MembershipNotificationType.REMINDER_3D;
      case 1:
        return MembershipNotificationType.REMINDER_1D;
      default:
        return null;
    }
  }
}
