import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  EntryStatus,
  EntryType,
  MembershipBenefitType,
  OrderChannel,
  OrderStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { RaffleTicketsService } from '../raffle-tickets/raffle-tickets.service';
import { ReferralsService } from '../referrals/referrals.service';
import { MembershipNotificationsService } from './membership-notifications.service';
import { BenefitLogQueryDto } from './dto/benefit-log-query.dto';
import { MembershipQueryDto } from './dto/membership-query.dto';
import {
  MembershipBenefitLogResponseDto,
  MembershipResponseDto,
} from './dto/membership-response.dto';
import {
  calculateMembershipStatus,
  computeDaysRemaining,
  computeNextExpiration,
  computePurchaseEntries,
  isQualifyingPurchase,
} from './membership.helpers';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

interface ActivateOrRenewArgs {
  userId: string;
  purchaseAmount: number;
  purchaseAt?: Date;
  /** Cuando se llama desde otra transacción de Prisma. */
  tx?: Tx;
}

export interface ApplyPaidPurchaseArgs {
  userId: string;
  /** Cliente CRM enlazado (si existe). Necesario para sincronizar isMember. */
  customerId: string | null;
  orderId: string;
  orderNumber: string;
  /** Monto total de la orden (con IGV — fuente de verdad para qualifying). */
  totalAmount: Prisma.Decimal | number;
  /** Timestamp del PAID — define anchor para expiración y reminders. */
  paidAt: Date;
  /** Canal de origen. Define solo el texto de las descripciones de log. */
  channel: OrderChannel;
  /**
   * F2.7-C / R6 — Timestamp de creación de la Order. Permite rechazar
   * referrals creados retroactivamente (`Referral.createdAt >= Order.createdAt`).
   * Opcional para no romper callers legacy; cuando se omite, el guard no se
   * aplica (compatibilidad).
   */
  orderCreatedAt?: Date;
}

export interface ApplyPaidPurchaseResult {
  /** Datos de la membresía resultante. null si la compra no calificaba. */
  membership: { id: string; expiresAt: Date } | null;
  /** `true` si la membresía existía y se renovó; `false` si fue alta nueva. */
  renewed: boolean;
  /** `true` si se envió correo de bienvenida (solo en altas nuevas). */
  welcomeSent: boolean;
  /** Tickets PURCHASE_REWARD otorgados al comprador (1 por cada S/25). */
  ticketsGranted: number;
  /** Bono al referente si esta era la primera compra elegible del invitado. */
  referralReward: {
    referrerUserId: string;
    bonusTickets: number;
  } | null;
  /**
   * F2.8-A — `true` cuando el engine detectó que esta orden ya tenía
   * `benefitsAppliedAt` set y devolvió un snapshot leído desde logs sin
   * ejecutar side effects. Permite a callers/telemetría distinguir
   * "primera aplicación" de "re-call idempotente".
   */
  alreadyApplied: boolean;
}

export interface RevertPaidPurchaseArgs {
  /** Orden REFUNDED — fuente de identidad para el rollback. */
  orderId: string;
  userId: string;
  customerId: string | null;
  /** Si los tickets se deben anular (FULL_RETURN/CANCELLATION). G15: PARTIAL = false. */
  reverseTickets: boolean;
  /** Si la membresía debe re-evaluarse contra otras compras elegibles. */
  revertMembership: boolean;
}

