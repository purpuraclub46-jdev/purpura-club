/**
 * F2.8-B — E2E flow real para Referral Rewards.
 *
 * NO usa mocks. Usa los services reales (MembershipsService, ReferralsService,
 * RaffleTicketsService, MembershipNotificationsService) y los conecta contra
 * un store stateful en memoria que implementa la subset de operaciones Prisma
 * que la flow real ejecuta.
 *
 * Cada test:
 *   1. Pre-siembra Usuario A (con referralCode), Usuario B, Referral B → A,
 *      Raffle activa.
 *   2. Crea Order para B y la lleva a PAID (capa 1 simulada por seed con
 *      benefitsAppliedAt: null).
 *   3. Invoca `MembershipsService.applyPaidPurchase(...)` — el path único
 *      por donde ecommerce + POS llaman al engine.
 *   4. Aserta sobre el estado **persistido** en el store: Referral.rewarded,
 *      MembershipBenefitLog{REFERRAL_BONUS}, RaffleEntry{BONUS} para A,
 *      Membership de B activa.
 *
 * Objetivo declarado por el usuario: que MercadoPago, webhooks, Yape y
 * cambios futuros de checkout NO puedan romper el sistema de referidos sin
 * que estos tests falten primero.
 */
import { Logger } from '@nestjs/common';
import {
  EntryStatus,
  EntryType,
  MembershipBenefitType,
  MembershipNotificationType,
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  Prisma,
  RaffleStatus,
} from '@prisma/client';
import { MembershipsService } from '../memberships/memberships.service';
import { MembershipNotificationsService } from '../memberships/membership-notifications.service';
import { RaffleTicketsService } from '../raffle-tickets/raffle-tickets.service';
import { ReferralsService } from './referrals.service';

// ─── Tipos de las filas del store (mínimos para el flow) ──────────────────
interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  referralCode: string | null;
  referredByUserId: string | null;
}
interface CustomerRow {
  id: string;
  userId: string | null;
  isMember: boolean;
  membershipExpiresAt: Date | null;
}
interface OrderRow {
  id: string;
  number: string;
  userId: string | null;
  customerId: string | null;
  status: OrderStatus;
  total: number;
  benefitsAppliedAt: Date | null;
  createdAt: Date;
}
interface MembershipRow {
  id: string;
  userId: string;
  active: boolean;
  startedAt: Date;
  expiresAt: Date;
  lastPurchaseAt: Date | null;
}
interface RaffleRow {
  id: string;
  status: RaffleStatus;
  startDate: Date;
  endDate: Date;
  totalTickets: number;
  soldTickets: number;
}
interface RaffleEntryRow {
  id: string;
  userId: string;
  raffleId: string;
  ticketNumber: number;
  type: EntryType;
  status: EntryStatus;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  orderId: string | null;
}
interface BenefitLogRow {
  id: string;
  userId: string;
  orderId: string | null;
  type: MembershipBenefitType;
  description: string;
  amount: Prisma.Decimal | null;
  createdAt: Date;
}
interface NotifLogRow {
  id: string;
  membershipId: string;
  userId: string;
  type: MembershipNotificationType;
  referenceExpiresAt: Date;
  toEmail: string;
  emailMessageId: string | null;
  sentAt: Date;
}
interface ReferralRow {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  rewarded: boolean;
  rewardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

class InMemoryStore {
  users = new Map<string, UserRow>();
  customers = new Map<string, CustomerRow>();
  orders = new Map<string, OrderRow>();
  memberships = new Map<string, MembershipRow>(); // key = userId
  raffles = new Map<string, RaffleRow>();
  raffleEntries = new Map<string, RaffleEntryRow>();
  benefitLogs = new Map<string, BenefitLogRow>();
  notifLogs = new Map<string, NotifLogRow>();
  // Unique key: (membershipId, type, referenceExpiresAt.getTime())
  notifLogUniqueIdx = new Set<string>();
  referrals = new Map<string, ReferralRow>();

