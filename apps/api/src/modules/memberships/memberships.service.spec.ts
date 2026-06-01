import { Test, TestingModule } from '@nestjs/testing';
import { EntryType, MembershipBenefitType, OrderChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MembershipNotificationsService } from './membership-notifications.service';
import { RaffleTicketsService } from '../raffle-tickets/raffle-tickets.service';
import { ReferralsService } from '../referrals/referrals.service';
import { MembershipsService } from './memberships.service';

type BenefitLogCreateArgs = [
  {
    data: {
      userId: string;
      type: MembershipBenefitType;
      description: string;
      amount: unknown;
      orderId?: string;
    };
  },
];

type CustomerUpdateArgs = [
  {
    where: { id: string };
    data: { isMember: boolean; membershipExpiresAt: Date | null };
  },
];

/**
 * F2.7-A — Tests del Membership Engine unificado (T11.*).
 *
 * Cubren:
 *   - applyPaidPurchase (path único para ecommerce + POS)
 *   - revertPaidPurchase (smart-revert centralizado)
 *
 * Estrategia: mocks de PrismaService, EmailsService, RaffleTicketsService y
 * ReferralsService. Validamos que la lógica de orquestación (orden de pasos +
 * arguments) es correcta y que cumple las reglas de negocio definitivas:
 *   G4 — siempre sincroniza Customer.isMember (ecommerce ya no queda atrás).
 *   G7 — pricing engine vive en pricing.util (no aquí).
 *   G15 — PARTIAL_RETURN no revoca tickets (reverseTickets=false).
 */

type PrismaMock = {
  membership: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
  user: { findUnique: jest.Mock };
  customer: { update: jest.Mock };
  membershipBenefitLog: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  // F2.8-A — `updateMany` para CAS de benefitsAppliedAt + findFirst legacy
  order: { findFirst: jest.Mock; updateMany: jest.Mock };
  raffleEntry: {
    findMany: jest.Mock;
    updateMany: jest.Mock;
    count: jest.Mock;
  };
  raffle: { update: jest.Mock };
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  return {
    membership: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    customer: { update: jest.fn() },
    membershipBenefitLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      // F2.8-A — default: claim ganado (count=1) para no romper tests existentes.
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    raffleEntry: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    raffle: { update: jest.fn() },
    $transaction: jest.fn(),
  };
}