export interface RevertPaidPurchaseResult {
  ticketsReversed: number;
  membershipReverted: boolean;
}

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  // F2.7-E — `EmailsService` ya no se inyecta acá. La lógica de envío
  // (incluyendo idempotencia y auditoría) vive en
  // `MembershipNotificationsService`. Si necesitas mandar otros emails
  // no relacionados con notificaciones de ciclo Club, hazlo desde allí
  // o crea un servicio dedicado.
  constructor(
    private readonly prisma: PrismaService,
    private readonly raffleTickets: RaffleTicketsService,
    private readonly referrals: ReferralsService,
    private readonly notifications: MembershipNotificationsService,
  ) {}

  /**
   * Verdadero si el usuario tiene una membresía activa cuya `expiresAt`
   * es estrictamente mayor a `now`.
   */
  async isActive(userId: string, now: Date = new Date()): Promise<boolean> {
    if (!userId) return false;
    const membership = await this.prisma.membership.findUnique({
      where: { userId },
      select: { active: true, expiresAt: true },
    });
    return Boolean(
      membership && membership.active && membership.expiresAt > now,
    );
  }

  async findMine(userId: string): Promise<MembershipResponseDto | null> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!membership) return null;
    return this.toResponse(membership);
  }

  async findMany(
    query: MembershipQueryDto,
  ): Promise<Paginated<MembershipResponseDto>> {
    const where: Prisma.MembershipWhereInput = {};

    if (typeof query.active === 'boolean') {
      const now = new Date();
      if (query.active) {
        where.active = true;
        where.expiresAt = { gt: now };
      } else {
        where.OR = [{ active: false }, { expiresAt: { lte: now } }];
      }
    }

    if (query.search) {
      where.user = {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.membership.findMany({
        where,
        include: { user: true },
        orderBy: { expiresAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.membership.count({ where }),
    ]);

    return {
      items: items.map((m) => this.toResponse(m)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  /**
   * Activa o renueva la membresía si la compra califica. Idempotente y seguro
   * de ejecutar varias veces. Si se pasa una transacción `tx`, todas las
   * escrituras se hacen dentro de ella (para correr junto con la orden).
   */
  async activateOrRenew(args: ActivateOrRenewArgs): Promise<{
    membership: { id: string; expiresAt: Date } | null;
    renewed: boolean;
    welcomeSent: boolean;
  }> {
    const { userId, purchaseAmount, purchaseAt, tx } = args;
    if (!isQualifyingPurchase(purchaseAmount)) {
      return { membership: null, renewed: false, welcomeSent: false };
    }

    const db = tx ?? this.prisma;
    const now = purchaseAt ?? new Date();

    const existing = await db.membership.findUnique({
      where: { userId },
      select: { id: true, active: true, expiresAt: true },
    });

    const anchor =
      existing && existing.expiresAt > now ? existing.expiresAt : now;
    const nextExpiration = computeNextExpiration(anchor);

    const upserted = await db.membership.upsert({
      where: { userId },
      create: {
        userId,
        active: true,
        startedAt: now,
        expiresAt: nextExpiration,
        lastPurchaseAt: now,
      },
      update: {
        active: true,
        expiresAt: nextExpiration,
        lastPurchaseAt: now,
      },
      select: { id: true, expiresAt: true },
    });

    // F2.7-E / E1 — Welcome se envía cuando:
    //   - es alta nueva (no había Membership previo), O
    //   - el usuario vuelve tras vencimiento (existing.active === false).
    //
    // Renovación de membresía ACTIVA NO dispara welcome — el cliente ya
    // recibió uno cuando arrancó este ciclo.
    //
    // La idempotencia real vive en `MembershipNotificationsService`:
    // sendWelcomeIdempotent inserta un log row con unique key
    // (membershipId, WELCOME, referenceExpiresAt). Si por race / reintento
    // el mismo ciclo intenta mandar dos veces, el segundo intento devuelve
    // SKIPPED_ALREADY_SENT sin reabrir SMTP.
    const wasInactiveBefore = !existing || !existing.active;
    let welcomeSent = false;
    if (wasInactiveBefore) {
      const outcome = await this.notifications.sendWelcomeIdempotent({
        membershipId: upserted.id,
        userId,
        referenceExpiresAt: upserted.expiresAt,
        tx,
      });
      welcomeSent = outcome === 'SENT';
    }

    this.logger.log(
      `Membership ${existing ? 'renewed' : 'activated'} for user=${userId} expiresAt=${upserted.expiresAt.toISOString()}`,
    );

    return {
      membership: upserted,
      renewed: Boolean(existing),
      welcomeSent,
    };
  }

  /**
   * Punto de entrada UNIFICADO para los side effects de una orden que pasa a
   * PAID. Lo consumen `OrdersService.updateStatus` (ecommerce) y
   * `PosSalesService.createSale` (POS).
   *
   * Hace, en orden:
   *   1. activateOrRenew (idempotente, envía welcome solo en alta).
   *   2. Sincroniza `Customer.isMember` y `Customer.membershipExpiresAt`
   *      para que el POS y el admin reflejen el estado actual sin drift.
   *   3. Loguea `MembershipBenefitLog(DISCOUNT)` con el total cobrado.
   *   4. Otorga PURCHASE_REWARD via `RaffleTicketsService` (1 por S/25).
   *   5. Loguea `MembershipBenefitLog(RAFFLE_ENTRY)`.
   *   6. Si la primera compra elegible cierra una invitación: otorga
   *      BONUS al referente + loguea `REFERRAL_BONUS`.
   *
   * Cada paso es resistente a fallos parciales — un error en raffle no
   * deshace la membresía. La idempotencia la dan los upserts/CAS.
   */
  async applyPaidPurchase(
    args: ApplyPaidPurchaseArgs,
  ): Promise<ApplyPaidPurchaseResult> {
    const totalNumber =
      args.totalAmount instanceof Prisma.Decimal
        ? args.totalAmount.toNumber()
        : Number(args.totalAmount);

    // F2.8-A / Capa 2 — Claim atómico de aplicación de beneficios.
    //
    // CAS sobre `Order.benefitsAppliedAt`: si el campo ya tiene valor, otra
    // ejecución (race de webhook, retry de admin, doble PATCH) ya aplicó
    // los side effects → reconstruimos un snapshot leyendo el estado
    // persistido y retornamos sin tocar nada.
    //
    // Importante: este claim debe ser lo PRIMERO. Sucede antes incluso de
    // chequear si la compra califica — porque si NO califica esta vez, una
    // ejecución anterior tampoco habrá generado beneficios; el snapshot
    // resultante refleja eso (membership=null, tickets=0).
    const claim = await this.prisma.order.updateMany({
      where: { id: args.orderId, benefitsAppliedAt: null },
      data: { benefitsAppliedAt: new Date() },
    });
    if (claim.count === 0) {
      this.logger.log(
        `applyPaidPurchase skipped — order ${args.orderNumber} already processed`,
      );
      return this.buildAlreadyAppliedSnapshot(args);
    }

    // (1) Activar o renovar la membresía.
    const { membership, renewed, welcomeSent } = await this.activateOrRenew({
      userId: args.userId,
      purchaseAmount: totalNumber,
      purchaseAt: args.paidAt,
    });

    if (!membership) {
      // Compra por debajo del mínimo S/25 — no hay beneficios.
      // Nota: el claim ya marcó `benefitsAppliedAt` con timestamp; si la
      // misma orden se re-procesa, irá por el snapshot path. Eso es correcto
      // — la decisión "no califica" es estable.
      return {
        membership: null,
        renewed: false,
        welcomeSent: false,
        ticketsGranted: 0,
        referralReward: null,
        alreadyApplied: false,
      };
    }

    const channelLabel =
      args.channel === OrderChannel.POS ? 'venta POS' : 'compra';

    // (2) Sincronizar denormalización del Customer (fix ecommerce drift G4).
    if (args.customerId) {
      try {
        await this.prisma.customer.update({
          where: { id: args.customerId },
          data: {
            isMember: true,
            membershipExpiresAt: membership.expiresAt,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Customer sync failed for customer=${args.customerId}: ${String(error)}`,
        );
      }
    }

    // (3) Log de beneficio DISCOUNT (auditoría — qué orden disparó membresía).
    await this.logBenefit({
      userId: args.userId,
      orderId: args.orderId,
      type: MembershipBenefitType.DISCOUNT,
      description: renewed
        ? `Membresía renovada por ${channelLabel} ${args.orderNumber}`
        : `Membresía activada por ${channelLabel} ${args.orderNumber}`,
      amount: totalNumber,
    });

    // (4) Tickets automáticos por compra (1 por cada S/25).
    const entriesQty = computePurchaseEntries(totalNumber);
    const granted = await this.raffleTickets.grantToUser({
      userId: args.userId,
      quantity: entriesQty,
      entryType: EntryType.PURCHASE_REWARD,
      reference: args.orderNumber,
      orderId: args.orderId,
    });

    if (granted > 0) {
      await this.logBenefit({
        userId: args.userId,
        orderId: args.orderId,
        type: MembershipBenefitType.RAFFLE_ENTRY,
        description: `${granted} participación(es) automática(s) por ${channelLabel} ${args.orderNumber}`,
        amount: granted,
      });
    }

    // (5) Bono al referente — solo en la primera compra elegible del invitado.
    //
    // F2.8-B / Compensating rollback: ordenamos claim → grant → log Y, si grant
    // no materializa el ticket (no hay sorteo activo / sin asientos / throw),
    // liberamos el claim del Referral. Sin esto, claim succeeds sin grant
    // dejaría al referidor sin ticket Y al Referral marcado "rewarded" — el
    // siguiente intento (otra orden calificada del referido) no podría
    // re-disparar el bono.
    //
    // Por qué claim PRIMERO y no grant primero: si grant fuera primero, una
    // race de dos órdenes calificadas concurrentes del mismo referido podrían
    // ambas materializar tickets antes de competir por el CAS de Referral.
    // El orden actual (claim primero) garantiza single-winner aun en
    // concurrencia gracias al CAS atómico sobre `Referral.rewarded`.
    let referralReward: ApplyPaidPurchaseResult['referralReward'] = null;
    try {
      // F2.7-C / R6 — pasamos orderCreatedAt para que el guard rechace
      // referrals creados después de la orden (atribución retroactiva).
      const claim = await this.referrals.claimRewardForFirstPurchase({
        referredUserId: args.userId,
        orderCreatedAt: args.orderCreatedAt,
      });
      if (claim) {
        let materialized = false;
        try {
          const bonusGranted = await this.raffleTickets.grantToUser({
            userId: claim.referrerUserId,
            quantity: 1,
            entryType: EntryType.BONUS,
            reference: `referido ${args.orderNumber}`,
            orderId: args.orderId,
          });
          if (bonusGranted > 0) {
            await this.logBenefit({
              userId: claim.referrerUserId,
              orderId: args.orderId,
              type: MembershipBenefitType.REFERRAL_BONUS,
              description: `Bono por referido (${channelLabel} ${args.orderNumber})`,
              amount: bonusGranted,
            });
            referralReward = {
              referrerUserId: claim.referrerUserId,
              bonusTickets: bonusGranted,
            };
            materialized = true;
          }
        } finally {
          if (!materialized) {
            // F2.8-B — Liberamos el claim para que una orden futura calificada
            // del mismo referido pueda re-disparar el bono cuando haya sorteo.
            await this.referrals
              .releaseClaim({
                referralId: claim.referralId,
                expectedReferrerUserId: claim.referrerUserId,
              })
              .catch((releaseError) =>
                this.logger.error(
                  `Failed to release referral claim for ${args.orderNumber}: ${String(releaseError)}`,
                ),
              );
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        `Referral reward failed for order ${args.orderNumber}: ${String(error)}`,
      );
    }

    return {
      membership,
      renewed,
      welcomeSent,
      ticketsGranted: granted,
      referralReward,
      alreadyApplied: false,
    };
  }

  /**
   * F2.8-A — Reconstruye el resultado para una orden cuyo
   * `benefitsAppliedAt` ya está set (re-call idempotente).
   *
   * No re-ejecuta side effects. Lee:
   *   - Membership actual del usuario (puede haber sido renovada por otra
   *     orden posterior — devolvemos el estado vigente, no el histórico).
   *   - Tickets PURCHASE_REWARD efectivamente otorgados por esta orden.
   *   - Referral bonus que esta orden disparó (si existió).
   *
   * `renewed` y `welcomeSent` no son recuperables con exactitud desde el
   * estado persistido. Defaulteamos `renewed=false` (semántica del re-call:
   * no estamos renovando nada ahora) y `welcomeSent=false` (no se envió
   * email en esta llamada). Los callers que necesiten estos flags deben
   * consultar `MembershipNotificationLog` o `MembershipBenefitLog`.
   */
  private async buildAlreadyAppliedSnapshot(
    args: ApplyPaidPurchaseArgs,
  ): Promise<ApplyPaidPurchaseResult> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId: args.userId },
      select: { id: true, expiresAt: true },
    });

    const ticketsGranted = await this.prisma.raffleEntry.count({
      where: {
        orderId: args.orderId,
        type: EntryType.PURCHASE_REWARD,
        status: { in: [EntryStatus.PAID, EntryStatus.PENDING_PAYMENT] },
      },
    });

    const referralLog = await this.prisma.membershipBenefitLog.findFirst({
      where: {
        orderId: args.orderId,
        type: MembershipBenefitType.REFERRAL_BONUS,
      },
      select: { userId: true, amount: true },
    });
    const referralReward = referralLog
      ? {
          referrerUserId: referralLog.userId,
          bonusTickets: referralLog.amount ? referralLog.amount.toNumber() : 0,
        }
      : null;

    return {
      membership,
      renewed: false,
      welcomeSent: false,
      ticketsGranted,
      referralReward,
      alreadyApplied: true,
    };
  }

  /**
   * Rollback unificado disparado por nota de crédito FULL_RETURN o
   * SALE_CANCELLATION (G15: PARTIAL_RETURN no entra aquí — los tickets se
   * conservan). Lo consume `PosCreditNotesService` para no duplicar la
   * lógica de smart-revert.
   */
  async revertPaidPurchase(
    args: RevertPaidPurchaseArgs,
  ): Promise<RevertPaidPurchaseResult> {
    let ticketsReversed = 0;
    let membershipReverted = false;

    if (args.reverseTickets) {
      ticketsReversed = await this.reverseRaffleEntriesForOrder(args.orderId);
    }

    if (args.revertMembership) {
      membershipReverted = await this.smartRevertMembership({
        userId: args.userId,
        customerId: args.customerId,
        excludeOrderId: args.orderId,
      });
    }

    return { ticketsReversed, membershipReverted };
  }

  // ─── Logs de beneficios ────────────────────────────────────────────
  async logBenefit(args: {
    userId: string;
    type: MembershipBenefitType;
    description: string;
    amount?: number;
    orderId?: string;
    tx?: Tx;
  }): Promise<void> {
    const db = args.tx ?? this.prisma;
    await db.membershipBenefitLog.create({
      data: {
        userId: args.userId,
        type: args.type,
        description: args.description,
        amount:
          args.amount !== undefined ? new Prisma.Decimal(args.amount) : null,
        orderId: args.orderId,
      },
    });
  }

  async findBenefitLogs(
    query: BenefitLogQueryDto,
  ): Promise<Paginated<MembershipBenefitLogResponseDto>> {
    const where: Prisma.MembershipBenefitLogWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.userId) where.userId = query.userId;
    if (query.search) {
      where.user = {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.membershipBenefitLog.findMany({
        where,
        include: { user: true, order: { select: { number: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.membershipBenefitLog.count({ where }),
    ]);

    return {
      items: items.map((row) => ({
        id: row.id,
        type: row.type,
        description: row.description,
        amount: row.amount ? row.amount.toNumber() : null,
        user: {
          id: row.user.id,
          email: row.user.email,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
        },
        orderNumber: row.order?.number ?? null,
        createdAt: row.createdAt,
      })),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  /**
   * Endpoint para el dashboard: visión general de salud del Club.
   */
  async stats(): Promise<{
    activeMembers: number;
    expiredMembers: number;
    expiringSoon: number;
  }> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [activeMembers, expiredMembers, expiringSoon] =
      await this.prisma.$transaction([
        this.prisma.membership.count({
          where: { active: true, expiresAt: { gt: now } },
        }),
        this.prisma.membership.count({
          where: { OR: [{ active: false }, { expiresAt: { lte: now } }] },
        }),
        this.prisma.membership.count({
          where: {
            active: true,
            expiresAt: { gt: now, lte: in7Days },
          },
        }),
      ]);

    return { activeMembers, expiredMembers, expiringSoon };
  }

  async findById(id: string): Promise<MembershipResponseDto> {
    const m = await this.prisma.membership.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!m) throw new NotFoundException('Membresía no encontrada');
    return this.toResponse(m);
  }

  // ─── Internals para revertPaidPurchase ───────────────────────────────────

  private async reverseRaffleEntriesForOrder(orderId: string): Promise<number> {
    const entries = await this.prisma.raffleEntry.findMany({
      where: {
        orderId,
        status: { in: [EntryStatus.PAID, EntryStatus.PENDING_PAYMENT] },
      },
      select: { id: true, raffleId: true },
    });
    if (entries.length === 0) return 0;

    const byRaffle = new Map<string, number>();
    for (const e of entries) {
      byRaffle.set(e.raffleId, (byRaffle.get(e.raffleId) ?? 0) + 1);
    }

    let reversed = 0;
    for (const [raffleId, count] of byRaffle.entries()) {
      const updated = await this.prisma.raffleEntry.updateMany({
        where: {
          orderId,
          raffleId,
          status: { in: [EntryStatus.PAID, EntryStatus.PENDING_PAYMENT] },
        },
        data: { status: EntryStatus.CANCELLED },
      });
      reversed += updated.count;

      await this.prisma.raffle.update({
        where: { id: raffleId },
        data: { soldTickets: { decrement: count } },
      });
    }
    return reversed;
  }

  /**
   * Smart-auto rollback de membresía:
   *  - Si el cliente tiene OTRA compra PAID calificada → recalcula
   *    `expiresAt` desde esa otra y actualiza lastPurchaseAt.
   *  - Si NO hay otra compra calificada → desactiva membresía y limpia
   *    customer.isMember / membershipExpiresAt.
   *
   * Retorna `true` si revirtió la membresía (desactivada).
   */
  private async smartRevertMembership(opts: {
    userId: string;
    customerId: string | null;
    excludeOrderId: string;
  }): Promise<boolean> {
    const otherQualifying = await this.prisma.order.findFirst({
      where: {
        userId: opts.userId,
        id: { not: opts.excludeOrderId },
        status: OrderStatus.PAID,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, total: true },
    });

    const hasOtherQualifying =
      !!otherQualifying && isQualifyingPurchase(otherQualifying.total);

    if (hasOtherQualifying && otherQualifying) {
      const newExpires = computeNextExpiration(otherQualifying.createdAt);
      const now = new Date();
      const stillActive = newExpires > now;
      await this.prisma.membership.update({
        where: { userId: opts.userId },
        data: {
          active: stillActive,
          expiresAt: newExpires,
          lastPurchaseAt: otherQualifying.createdAt,
        },
      });
      if (opts.customerId) {
        await this.prisma.customer.update({
          where: { id: opts.customerId },
          data: {
            isMember: stillActive,
            membershipExpiresAt: stillActive ? newExpires : null,
          },
        });
      }
      return false;
    }

    const existing = await this.prisma.membership.findUnique({
      where: { userId: opts.userId },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.membership.update({
        where: { userId: opts.userId },
        data: {
          active: false,
          expiresAt: new Date(),
          lastPurchaseAt: null,
        },
      });
    }
    if (opts.customerId) {
      await this.prisma.customer.update({
        where: { id: opts.customerId },
        data: { isMember: false, membershipExpiresAt: null },
      });
    }
    return true;
  }

  private toResponse(
    m: Prisma.MembershipGetPayload<{ include: { user: true } }>,
  ): MembershipResponseDto {
    const status = calculateMembershipStatus(m);
    return {
      id: m.id,
      user: {
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
      },
      active: status.active,
      startedAt: m.startedAt,
      expiresAt: m.expiresAt,
      daysRemaining: status.daysRemaining ?? computeDaysRemaining(m.expiresAt),
      lastPurchaseAt: m.lastPurchaseAt,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