  private counter = 0;
  uuid(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }
}

/**
 * Stub Prisma minimal. Implementa solo las operaciones que la flow ejecuta.
 * Cualquier llamada no soportada arroja para detectar drift entre el código
 * real y este harness.
 */
function buildPrismaStub(store: InMemoryStore) {
  const unsupported = (method: string) => () => {
    throw new Error(
      `InMemoryStore: operación no soportada en E2E stub: ${method}`,
    );
  };

  const pickSelect = <T>(row: T, select?: Record<string, true>): T => {
    if (!select) return row;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(select))
      out[k] = (row as unknown as Record<string, unknown>)[k];
    return out as unknown as T;
  };

  return {
    user: {
      findUnique: (args: {
        where: { id?: string; email?: string; referralCode?: string };
        select?: Record<string, true>;
      }) => {
        let row: UserRow | undefined;
        if (args.where.id) row = store.users.get(args.where.id);
        else if (args.where.email)
          row = [...store.users.values()].find(
            (u) => u.email === args.where.email,
          );
        else if (args.where.referralCode)
          row = [...store.users.values()].find(
            (u) => u.referralCode === args.where.referralCode,
          );
        return Promise.resolve(row ? pickSelect(row, args.select) : null);
      },
      update: unsupported('user.update'),
      create: unsupported('user.create'),
    },
    customer: {
      findUnique: (args: { where: { id: string } }) =>
        Promise.resolve(store.customers.get(args.where.id) ?? null),
      update: (args: {
        where: { id: string };
        data: Partial<CustomerRow>;
      }) => {
        const c = store.customers.get(args.where.id);
        if (!c) throw new Error('customer not found');
        Object.assign(c, args.data);
        return Promise.resolve(c);
      },
    },
    order: {
      findUniqueOrThrow: (args: { where: { id: string } }) => {
        const o = store.orders.get(args.where.id);
        if (!o) throw new Error('order not found');
        return Promise.resolve(o);
      },
      findFirst: (args: {
        where: {
          userId?: string;
          status?: OrderStatus;
          id?: { not: string };
        };
        orderBy?: unknown;
        select?: Record<string, true>;
      }) => {
        const rows = [...store.orders.values()].filter((o) => {
          if (args.where.userId && o.userId !== args.where.userId) return false;
          if (args.where.status && o.status !== args.where.status) return false;
          if (args.where.id?.not && o.id === args.where.id.not) return false;
          return true;
        });
        return Promise.resolve(rows[0] ?? null);
      },
      updateMany: (args: {
        where: { id?: string; status?: OrderStatus; benefitsAppliedAt?: null };
        data: Partial<OrderRow>;
      }) => {
        let count = 0;
        for (const o of store.orders.values()) {
          const matchId = !args.where.id || o.id === args.where.id;
          const matchStatus =
            !args.where.status || o.status === args.where.status;
          const matchBenefits =
            args.where.benefitsAppliedAt === undefined ||
            (args.where.benefitsAppliedAt === null &&
              o.benefitsAppliedAt === null);
          if (matchId && matchStatus && matchBenefits) {
            Object.assign(o, args.data);
            count += 1;
          }
        }
        return Promise.resolve({ count });
      },
    },
    membership: {
      findUnique: (args: {
        where: { userId: string };
        select?: Record<string, true>;
      }) => {
        const m = store.memberships.get(args.where.userId);
        return Promise.resolve(m ? pickSelect(m, args.select) : null);
      },
      upsert: (args: {
        where: { userId: string };
        create: Omit<MembershipRow, 'id'>;
        update: Partial<MembershipRow>;
        select?: Record<string, true>;
      }) => {
        const existing = store.memberships.get(args.where.userId);
        if (existing) {
          Object.assign(existing, args.update);
          return Promise.resolve(pickSelect(existing, args.select));
        }
        const fresh: MembershipRow = {
          id: store.uuid('m'),
          ...args.create,
        };
        store.memberships.set(fresh.userId, fresh);
        return Promise.resolve(pickSelect(fresh, args.select));
      },
      update: (args: {
        where: { userId: string };
        data: Partial<MembershipRow>;
      }) => {
        const m = store.memberships.get(args.where.userId);
        if (!m) throw new Error('membership not found');
        Object.assign(m, args.data);
        return Promise.resolve(m);
      },
    },
    raffle: {
      findFirst: (args: {
        where: { status: RaffleStatus; startDate?: unknown; endDate?: unknown };
        orderBy?: unknown;
        select?: Record<string, true>;
      }) => {
        const now = new Date();
        const rows = [...store.raffles.values()]
          .filter(
            (r) =>
              r.status === args.where.status &&
              r.startDate <= now &&
              r.endDate > now,
          )
          .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
        return Promise.resolve(rows[0] ? pickSelect(rows[0], args.select) : null);
      },
      updateMany: (args: {
        where: {
          id: string;
          status: RaffleStatus;
          soldTickets: number;
          totalTickets?: { gte: number };
        };
        data: { soldTickets: { increment: number } };
      }) => {
        const r = store.raffles.get(args.where.id);
        if (!r) return Promise.resolve({ count: 0 });
        if (r.status !== args.where.status) return Promise.resolve({ count: 0 });
        if (r.soldTickets !== args.where.soldTickets)
          return Promise.resolve({ count: 0 });
        if (
          args.where.totalTickets?.gte !== undefined &&
          r.totalTickets < args.where.totalTickets.gte
        )
          return Promise.resolve({ count: 0 });
        r.soldTickets += args.data.soldTickets.increment;
        return Promise.resolve({ count: 1 });
      },
      update: unsupported('raffle.update'),
    },
    raffleEntry: {
      createMany: (args: {
        data: Omit<RaffleEntryRow, 'id'>[];
        skipDuplicates?: boolean;
      }) => {
        let inserted = 0;
        for (const entry of args.data) {
          // unique: (raffleId, ticketNumber)
          const dup = [...store.raffleEntries.values()].some(
            (e) =>
              e.raffleId === entry.raffleId &&
              e.ticketNumber === entry.ticketNumber,
          );
          if (dup && args.skipDuplicates) continue;
          const row: RaffleEntryRow = { id: store.uuid('re'), ...entry };
          store.raffleEntries.set(row.id, row);
          inserted += 1;
        }
        return Promise.resolve({ count: inserted });
      },
      count: (args: {
        where: {
          orderId?: string;
          userId?: string;
          type?: EntryType;
          status?: { in: EntryStatus[] };
        };
      }) => {
        const count = [...store.raffleEntries.values()].filter((e) => {
          if (args.where.orderId && e.orderId !== args.where.orderId)
            return false;
          if (args.where.userId && e.userId !== args.where.userId) return false;
          if (args.where.type && e.type !== args.where.type) return false;
          if (args.where.status?.in && !args.where.status.in.includes(e.status))
            return false;
          return true;
        }).length;
        return Promise.resolve(count);
      },
    },
    membershipBenefitLog: {
      create: (args: { data: Omit<BenefitLogRow, 'id' | 'createdAt'> }) => {
        const row: BenefitLogRow = {
          id: store.uuid('bl'),
          createdAt: new Date(),
          ...args.data,
        };
        store.benefitLogs.set(row.id, row);
        return Promise.resolve(row);
      },
      findFirst: (args: {
        where: { orderId?: string; type?: MembershipBenefitType };
        select?: Record<string, true>;
      }) => {
        const row = [...store.benefitLogs.values()].find(
          (b) =>
            (!args.where.orderId || b.orderId === args.where.orderId) &&
            (!args.where.type || b.type === args.where.type),
        );
        return Promise.resolve(row ? pickSelect(row, args.select) : null);
      },
    },
    membershipNotificationLog: {
      create: (args: {
        data: Omit<NotifLogRow, 'id' | 'sentAt' | 'emailMessageId'>;
        select?: { id: true };
      }) => {
        const key = `${args.data.membershipId}|${args.data.type}|${args.data.referenceExpiresAt.getTime()}`;
        if (store.notifLogUniqueIdx.has(key)) {
          const err = new Prisma.PrismaClientKnownRequestError(
            'Unique constraint violation',
            { code: 'P2002', clientVersion: 'test' },
          );
          return Promise.reject(err);
        }
        store.notifLogUniqueIdx.add(key);
        const row: NotifLogRow = {
          id: store.uuid('nl'),
          sentAt: new Date(),
          emailMessageId: null,
          ...args.data,
        };
        store.notifLogs.set(row.id, row);
        return Promise.resolve(args.select ? { id: row.id } : row);
      },
      update: (args: {
        where: { id: string };
        data: Partial<NotifLogRow>;
      }) => {
        const r = store.notifLogs.get(args.where.id);
        if (!r) throw new Error('notif log not found');
        Object.assign(r, args.data);
        return Promise.resolve(r);
      },
    },
    referral: {
      findUnique: (args: {
        where: { referredUserId?: string; id?: string };
        select?: Record<string, true>;
      }) => {
        let row: ReferralRow | undefined;
        if (args.where.id) row = store.referrals.get(args.where.id);
        else if (args.where.referredUserId)
          row = [...store.referrals.values()].find(
            (r) => r.referredUserId === args.where.referredUserId,
          );
        return Promise.resolve(row ? pickSelect(row, args.select) : null);
      },
      create: (args: { data: Omit<ReferralRow, 'id' | 'createdAt' | 'updatedAt' | 'rewardedAt'> & { rewarded?: boolean } }) => {
        const now = new Date();
        const row: ReferralRow = {
          id: store.uuid('ref'),
          referrerUserId: args.data.referrerUserId,
          referredUserId: args.data.referredUserId,
          rewarded: args.data.rewarded ?? false,
          rewardedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        store.referrals.set(row.id, row);
        return Promise.resolve(row);
      },
      updateMany: (args: {
        where: {
          id?: string;
          rewarded?: boolean;
          referrerUserId?: string;
        };
        data: Partial<ReferralRow>;
      }) => {
        let count = 0;
        for (const r of store.referrals.values()) {
          const matchId = !args.where.id || r.id === args.where.id;
          const matchRewarded =
            args.where.rewarded === undefined ||
            r.rewarded === args.where.rewarded;
          const matchReferrer =
            !args.where.referrerUserId ||
            r.referrerUserId === args.where.referrerUserId;
          if (matchId && matchRewarded && matchReferrer) {
            Object.assign(r, args.data, { updatedAt: new Date() });
            count += 1;
          }
        }
        return Promise.resolve({ count });
      },
    },
  };
}

interface FakeEmailsService {
  sendWelcomeMembership: jest.Mock;
  sendExpirationReminder: jest.Mock;
}

function buildFakeEmailsService(): FakeEmailsService {
  return {
    sendWelcomeMembership: jest.fn().mockResolvedValue({ id: 'msg-welcome' }),
    sendExpirationReminder: jest.fn().mockResolvedValue({ id: 'msg-reminder' }),
  };
}

// ─── Test setup ────────────────────────────────────────────────────────────
describe('F2.8-B — Referral Rewards E2E flow', () => {
  let store: InMemoryStore;
  let prisma: ReturnType<typeof buildPrismaStub>;
  let memberships: MembershipsService;
  let referrals: ReferralsService;
  let raffleTickets: RaffleTicketsService;
  let notifications: MembershipNotificationsService;
  let emails: FakeEmailsService;

  // Silenciar logs durante los tests (limpieza de output).
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    store = new InMemoryStore();
    prisma = buildPrismaStub(store);
    emails = buildFakeEmailsService();

    referrals = new ReferralsService(prisma as never);
    raffleTickets = new RaffleTicketsService(prisma as never);
    notifications = new MembershipNotificationsService(
      prisma as never,
      emails as never,
    );
    memberships = new MembershipsService(
      prisma as never,
      raffleTickets,
      referrals,
      notifications,
    );
  });