describe('MembershipsService — F2.7-A Membership Engine unificado', () => {
  let service: MembershipsService;
  let prisma: PrismaMock;
  let raffleTickets: { grantToUser: jest.Mock };
  let referrals: {
    claimRewardForFirstPurchase: jest.Mock;
    releaseClaim: jest.Mock;
    link: jest.Mock;
  };
  // F2.7-E — Welcome ahora pasa por MembershipNotificationsService.
  // Mockeamos sólo lo que activateOrRenew toca.
  let notifications: { sendWelcomeIdempotent: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    raffleTickets = { grantToUser: jest.fn().mockResolvedValue(0) };
    referrals = {
      claimRewardForFirstPurchase: jest.fn().mockResolvedValue(null),
      releaseClaim: jest.fn().mockResolvedValue(true),
      link: jest.fn(),
    };
    notifications = {
      sendWelcomeIdempotent: jest.fn().mockResolvedValue('SENT'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RaffleTicketsService, useValue: raffleTickets },
        { provide: ReferralsService, useValue: referrals },
        {
          provide: MembershipNotificationsService,
          useValue: notifications,
        },
      ],
    }).compile();

    service = module.get<MembershipsService>(MembershipsService);
  });

  describe('applyPaidPurchase — punto de entrada unificado', () => {
    it('T11.1 — compra < S/25 (no calificable) → no toca membership, customer ni tickets', async () => {
      const result = await service.applyPaidPurchase({
        userId: 'user-1',
        customerId: 'cust-1',
        orderId: 'order-1',
        orderNumber: 'ORD-001',
        totalAmount: 20,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(result).toEqual({
        membership: null,
        renewed: false,
        welcomeSent: false,
        ticketsGranted: 0,
        referralReward: null,
        alreadyApplied: false,
      });
      expect(prisma.membership.upsert).not.toHaveBeenCalled();
      expect(prisma.customer.update).not.toHaveBeenCalled();
      expect(prisma.membershipBenefitLog.create).not.toHaveBeenCalled();
      expect(raffleTickets.grantToUser).not.toHaveBeenCalled();
    });

    it('T11.2 — primera compra elegible (S/50) → activa membership, sincroniza customer, otorga 2 tickets, envía welcome', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null); // no existía
      const expiresAt = new Date('2026-06-30T10:00:00Z');
      prisma.membership.upsert.mockResolvedValueOnce({ id: 'm-1', expiresAt });
      prisma.user.findUnique.mockResolvedValueOnce({
        email: 'jane@example.com',
        firstName: 'Jane',
      });
      raffleTickets.grantToUser.mockResolvedValueOnce(2);

      const result = await service.applyPaidPurchase({
        userId: 'user-1',
        customerId: 'cust-1',
        orderId: 'order-1',
        orderNumber: 'ORD-001',
        totalAmount: 50,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(result.membership).toEqual({ id: 'm-1', expiresAt });
      expect(result.renewed).toBe(false);
      expect(result.welcomeSent).toBe(true);
      expect(result.ticketsGranted).toBe(2);

      // G4 — ecommerce sincroniza Customer.isMember (cerraba el drift con POS).
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { isMember: true, membershipExpiresAt: expiresAt },
      });

      // Log DISCOUNT + log RAFFLE_ENTRY.
      const benefitCalls = prisma.membershipBenefitLog.create.mock
        .calls as BenefitLogCreateArgs[];
      const benefitTypes = benefitCalls.map((c) => c[0].data.type);
      expect(benefitTypes).toContain(MembershipBenefitType.DISCOUNT);
      expect(benefitTypes).toContain(MembershipBenefitType.RAFFLE_ENTRY);

      expect(raffleTickets.grantToUser).toHaveBeenCalledWith({
        userId: 'user-1',
        quantity: 2,
        entryType: EntryType.PURCHASE_REWARD,
        reference: 'ORD-001',
        orderId: 'order-1',
      });

      // F2.7-E — Welcome ahora se delega al MembershipNotificationsService.
      expect(notifications.sendWelcomeIdempotent).toHaveBeenCalledWith(
        expect.objectContaining({
          membershipId: expect.any(String),
          userId: 'user-1',
          referenceExpiresAt: expiresAt,
        }),
      );
    });

    it('T11.3 — renovación de membresía ACTIVA → renewed=true, NO envía welcome (E1)', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: 'm-existing',
        active: true,
        expiresAt: new Date('2026-06-15T10:00:00Z'),
      });
      const renewedExpires = new Date('2026-07-15T10:00:00Z');
      prisma.membership.upsert.mockResolvedValueOnce({
        id: 'm-existing',
        expiresAt: renewedExpires,
      });
      raffleTickets.grantToUser.mockResolvedValueOnce(3);

      const result = await service.applyPaidPurchase({
        userId: 'user-1',
        customerId: 'cust-1',
        orderId: 'order-2',
        orderNumber: 'ORD-002',
        totalAmount: 75,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.POS,
      });

      expect(result.renewed).toBe(true);
      expect(result.welcomeSent).toBe(false);
      expect(result.ticketsGranted).toBe(3);
      // F2.7-E / E1 — Renovación de membresía ACTIVA NO debe llamar al notificador.
      expect(notifications.sendWelcomeIdempotent).not.toHaveBeenCalled();

      // El log DISCOUNT debe decir "renovada" (channel=POS → "venta POS").
      const discountLog = (
        prisma.membershipBenefitLog.create.mock.calls as BenefitLogCreateArgs[]
      ).find((c) => c[0].data.type === MembershipBenefitType.DISCOUNT);
      expect(discountLog).toBeDefined();
      expect(discountLog![0].data.description).toContain('renovada');
      expect(discountLog![0].data.description).toContain('venta POS');
    });

    it('T11.4 — primera compra del invitado → otorga BONUS al referente y loguea REFERRAL_BONUS', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null);
      const expiresAt = new Date('2026-06-30T10:00:00Z');
      prisma.membership.upsert.mockResolvedValueOnce({ id: 'm-1', expiresAt });
      prisma.user.findUnique.mockResolvedValueOnce({
        email: 'invitee@example.com',
        firstName: 'Invitee',
      });
      raffleTickets.grantToUser
        .mockResolvedValueOnce(1) // tickets del comprador
        .mockResolvedValueOnce(1); // bono del referente

      referrals.claimRewardForFirstPurchase.mockResolvedValueOnce({
        referralId: 'ref-1',
        referrerUserId: 'user-referrer',
      });

      const result = await service.applyPaidPurchase({
        userId: 'user-invitee',
        customerId: 'cust-invitee',
        orderId: 'order-1',
        orderNumber: 'ORD-INV-001',
        totalAmount: 25,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(result.referralReward).toEqual({
        referrerUserId: 'user-referrer',
        bonusTickets: 1,
      });

      // Verificar que se llamó a grantToUser con el referente y BONUS.
      type GrantArgs = [{ userId: string; entryType?: EntryType }];
      const referralCall = (
        raffleTickets.grantToUser.mock.calls as GrantArgs[]
      ).find(
        (c) =>
          c[0].userId === 'user-referrer' && c[0].entryType === EntryType.BONUS,
      );
      expect(referralCall).toBeDefined();

      const referralLog = (
        prisma.membershipBenefitLog.create.mock.calls as BenefitLogCreateArgs[]
      ).find((c) => c[0].data.type === MembershipBenefitType.REFERRAL_BONUS);
      expect(referralLog).toBeDefined();
      expect(referralLog![0].data.userId).toBe('user-referrer');
    });

    it('T11.5 — outcome SEND_FAILED del notificador → welcomeSent=false, applyPaidPurchase completa OK', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null);
      const expiresAt = new Date('2026-06-30T10:00:00Z');
      prisma.membership.upsert.mockResolvedValueOnce({ id: 'm-1', expiresAt });
      // F2.7-E — el notifier devuelve SEND_FAILED (claim hizo insert pero
      // provider falló). applyPaidPurchase NO debe re-throwear.
      notifications.sendWelcomeIdempotent.mockResolvedValueOnce('SEND_FAILED');
      raffleTickets.grantToUser.mockResolvedValueOnce(1);

      const result = await service.applyPaidPurchase({
        userId: 'user-1',
        customerId: 'cust-1',
        orderId: 'order-1',
        orderNumber: 'ORD-001',
        totalAmount: 30,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      // welcomeSent=false porque el outcome no fue 'SENT'.
      expect(result.welcomeSent).toBe(false);
      expect(result.membership).toEqual({ id: 'm-1', expiresAt });
      expect(result.ticketsGranted).toBe(1);
    });

    it('T16.1 — F2.8-B compensating rollback: grant retorna 0 → releaseClaim invocado', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null);
      prisma.membership.upsert.mockResolvedValueOnce({
        id: 'm-1',
        expiresAt: new Date('2026-06-30T10:00:00Z'),
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        email: 'invitee@example.com',
        firstName: 'Invitee',
      });
      // Tickets del comprador OK, pero el bono del referente retorna 0
      // (sin sorteo activo).
      raffleTickets.grantToUser
        .mockResolvedValueOnce(1) // tickets comprador
        .mockResolvedValueOnce(0); // bono referente → 0
      referrals.claimRewardForFirstPurchase.mockResolvedValueOnce({
        referralId: 'ref-1',
        referrerUserId: 'user-referrer',
      });

      const result = await service.applyPaidPurchase({
        userId: 'user-invitee',
        customerId: 'cust-invitee',
        orderId: 'order-1',
        orderNumber: 'ORD-INV-001',
        totalAmount: 30,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      // No referralReward porque no se materializó.
      expect(result.referralReward).toBeNull();
      // F2.8-B — releaseClaim debió ser llamado con el referralId del claim.
      expect(referrals.releaseClaim).toHaveBeenCalledWith({
        referralId: 'ref-1',
        expectedReferrerUserId: 'user-referrer',
      });

      // El log REFERRAL_BONUS NO debe haberse creado.
      const refLog = (
        prisma.membershipBenefitLog.create.mock.calls as BenefitLogCreateArgs[]
      ).find((c) => c[0].data.type === MembershipBenefitType.REFERRAL_BONUS);
      expect(refLog).toBeUndefined();
    });

    it('T16.2 — F2.8-B compensating rollback: grant throw → releaseClaim invocado y catch externo absorbe', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null);
      prisma.membership.upsert.mockResolvedValueOnce({
        id: 'm-1',
        expiresAt: new Date('2026-06-30T10:00:00Z'),
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        email: 'invitee@example.com',
        firstName: 'Invitee',
      });
      // Compras del comprador OK; el segundo grant (bono referente) lanza.
      raffleTickets.grantToUser
        .mockResolvedValueOnce(1)
        .mockRejectedValueOnce(new Error('raffle backend down'));
      referrals.claimRewardForFirstPurchase.mockResolvedValueOnce({
        referralId: 'ref-1',
        referrerUserId: 'user-referrer',
      });

      // No debe lanzar — el try/catch externo absorbe.
      const result = await service.applyPaidPurchase({
        userId: 'user-invitee',
        customerId: 'cust-invitee',
        orderId: 'order-2',
        orderNumber: 'ORD-INV-002',
        totalAmount: 30,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(result.referralReward).toBeNull();
      expect(referrals.releaseClaim).toHaveBeenCalledWith({
        referralId: 'ref-1',
        expectedReferrerUserId: 'user-referrer',
      });
    });

    it('T16.3 — flujo exitoso NO invoca releaseClaim (sanity check)', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null);
      prisma.membership.upsert.mockResolvedValueOnce({
        id: 'm-1',
        expiresAt: new Date('2026-06-30T10:00:00Z'),
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        email: 'invitee@example.com',
        firstName: 'Invitee',
      });
      raffleTickets.grantToUser
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);
      referrals.claimRewardForFirstPurchase.mockResolvedValueOnce({
        referralId: 'ref-1',
        referrerUserId: 'user-referrer',
      });

      await service.applyPaidPurchase({
        userId: 'user-invitee',
        customerId: 'cust-invitee',
        orderId: 'order-3',
        orderNumber: 'ORD-INV-003',
        totalAmount: 30,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(referrals.releaseClaim).not.toHaveBeenCalled();
    });

    it('T11.6 — customerId=null → omite customer.update sin error (flujo POS walk-in sin Customer)', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null);
      prisma.membership.upsert.mockResolvedValueOnce({
        id: 'm-1',
        expiresAt: new Date('2026-06-30T10:00:00Z'),
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        email: 'walkin@example.com',
        firstName: 'Walk',
      });

      await service.applyPaidPurchase({
        userId: 'user-1',
        customerId: null,
        orderId: 'order-1',
        orderNumber: 'ORD-001',
        totalAmount: 30,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.POS,
      });

      expect(prisma.customer.update).not.toHaveBeenCalled();
    });
  });

  describe('revertPaidPurchase — rollback centralizado', () => {
    it('T11.7 — G15: PARTIAL_RETURN (reverseTickets=false) → no toca raffleEntry ni membership', async () => {
      const result = await service.revertPaidPurchase({
        orderId: 'order-1',
        userId: 'user-1',
        customerId: 'cust-1',
        reverseTickets: false,
        revertMembership: false,
      });

      expect(result).toEqual({
        ticketsReversed: 0,
        membershipReverted: false,
      });
      expect(prisma.raffleEntry.findMany).not.toHaveBeenCalled();
      expect(prisma.membership.update).not.toHaveBeenCalled();
    });

    it('T11.8 — FULL_RETURN única compra calificada → revierte tickets y desactiva membership', async () => {
      // 2 tickets ganados por la orden, ningún sorteo extra.
      prisma.raffleEntry.findMany.mockResolvedValueOnce([
        { id: 'e1', raffleId: 'raffle-1' },
        { id: 'e2', raffleId: 'raffle-1' },
      ]);
      prisma.raffleEntry.updateMany.mockResolvedValueOnce({ count: 2 });
      prisma.raffle.update.mockResolvedValueOnce({});

      // No otras compras calificadas → desactivar membresía
      prisma.order.findFirst.mockResolvedValueOnce(null);
      prisma.membership.findUnique.mockResolvedValueOnce({ id: 'm-1' });
      prisma.membership.update.mockResolvedValueOnce({});

      const result = await service.revertPaidPurchase({
        orderId: 'order-1',
        userId: 'user-1',
        customerId: 'cust-1',
        reverseTickets: true,
        revertMembership: true,
      });

      expect(result.ticketsReversed).toBe(2);
      expect(result.membershipReverted).toBe(true);

      expect(prisma.raffle.update).toHaveBeenCalledWith({
        where: { id: 'raffle-1' },
        data: { soldTickets: { decrement: 2 } },
      });
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { isMember: false, membershipExpiresAt: null },
      });
    });

    it('T11.9 — FULL_RETURN con otra compra calificada → mantiene membership activa (smart-revert)', async () => {
      prisma.raffleEntry.findMany.mockResolvedValueOnce([]);

      const otherCreatedAt = new Date('2026-05-15T10:00:00Z');
      prisma.order.findFirst.mockResolvedValueOnce({
        createdAt: otherCreatedAt,
        total: '60.00',
      });

      const result = await service.revertPaidPurchase({
        orderId: 'order-1',
        userId: 'user-1',
        customerId: 'cust-1',
        reverseTickets: true,
        revertMembership: true,
      });

      expect(result.membershipReverted).toBe(false);
      expect(prisma.membership.update).toHaveBeenCalled();
      type MembershipUpdateArgs = [
        {
          where: { userId: string };
          data: { lastPurchaseAt: Date };
        },
      ];
      const updateCall = (
        prisma.membership.update.mock.calls as MembershipUpdateArgs[]
      )[0][0];
      expect(updateCall.where).toEqual({ userId: 'user-1' });
      expect(updateCall.data.lastPurchaseAt).toEqual(otherCreatedAt);
      // Customer queda con isMember posiblemente todavía true.
      expect(prisma.customer.update).toHaveBeenCalled();
      const customerCall = (
        prisma.customer.update.mock.calls as CustomerUpdateArgs[]
      )[0][0];
      expect(customerCall.where).toEqual({ id: 'cust-1' });
    });
  });

  describe('cross-user isolation', () => {
    it('T11.10 — applyPaidPurchase nunca usa el userId de otro caller en sus queries', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);
      prisma.membership.upsert.mockResolvedValue({
        id: 'm-x',
        expiresAt: new Date('2026-06-30T10:00:00Z'),
      });
      prisma.user.findUnique.mockResolvedValue({
        email: 'x@example.com',
        firstName: 'X',
      });

      await service.applyPaidPurchase({
        userId: 'user-A',
        customerId: 'cust-A',
        orderId: 'order-A',
        orderNumber: 'ORD-A',
        totalAmount: 25,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });
      await service.applyPaidPurchase({
        userId: 'user-B',
        customerId: 'cust-B',
        orderId: 'order-B',
        orderNumber: 'ORD-B',
        totalAmount: 25,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      // Validar que ninguna llamada a upsert para user-A contiene user-B.
      type UpsertArgs = [{ where: { userId: string } }];
      const userAUpsertCalls = (
        prisma.membership.upsert.mock.calls as UpsertArgs[]
      )
        .filter((c) => c[0].where.userId === 'user-A')
        .map((c) => JSON.stringify(c[0]));
      for (const json of userAUpsertCalls) {
        expect(json).not.toContain('user-B');
        expect(json).not.toContain('cust-B');
      }

      const userBCustomerCalls = (
        prisma.customer.update.mock.calls as CustomerUpdateArgs[]
      )
        .filter((c) => c[0].where.id === 'cust-B')
        .map((c) => JSON.stringify(c[0]));
      for (const json of userBCustomerCalls) {
        expect(json).not.toContain('user-A');
        expect(json).not.toContain('cust-A');
      }
    });
  });

  // ─── F2.8-A — Membership Benefits Engine (R1-R4 + idempotencia CAS) ───
  describe('F2.8-A — reglas oficiales (R1-R4)', () => {
    beforeEach(() => {
      // F2.8-A claim siempre gana en este bloque
      prisma.order.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.findUnique.mockResolvedValue({
        email: 'x@example.com',
        firstName: 'X',
      });
    });

    it('T15.5 — R1: compra = S/25 (mínimo exacto) → activa membresía 30 días + 1 ticket', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null);
      const expiresAt = new Date('2026-06-30T10:00:00Z');
      prisma.membership.upsert.mockResolvedValueOnce({
        id: 'm-r1',
        expiresAt,
      });
      raffleTickets.grantToUser.mockResolvedValueOnce(1);

      const result = await service.applyPaidPurchase({
        userId: 'user-r1',
        customerId: 'cust-r1',
        orderId: 'order-r1',
        orderNumber: 'ORD-R1',
        totalAmount: 25,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(result.membership).toEqual({ id: 'm-r1', expiresAt });
      expect(result.renewed).toBe(false);
      expect(result.ticketsGranted).toBe(1);

      // R1 — el upsert debe poner expiresAt a +30 días del paidAt.
      type UpsertArgs = [{ create: { expiresAt: Date } }];
      const upsertCall = (
        prisma.membership.upsert.mock.calls as UpsertArgs[]
      )[0][0];
      const expectedExp = new Date('2026-06-30T10:00:00Z');
      expect(upsertCall.create.expiresAt.toISOString()).toBe(
        expectedExp.toISOString(),
      );
    });

    it('T15.6 — R1: compra < S/25 (S/24.99) → no califica, no engine side effects', async () => {
      const result = await service.applyPaidPurchase({
        userId: 'user-r1',
        customerId: 'cust-r1',
        orderId: 'order-r1',
        orderNumber: 'ORD-R1',
        totalAmount: 24.99,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(result.membership).toBeNull();
      expect(result.ticketsGranted).toBe(0);
      expect(result.alreadyApplied).toBe(false);
      expect(prisma.membership.upsert).not.toHaveBeenCalled();
      expect(raffleTickets.grantToUser).not.toHaveBeenCalled();
    });

    it('T15.7 — R2: fórmula floor(total/25): S/50→2, S/75→3, S/100→4, S/124→4', async () => {
      const cases: Array<{ total: number; expected: number }> = [
        { total: 50, expected: 2 },
        { total: 75, expected: 3 },
        { total: 100, expected: 4 },
        { total: 124, expected: 4 },
      ];

      for (const c of cases) {
        // Reset mocks por iteración
        prisma.membership.findUnique.mockReset();
        prisma.membership.upsert.mockReset();
        raffleTickets.grantToUser.mockReset();
        prisma.membership.findUnique.mockResolvedValueOnce(null);
        prisma.membership.upsert.mockResolvedValueOnce({
          id: 'm',
          expiresAt: new Date('2026-06-30T10:00:00Z'),
        });
        raffleTickets.grantToUser.mockResolvedValueOnce(c.expected);

        await service.applyPaidPurchase({
          userId: `user-${c.total}`,
          customerId: `cust-${c.total}`,
          orderId: `order-${c.total}`,
          orderNumber: `ORD-${c.total}`,
          totalAmount: c.total,
          paidAt: new Date('2026-05-31T10:00:00Z'),
          channel: OrderChannel.ECOMMERCE,
        });

        // Verificar que grantToUser fue llamado con la quantity esperada
        type GrantArgs = [{ quantity: number; entryType: EntryType }];
        const grantCall = (
          raffleTickets.grantToUser.mock.calls as GrantArgs[]
        )[0][0];
        expect(grantCall.quantity).toBe(c.expected);
        expect(grantCall.entryType).toBe(EntryType.PURCHASE_REWARD);
      }
    });

    it('T15.8 — R3+R4: renovación de membresía activa extiende desde existing.expiresAt y queda auditada', async () => {
      // R3: membresía activa con expiresAt futuro → anchor = existing.expiresAt
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: 'm-existing',
        active: true,
        expiresAt: new Date('2026-06-15T10:00:00Z'),
      });
      const newExp = new Date('2026-07-15T10:00:00Z'); // +30 días desde 06-15
      prisma.membership.upsert.mockResolvedValueOnce({
        id: 'm-existing',
        expiresAt: newExp,
      });
      raffleTickets.grantToUser.mockResolvedValueOnce(2);

      await service.applyPaidPurchase({
        userId: 'user-r3',
        customerId: 'cust-r3',
        orderId: 'order-r3',
        orderNumber: 'ORD-R3',
        totalAmount: 50,
        paidAt: new Date('2026-06-01T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      // R3 — el upsert update.expiresAt debe ser existing.expiresAt + 30d.
      type UpsertArgs = [{ update: { expiresAt: Date } }];
      const upsertCall = (
        prisma.membership.upsert.mock.calls as UpsertArgs[]
      )[0][0];
      expect(upsertCall.update.expiresAt.toISOString()).toBe(
        newExp.toISOString(),
      );

      // R4 — auditoría: ambos benefit logs DISCOUNT + RAFFLE_ENTRY presentes.
      const benefitTypes = (
        prisma.membershipBenefitLog.create.mock.calls as BenefitLogCreateArgs[]
      ).map((c) => c[0].data.type);
      expect(benefitTypes).toContain(MembershipBenefitType.DISCOUNT);
      expect(benefitTypes).toContain(MembershipBenefitType.RAFFLE_ENTRY);
    });
  });

  describe('F2.8-A — Capa 2 CAS idempotencia (T15.1, T15.2)', () => {
    it('T15.1 — re-call sobre la misma orden NO duplica side effects (CAS pierde)', async () => {
      // Capa 2 pierde el claim — alguien más ya aplicó.
      prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
      // Snapshot reads:
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: 'm-cached',
        expiresAt: new Date('2026-06-30T10:00:00Z'),
      });
      prisma.raffleEntry.count.mockResolvedValueOnce(2);
      prisma.membershipBenefitLog.findFirst.mockResolvedValueOnce(null);

      const result = await service.applyPaidPurchase({
        userId: 'user-rc',
        customerId: 'cust-rc',
        orderId: 'order-rc',
        orderNumber: 'ORD-RC',
        totalAmount: 50,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(result.alreadyApplied).toBe(true);
      expect(result.ticketsGranted).toBe(2);
      expect(result.membership).toEqual({
        id: 'm-cached',
        expiresAt: new Date('2026-06-30T10:00:00Z'),
      });

      // NO se llamó a ningún side effect:
      expect(prisma.membership.upsert).not.toHaveBeenCalled();
      expect(prisma.customer.update).not.toHaveBeenCalled();
      expect(prisma.membershipBenefitLog.create).not.toHaveBeenCalled();
      expect(raffleTickets.grantToUser).not.toHaveBeenCalled();
      expect(referrals.claimRewardForFirstPurchase).not.toHaveBeenCalled();
      expect(notifications.sendWelcomeIdempotent).not.toHaveBeenCalled();
    });

    it('T15.2 — primer call gana CAS, segundo call retorna snapshot sin side effects', async () => {
      // First call — claim ganado.
      prisma.order.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.membership.findUnique.mockResolvedValueOnce(null);
      const expiresAt = new Date('2026-06-30T10:00:00Z');
      prisma.membership.upsert.mockResolvedValueOnce({ id: 'm-1', expiresAt });
      prisma.user.findUnique.mockResolvedValueOnce({
        email: 'race@example.com',
        firstName: 'Race',
      });
      raffleTickets.grantToUser.mockResolvedValueOnce(2);

      const r1 = await service.applyPaidPurchase({
        userId: 'user-race',
        customerId: 'cust-race',
        orderId: 'order-race',
        orderNumber: 'ORD-RACE',
        totalAmount: 50,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(r1.alreadyApplied).toBe(false);
      expect(r1.ticketsGranted).toBe(2);

      // Second call — claim perdido. Snapshot retorna lo aplicado.
      prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.membership.findUnique.mockResolvedValueOnce({
        id: 'm-1',
        expiresAt,
      });
      prisma.raffleEntry.count.mockResolvedValueOnce(2);
      prisma.membershipBenefitLog.findFirst.mockResolvedValueOnce(null);

      const upsertCallsBefore = prisma.membership.upsert.mock.calls.length;
      const grantCallsBefore = raffleTickets.grantToUser.mock.calls.length;
      const benefitCallsBefore =
        prisma.membershipBenefitLog.create.mock.calls.length;

      const r2 = await service.applyPaidPurchase({
        userId: 'user-race',
        customerId: 'cust-race',
        orderId: 'order-race',
        orderNumber: 'ORD-RACE',
        totalAmount: 50,
        paidAt: new Date('2026-05-31T10:00:00Z'),
        channel: OrderChannel.ECOMMERCE,
      });

      expect(r2.alreadyApplied).toBe(true);
      expect(r2.ticketsGranted).toBe(2); // snapshot lee del raffleEntry.count

      // Sin nuevos side effects entre r1 y r2:
      expect(prisma.membership.upsert.mock.calls.length).toBe(upsertCallsBefore);
      expect(raffleTickets.grantToUser.mock.calls.length).toBe(grantCallsBefore);
      expect(prisma.membershipBenefitLog.create.mock.calls.length).toBe(
        benefitCallsBefore,
      );
    });
  });
});
