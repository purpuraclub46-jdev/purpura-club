import { Test, TestingModule } from '@nestjs/testing';
import { EntryType, MembershipBenefitType, OrderChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
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
    findMany: jest.Mock;
    count: jest.Mock;
  };
  order: { findFirst: jest.Mock };
  raffleEntry: { findMany: jest.Mock; updateMany: jest.Mock };
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
      findMany: jest.fn(),
      count: jest.fn(),
    },
    order: { findFirst: jest.fn() },
    raffleEntry: { findMany: jest.fn(), updateMany: jest.fn() },
    raffle: { update: jest.fn() },
    $transaction: jest.fn(),
  };
}

describe('MembershipsService — F2.7-A Membership Engine unificado', () => {
  let service: MembershipsService;
  let prisma: PrismaMock;
  let emails: {
    sendWelcomeMembership: jest.Mock;
    sendExpirationReminder: jest.Mock;
  };
  let raffleTickets: { grantToUser: jest.Mock };
  let referrals: { claimRewardForFirstPurchase: jest.Mock; link: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    emails = {
      sendWelcomeMembership: jest.fn().mockResolvedValue(undefined),
      sendExpirationReminder: jest.fn().mockResolvedValue(undefined),
    };
    raffleTickets = { grantToUser: jest.fn().mockResolvedValue(0) };
    referrals = {
      claimRewardForFirstPurchase: jest.fn().mockResolvedValue(null),
      link: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailsService, useValue: emails },
        { provide: RaffleTicketsService, useValue: raffleTickets },
        { provide: ReferralsService, useValue: referrals },
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

      expect(emails.sendWelcomeMembership).toHaveBeenCalledWith(
        'jane@example.com',
        expect.objectContaining({ firstName: 'Jane', expiresAt }),
      );
    });

    it('T11.3 — renovación → renewed=true, NO envía welcome, igual otorga tickets', async () => {
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
      expect(emails.sendWelcomeMembership).not.toHaveBeenCalled();

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

    it('T11.5 — email de bienvenida falla → no aborta, applyPaidPurchase completa OK', async () => {
      prisma.membership.findUnique.mockResolvedValueOnce(null);
      const expiresAt = new Date('2026-06-30T10:00:00Z');
      prisma.membership.upsert.mockResolvedValueOnce({ id: 'm-1', expiresAt });
      prisma.user.findUnique.mockResolvedValueOnce({
        email: 'jane@example.com',
        firstName: 'Jane',
      });
      emails.sendWelcomeMembership.mockRejectedValueOnce(
        new Error('SMTP down'),
      );
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

      // welcomeSent=false porque falló, pero el resto se cumplió.
      expect(result.welcomeSent).toBe(false);
      expect(result.membership).toEqual({ id: 'm-1', expiresAt });
      expect(result.ticketsGranted).toBe(1);
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
});