  // ─── Helpers de seed ─────────────────────────────────────────────────────
  function seedUser(opts: {
    id: string;
    email: string;
    referralCode?: string;
    referredByUserId?: string;
  }): UserRow {
    const row: UserRow = {
      id: opts.id,
      email: opts.email,
      firstName: opts.id.toUpperCase(),
      lastName: 'Surname',
      referralCode: opts.referralCode ?? null,
      referredByUserId: opts.referredByUserId ?? null,
    };
    store.users.set(row.id, row);
    return row;
  }

  function seedActiveRaffle(opts?: {
    totalTickets?: number;
    soldTickets?: number;
  }): RaffleRow {
    const now = new Date();
    const row: RaffleRow = {
      id: store.uuid('raf'),
      status: RaffleStatus.PUBLISHED,
      startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      totalTickets: opts?.totalTickets ?? 1000,
      soldTickets: opts?.soldTickets ?? 0,
    };
    store.raffles.set(row.id, row);
    return row;
  }

  function seedOrder(opts: {
    id: string;
    userId: string;
    total: number;
    customerId?: string | null;
    createdAt?: Date;
  }): OrderRow {
    const row: OrderRow = {
      id: opts.id,
      number: `ORD-${opts.id}`,
      userId: opts.userId,
      customerId: opts.customerId ?? null,
      status: OrderStatus.PAID,
      total: opts.total,
      benefitsAppliedAt: null,
      createdAt: opts.createdAt ?? new Date(),
    };
    store.orders.set(row.id, row);
    return row;
  }

