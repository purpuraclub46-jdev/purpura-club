import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MembershipsService } from '../memberships/memberships.service';
import { RafflePricingService } from './raffle-pricing.service';

/**
 * F2.7-B — Tests del helper centralizado de precio de tickets de sorteo
 * (T12.1–T12.5, T12.13, T12.14).
 *
 * Regla oficial: socio paga 50 % del público. No depende de la rifa.
 */

describe('RafflePricingService — F2.7-B fuente única de precio de tickets', () => {
  let service: RafflePricingService;
  let memberships: { isActive: jest.Mock };

  beforeEach(async () => {
    memberships = { isActive: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RafflePricingService,
        { provide: MembershipsService, useValue: memberships },
      ],
    }).compile();
    service = module.get<RafflePricingService>(RafflePricingService);
  });

  describe('resolveFor — determinístico, sin DB', () => {
    it('T12.1 — NO socio → applicablePrice === publicPrice', () => {
      const result = service.resolveFor({ ticketPrice: 10 }, false);
      expect(result.publicPrice).toBe(10);
      expect(result.memberPrice).toBe(5);
      expect(result.applicablePrice).toBe(10);
      expect(result.source).toBe('PUBLIC');
      expect(result.isMember).toBe(false);
      expect(result.savingPercentage).toBe(50);
      expect(result.savingAmount).toBe(5);
    });

    it('T12.2 — Socio activo → applicablePrice === memberPrice === publicPrice * 0.5', () => {
      const result = service.resolveFor({ ticketPrice: 10 }, true);
      expect(result.publicPrice).toBe(10);
      expect(result.memberPrice).toBe(5);
      expect(result.applicablePrice).toBe(5);
      expect(result.source).toBe('MEMBER');
      expect(result.isMember).toBe(true);
      expect(result.savingPercentage).toBe(50);
      expect(result.savingAmount).toBe(5);
    });

    it('T12.13 — Cap: ticketPrice=0 → memberPrice=0 (sin división por cero)', () => {
      const result = service.resolveFor({ ticketPrice: 0 }, true);
      expect(result.publicPrice).toBe(0);
      expect(result.memberPrice).toBe(0);
      expect(result.applicablePrice).toBe(0);
      expect(result.savingAmount).toBe(0);
    });

    it('T12.14 — Redondeo: ticketPrice=11 → memberPrice=5.50 (round2)', () => {
      const result = service.resolveFor({ ticketPrice: 11 }, true);
      expect(result.publicPrice).toBe(11);
      expect(result.memberPrice).toBe(5.5);
      expect(result.applicablePrice).toBe(5.5);
      expect(result.savingAmount).toBe(5.5);
    });

    it('Acepta Prisma.Decimal en ticketPrice (no solo number)', () => {
      const result = service.resolveFor(
        { ticketPrice: new Prisma.Decimal('10.00') },
        true,
      );
      expect(result.publicPrice).toBe(10);
      expect(result.memberPrice).toBe(5);
    });

    it('Independiente del legacy `memberTicketPrice`: aunque venga distinto, se ignora', () => {
      // El service NO recibe memberTicketPrice. Si el legacy fuera S/2.50
      // (rifa antigua), se ignora; el resultado es 50 % off del público.
      const result = service.resolveFor({ ticketPrice: 10 }, true);
      expect(result.memberPrice).toBe(5);
    });
  });

  describe('resolveForUser — consulta MembershipsService', () => {
    it('T12.3 — userId=null → trata como NO socio', async () => {
      const result = await service.resolveForUser({ ticketPrice: 10 }, null);
      expect(result.isMember).toBe(false);
      expect(result.applicablePrice).toBe(10);
      expect(memberships.isActive).not.toHaveBeenCalled();
    });

    it('T12.3b — userId=undefined → trata como NO socio', async () => {
      const result = await service.resolveForUser(
        { ticketPrice: 10 },
        undefined,
      );
      expect(result.isMember).toBe(false);
      expect(memberships.isActive).not.toHaveBeenCalled();
    });

    it('T12.4 — userId con membresía VENCIDA → NO socio (S/10)', async () => {
      memberships.isActive.mockResolvedValueOnce(false);
      const result = await service.resolveForUser(
        { ticketPrice: 10 },
        'user-expired',
      );
      expect(memberships.isActive).toHaveBeenCalledWith('user-expired');
      expect(result.isMember).toBe(false);
      expect(result.applicablePrice).toBe(10);
    });

    it('T12.5 — userId con membresía ACTIVA → socio (S/5)', async () => {
      memberships.isActive.mockResolvedValueOnce(true);
      const result = await service.resolveForUser(
        { ticketPrice: 10 },
        'user-active',
      );
      expect(memberships.isActive).toHaveBeenCalledWith('user-active');
      expect(result.isMember).toBe(true);
      expect(result.applicablePrice).toBe(5);
    });

    it('T12.15 — Llamadas concurrentes con userIds distintos no se filtran', async () => {
      memberships.isActive
        .mockResolvedValueOnce(true) // user-A es socio
        .mockResolvedValueOnce(false); // user-B no

      const [resA, resB] = await Promise.all([
        service.resolveForUser({ ticketPrice: 10 }, 'user-A'),
        service.resolveForUser({ ticketPrice: 10 }, 'user-B'),
      ]);

      expect(resA.isMember).toBe(true);
      expect(resA.applicablePrice).toBe(5);
      expect(resB.isMember).toBe(false);
      expect(resB.applicablePrice).toBe(10);
    });
  });

  describe('helpers públicos', () => {
    it('getPublicPrice devuelve ticketPrice tal cual', () => {
      expect(service.getPublicPrice({ ticketPrice: 25 })).toBe(25);
    });

    it('getMemberPrice devuelve siempre la mitad', () => {
      expect(service.getMemberPrice({ ticketPrice: 25 })).toBe(12.5);
      expect(service.getMemberPrice({ ticketPrice: 0 })).toBe(0);
      expect(service.getMemberPrice({ ticketPrice: 7 })).toBe(3.5);
    });
  });
});