  async function setupAReferringBWithActiveRaffle(): Promise<{
    A: UserRow;
    B: UserRow;
    raffle: RaffleRow;
  }> {
    const A = seedUser({
      id: 'user-A',
      email: 'a@example.com',
      referralCode: 'PCLUB-AAAAAA',
    });
    const B = seedUser({
      id: 'user-B',
      email: 'b@example.com',
      referredByUserId: A.id,
    });
    // Linkage real vía ReferralsService.link — emula el path de auth.register.
    await referrals.link({
      referrerUserId: A.id,
      referredUserId: B.id,
    });
    // Importante: el link queda con createdAt = ahora. Las órdenes E2E
    // deben usar createdAt POSTERIOR para no caer en R6 (late-linkage).
    const raffle = seedActiveRaffle();
    return { A, B, raffle };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // E2E-1 — Compra válida >= S/25 → reward creada
  // ═══════════════════════════════════════════════════════════════════════
  it('E2E-1 — Compra B = S/25 → A recibe exactamente 1 ticket BONUS + log REFERRAL_BONUS', async () => {
    const { A, B } = await setupAReferringBWithActiveRaffle();
    const orderCreatedAt = new Date(Date.now() + 1_000); // > Referral.createdAt
    const order = seedOrder({
      id: 'order-1',
      userId: B.id,
      total: 25,
      createdAt: orderCreatedAt,
    });

    const result = await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: order.id,
      orderNumber: order.number,
      totalAmount: 25,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt,
    });

    // Engine devuelve el referralReward correcto.
    expect(result.referralReward).toEqual({
      referrerUserId: A.id,
      bonusTickets: 1,
    });

    // Estado persistido — Referral marcado.
    const refs = [...store.referrals.values()];
    expect(refs).toHaveLength(1);
    expect(refs[0].rewarded).toBe(true);
    expect(refs[0].rewardedAt).toBeInstanceOf(Date);
    expect(refs[0].referrerUserId).toBe(A.id);
    expect(refs[0].referredUserId).toBe(B.id);

    // RaffleEntry de tipo BONUS para A (exactamente 1).
    const bonusEntries = [...store.raffleEntries.values()].filter(
      (e) => e.userId === A.id && e.type === EntryType.BONUS,
    );
    expect(bonusEntries).toHaveLength(1);
    expect(bonusEntries[0].orderId).toBe(order.id);

    // Log REFERRAL_BONUS para A.
    const refLogs = [...store.benefitLogs.values()].filter(
      (b) => b.type === MembershipBenefitType.REFERRAL_BONUS,
    );
    expect(refLogs).toHaveLength(1);
    expect(refLogs[0].userId).toBe(A.id);
    expect(refLogs[0].orderId).toBe(order.id);

    // Capa 2 F2.8-A: la orden quedó con benefitsAppliedAt set.
    expect(store.orders.get(order.id)!.benefitsAppliedAt).toBeInstanceOf(Date);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E-2 — Compra < 25 → reward NO creada
  // ═══════════════════════════════════════════════════════════════════════
  it('E2E-2 — Compra B = S/24 → engine no llega al paso (5), Referral queda pendiente, A no recibe nada', async () => {
    const { A, B } = await setupAReferringBWithActiveRaffle();
    const orderCreatedAt = new Date(Date.now() + 1_000);
    const order = seedOrder({
      id: 'order-2',
      userId: B.id,
      total: 24,
      createdAt: orderCreatedAt,
    });

    const result = await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: order.id,
      orderNumber: order.number,
      totalAmount: 24,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt,
    });

    expect(result.membership).toBeNull();
    expect(result.referralReward).toBeNull();

    // Referral intacto (pendiente).
    const refs = [...store.referrals.values()];
    expect(refs).toHaveLength(1);
    expect(refs[0].rewarded).toBe(false);

    // A no tiene ningún ticket.
    const bonusEntries = [...store.raffleEntries.values()].filter(
      (e) => e.userId === A.id,
    );
    expect(bonusEntries).toHaveLength(0);

    // Sin logs de REFERRAL_BONUS.
    const refLogs = [...store.benefitLogs.values()].filter(
      (b) => b.type === MembershipBenefitType.REFERRAL_BONUS,
    );
    expect(refLogs).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E-3 — Dos órdenes válidas del mismo referido → 1 sola recompensa
  // ═══════════════════════════════════════════════════════════════════════
  it('E2E-3 — 2 órdenes calificadas de B (S/30 + S/100) → A recibe EXACTAMENTE 1 ticket BONUS (no 2)', async () => {
    const { A, B } = await setupAReferringBWithActiveRaffle();
    const t0 = Date.now();
    const order1 = seedOrder({
      id: 'order-3a',
      userId: B.id,
      total: 30,
      createdAt: new Date(t0 + 1_000),
    });
    const order2 = seedOrder({
      id: 'order-3b',
      userId: B.id,
      total: 100,
      createdAt: new Date(t0 + 2_000),
    });

    const r1 = await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: order1.id,
      orderNumber: order1.number,
      totalAmount: 30,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt: order1.createdAt,
    });
    const r2 = await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: order2.id,
      orderNumber: order2.number,
      totalAmount: 100,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt: order2.createdAt,
    });

    // Solo la primera produce reward.
    expect(r1.referralReward).toEqual({
      referrerUserId: A.id,
      bonusTickets: 1,
    });
    expect(r2.referralReward).toBeNull();

    // Total BONUS para A: 1 (no 2).
    const bonusEntries = [...store.raffleEntries.values()].filter(
      (e) => e.userId === A.id && e.type === EntryType.BONUS,
    );
    expect(bonusEntries).toHaveLength(1);

    // Log REFERRAL_BONUS: 1.
    const refLogs = [...store.benefitLogs.values()].filter(
      (b) => b.type === MembershipBenefitType.REFERRAL_BONUS,
    );
    expect(refLogs).toHaveLength(1);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E-4 — Doble ejecución del Benefits Engine → sin duplicados
  // ═══════════════════════════════════════════════════════════════════════
  it('E2E-4 — Mismo orderId procesado dos veces → A recibe 1 ticket (capa 2 CAS bloquea segunda)', async () => {
    const { A, B } = await setupAReferringBWithActiveRaffle();
    const orderCreatedAt = new Date(Date.now() + 1_000);
    const order = seedOrder({
      id: 'order-4',
      userId: B.id,
      total: 30,
      createdAt: orderCreatedAt,
    });

    const r1 = await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: order.id,
      orderNumber: order.number,
      totalAmount: 30,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt,
    });
    const r2 = await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: order.id,
      orderNumber: order.number,
      totalAmount: 30,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt,
    });

    // Primera fue real; segunda fue snapshot.
    expect(r1.alreadyApplied).toBe(false);
    expect(r2.alreadyApplied).toBe(true);

    // Snapshot retorna referralReward leído del log persistido.
    expect(r2.referralReward).toEqual({
      referrerUserId: A.id,
      bonusTickets: 1,
    });

    // Total BONUS para A: 1 (no 2 — F2.8-A Capa 2 bloqueó la 2da ejecución).
    const bonusEntries = [...store.raffleEntries.values()].filter(
      (e) => e.userId === A.id && e.type === EntryType.BONUS,
    );
    expect(bonusEntries).toHaveLength(1);

    // Log REFERRAL_BONUS: 1.
    const refLogs = [...store.benefitLogs.values()].filter(
      (b) => b.type === MembershipBenefitType.REFERRAL_BONUS,
    );
    expect(refLogs).toHaveLength(1);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E-5 — Cross-user isolation: usuarios nunca reciben recompensas ajenas
  // ═══════════════════════════════════════════════════════════════════════
  it('E2E-5 — A refiere a B y a C; compras separadas → cada uno premia a A 1 vez, total 2 BONUS', async () => {
    const A = seedUser({
      id: 'user-A',
      email: 'a@example.com',
      referralCode: 'PCLUB-AAAAAA',
    });
    const B = seedUser({
      id: 'user-B',
      email: 'b@example.com',
      referredByUserId: A.id,
    });
    const C = seedUser({
      id: 'user-C',
      email: 'c@example.com',
      referredByUserId: A.id,
    });
    // X = referido por OTRO usuario (no por A).
    const Z = seedUser({
      id: 'user-Z',
      email: 'z@example.com',
      referralCode: 'PCLUB-ZZZZZZ',
    });
    const X = seedUser({
      id: 'user-X',
      email: 'x@example.com',
      referredByUserId: Z.id,
    });

    await referrals.link({ referrerUserId: A.id, referredUserId: B.id });
    await referrals.link({ referrerUserId: A.id, referredUserId: C.id });
    await referrals.link({ referrerUserId: Z.id, referredUserId: X.id });
    seedActiveRaffle();

    const t0 = Date.now();
    const orderB = seedOrder({
      id: 'order-B',
      userId: B.id,
      total: 50,
      createdAt: new Date(t0 + 1_000),
    });
    const orderC = seedOrder({
      id: 'order-C',
      userId: C.id,
      total: 30,
      createdAt: new Date(t0 + 2_000),
    });
    const orderX = seedOrder({
      id: 'order-X',
      userId: X.id,
      total: 40,
      createdAt: new Date(t0 + 3_000),
    });

    await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: orderB.id,
      orderNumber: orderB.number,
      totalAmount: 50,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt: orderB.createdAt,
    });
    await memberships.applyPaidPurchase({
      userId: C.id,
      customerId: null,
      orderId: orderC.id,
      orderNumber: orderC.number,
      totalAmount: 30,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt: orderC.createdAt,
    });
    await memberships.applyPaidPurchase({
      userId: X.id,
      customerId: null,
      orderId: orderX.id,
      orderNumber: orderX.number,
      totalAmount: 40,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt: orderX.createdAt,
    });

    // A recibió 2 BONUS (uno por B, uno por C).
    const ABonus = [...store.raffleEntries.values()].filter(
      (e) => e.userId === A.id && e.type === EntryType.BONUS,
    );
    expect(ABonus).toHaveLength(2);
    expect(new Set(ABonus.map((e) => e.orderId))).toEqual(
      new Set([orderB.id, orderC.id]),
    );

    // Z recibió 1 BONUS (de X).
    const ZBonus = [...store.raffleEntries.values()].filter(
      (e) => e.userId === Z.id && e.type === EntryType.BONUS,
    );
    expect(ZBonus).toHaveLength(1);
    expect(ZBonus[0].orderId).toBe(orderX.id);

    // SECURITY: A NUNCA tiene un BONUS que provenga de la orden de X.
    expect(
      [...store.raffleEntries.values()].some(
        (e) =>
          e.userId === A.id &&
          e.type === EntryType.BONUS &&
          e.orderId === orderX.id,
      ),
    ).toBe(false);
    // Z NUNCA tiene un BONUS de las órdenes de B o C.
    expect(
      [...store.raffleEntries.values()].some(
        (e) =>
          e.userId === Z.id &&
          e.type === EntryType.BONUS &&
          (e.orderId === orderB.id || e.orderId === orderC.id),
      ),
    ).toBe(false);

    // Audit logs respetan la pertenencia.
    const aLogs = [...store.benefitLogs.values()].filter(
      (b) => b.type === MembershipBenefitType.REFERRAL_BONUS && b.userId === A.id,
    );
    const zLogs = [...store.benefitLogs.values()].filter(
      (b) => b.type === MembershipBenefitType.REFERRAL_BONUS && b.userId === Z.id,
    );
    expect(aLogs).toHaveLength(2);
    expect(zLogs).toHaveLength(1);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E-6 — Hardening F2.8-B: grant retorna 0 (sin sorteo) → releaseClaim
  //          restablece Referral y la NEXT orden califica re-dispara el bono
  // ═══════════════════════════════════════════════════════════════════════
  it('E2E-6 — Hardening F2.8-B: sin sorteo activo en 1ª orden → Referral liberado → 2ª orden con sorteo SÍ premia', async () => {
    const A = seedUser({
      id: 'user-A',
      email: 'a@example.com',
      referralCode: 'PCLUB-AAAAAA',
    });
    const B = seedUser({
      id: 'user-B',
      email: 'b@example.com',
      referredByUserId: A.id,
    });
    await referrals.link({ referrerUserId: A.id, referredUserId: B.id });
    // NO sembramos raffle inicialmente.

    const t0 = Date.now();
    const order1 = seedOrder({
      id: 'order-6a',
      userId: B.id,
      total: 30,
      createdAt: new Date(t0 + 1_000),
    });
    await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: order1.id,
      orderNumber: order1.number,
      totalAmount: 30,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt: order1.createdAt,
    });

    // Referral DEBE seguir pendiente (releaseClaim funcionó).
    const refsAfter1 = [...store.referrals.values()];
    expect(refsAfter1[0].rewarded).toBe(false);
    expect(refsAfter1[0].rewardedAt).toBeNull();

    // Ahora sí: activamos sorteo y B compra de nuevo.
    seedActiveRaffle();
    const order2 = seedOrder({
      id: 'order-6b',
      userId: B.id,
      total: 30,
      createdAt: new Date(t0 + 2_000),
    });
    const r2 = await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: order2.id,
      orderNumber: order2.number,
      totalAmount: 30,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt: order2.createdAt,
    });

    expect(r2.referralReward).toEqual({
      referrerUserId: A.id,
      bonusTickets: 1,
    });
    const aBonus = [...store.raffleEntries.values()].filter(
      (e) => e.userId === A.id && e.type === EntryType.BONUS,
    );
    expect(aBonus).toHaveLength(1);
    expect(aBonus[0].orderId).toBe(order2.id);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Audit story — debe ser posible responder: quién/quién/qué orden/cuándo
  // ═══════════════════════════════════════════════════════════════════════
  it('Audit — query reconstructiva: quién refirió, quién fue referido, qué orden, cuándo', async () => {
    const { A, B } = await setupAReferringBWithActiveRaffle();
    const orderCreatedAt = new Date(Date.now() + 1_000);
    const order = seedOrder({
      id: 'order-audit',
      userId: B.id,
      total: 30,
      createdAt: orderCreatedAt,
    });
    await memberships.applyPaidPurchase({
      userId: B.id,
      customerId: null,
      orderId: order.id,
      orderNumber: order.number,
      totalAmount: 30,
      paidAt: new Date(),
      channel: OrderChannel.ECOMMERCE,
      orderCreatedAt,
    });

    // 1. Quién refirió + quién fue referido → Referral.
    const referral = [...store.referrals.values()][0];
    expect(referral.referrerUserId).toBe(A.id);
    expect(referral.referredUserId).toBe(B.id);

    // 2. Qué orden disparó → MembershipBenefitLog{type:REFERRAL_BONUS}.orderId.
    const log = [...store.benefitLogs.values()].find(
      (b) =>
        b.type === MembershipBenefitType.REFERRAL_BONUS && b.userId === A.id,
    );
    expect(log).toBeDefined();
    expect(log!.orderId).toBe(order.id);

    // 3. Cuándo se otorgó → Referral.rewardedAt + log.createdAt.
    expect(referral.rewardedAt).toBeInstanceOf(Date);
    expect(log!.createdAt).toBeInstanceOf(Date);

    // 4. Trazabilidad cruzada: la orden persiste con userId del referido.
    const orderRow = store.orders.get(order.id)!;
    expect(orderRow.userId).toBe(B.id);
  });
});
