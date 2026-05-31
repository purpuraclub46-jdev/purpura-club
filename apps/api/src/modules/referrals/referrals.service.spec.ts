import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { REFERRAL_CODE_REGEX, ReferralsService } from './referrals.service';

/**
 * F2.7-C — Tests del Membership Engine / Referrals (T13.*).
 *
 * Cubren:
 *   - generateReferralCode (formato + colisiones + max attempts)
 *   - normalizeReferralCode (trim, uppercase, validación)
 *   - buildReferralUrl (env override + fallback prod)
 *   - link (R10 first-wins + anti-self-referral)
 *   - claimRewardForFirstPurchase (CAS atómico + R6 late-linkage)
 *   - getMeOverview (stats + masking PII R8)
 */

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  referral: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
    count: jest.Mock;
  };
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    referral: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('ReferralsService', () => {
  let service: ReferralsService;
  let prisma: PrismaMock;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    prisma = createPrismaMock();
    originalEnv = process.env.APP_PUBLIC_URL;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  afterEach(() => {
    process.env.APP_PUBLIC_URL = originalEnv;
  });

  // ─── T13.1 ────────────────────────────────────────────────────────────
  describe('generateReferralCode (T13.1)', () => {
    it('T13.1 — produce un código con formato PCLUB-XXXXXX en alfabeto sin ambigüedad', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // no colisión

      const code = await service.generateReferralCode();

      expect(code).toMatch(REFERRAL_CODE_REGEX);
      expect(code).toMatch(/^PCLUB-[A-HJKMNP-Z2-9]{6}$/);
      // No debe contener caracteres ambiguos EN EL SUFIJO (el prefijo
      // PCLUB es literal; solo importan los 6 chars random).
      const suffix = code.slice('PCLUB-'.length);
      expect(suffix).not.toMatch(/[0OI1L]/);
    });

    it('T13.1b — distintos códigos en llamadas consecutivas', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        codes.add(await service.generateReferralCode());
      }
      // No es prueba criptográfica pero detecta degeneración accidental.
      expect(codes.size).toBeGreaterThan(15);
    });
  });

  // ─── T13.2 ────────────────────────────────────────────────────────────
  describe('generateReferralCode collisions (T13.2)', () => {
    it('T13.2 — Colisión en primer intento → reintento exitoso en el segundo', async () => {
      // Primer attempt: el código ya existe (colisión simulada).
      // Segundo attempt: libre.
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'existing-user' })
        .mockResolvedValueOnce(null);

      const code = await service.generateReferralCode();

      expect(code).toMatch(REFERRAL_CODE_REGEX);
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    });

    it('T13.2b — 6 intentos consecutivos colisionan → throw operacional', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.generateReferralCode()).rejects.toThrow(
        /unique referral code/i,
      );
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(6);
    });
  });

  // ─── T13.3 ────────────────────────────────────────────────────────────
  describe('normalizeReferralCode (T13.3)', () => {
    it('T13.3 — Normaliza espacios + minúsculas a uppercase canónico', () => {
      expect(service.normalizeReferralCode('  pclub-x8k2m7  ')).toBe(
        'PCLUB-X8K2M7',
      );
    });

    it('T13.3b — Devuelve null si formato inválido', () => {
      expect(service.normalizeReferralCode('not-a-code')).toBeNull();
      expect(service.normalizeReferralCode('PCLUB-123')).toBeNull(); // muy corto
      expect(service.normalizeReferralCode('PCLUB-O1234X')).toBeNull(); // letra ambigua
      expect(service.normalizeReferralCode(null)).toBeNull();
      expect(service.normalizeReferralCode(undefined)).toBeNull();
      expect(
        service.normalizeReferralCode(123 as unknown as string),
      ).toBeNull();
    });
  });

  // ─── buildReferralUrl ─────────────────────────────────────────────────
  describe('buildReferralUrl', () => {
    it('usa APP_PUBLIC_URL cuando está seteado', () => {
      process.env.APP_PUBLIC_URL = 'https://staging.purpura.club';
      expect(service.buildReferralUrl('PCLUB-X8K2M7')).toBe(
        'https://staging.purpura.club/register?ref=PCLUB-X8K2M7',
      );
    });

    it('cae a fallback https://purpura.club si APP_PUBLIC_URL vacío', () => {
      process.env.APP_PUBLIC_URL = '';
      expect(service.buildReferralUrl('PCLUB-A7D9L2')).toBe(
        'https://purpura.club/register?ref=PCLUB-A7D9L2',
      );
    });

    it('strip trailing slash de APP_PUBLIC_URL', () => {
      process.env.APP_PUBLIC_URL = 'https://app.purpura.club/';
      expect(service.buildReferralUrl('PCLUB-Z4M8P3')).toBe(
        'https://app.purpura.club/register?ref=PCLUB-Z4M8P3',
      );
    });
  });

  // ─── link — R10 first wins + anti-self ────────────────────────────────
  describe('link', () => {
    it('Anti-self-referral: referrer === referred → null', async () => {
      const result = await service.link({
        referrerUserId: 'user-A',
        referredUserId: 'user-A',
      });
      expect(result).toBeNull();
      expect(prisma.referral.create).not.toHaveBeenCalled();
    });

    it('R10 — Si ya existe Referral, NO sobrescribe (first wins)', async () => {
      const existing = {
        id: 'ref-1',
        referrerUserId: 'user-FIRST',
        referredUserId: 'user-B',
        rewarded: false,
        rewardedAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      prisma.referral.findUnique.mockResolvedValueOnce(existing);

      const result = await service.link({
        referrerUserId: 'user-SECOND', // intento de sobrescritura
        referredUserId: 'user-B',
      });

      expect(result).toBe(existing);
      // El referrer NO cambió.
      expect(prisma.referral.create).not.toHaveBeenCalled();
    });

    it('Crea Referral nuevo cuando no existe linkage previo', async () => {
      prisma.referral.findUnique.mockResolvedValueOnce(null);
      prisma.referral.create.mockResolvedValueOnce({
        id: 'ref-new',
        referrerUserId: 'user-A',
        referredUserId: 'user-B',
        rewarded: false,
      });

      const result = await service.link({
        referrerUserId: 'user-A',
        referredUserId: 'user-B',
      });

      expect(result).toMatchObject({ referrerUserId: 'user-A' });
      expect(prisma.referral.create).toHaveBeenCalledWith({
        data: {
          referrerUserId: 'user-A',
          referredUserId: 'user-B',
          rewarded: false,
        },
      });
    });
  });

  // ─── T13.10 / T13.11 — claim + R6 late-linkage ───────────────────────
  describe('claimRewardForFirstPurchase', () => {
    it('T13.10 — Segundo intento con referral ya rewarded → null (CAS)', async () => {
      prisma.referral.findUnique.mockResolvedValueOnce({
        id: 'ref-1',
        referrerUserId: 'user-A',
        rewarded: true,
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.claimRewardForFirstPurchase({
        referredUserId: 'user-B',
      });

      expect(result).toBeNull();
      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
    });

    it('T13.10b — CAS gana 0 filas (race condition) → null', async () => {
      prisma.referral.findUnique.mockResolvedValueOnce({
        id: 'ref-1',
        referrerUserId: 'user-A',
        rewarded: false,
        createdAt: new Date('2026-01-01'),
      });
      prisma.referral.updateMany.mockResolvedValueOnce({ count: 0 });

      const result = await service.claimRewardForFirstPurchase({
        referredUserId: 'user-B',
      });

      expect(result).toBeNull();
    });

    it('Claim exitoso devuelve referrerUserId', async () => {
      prisma.referral.findUnique.mockResolvedValueOnce({
        id: 'ref-1',
        referrerUserId: 'user-A',
        rewarded: false,
        createdAt: new Date('2026-01-01'),
      });
      prisma.referral.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.claimRewardForFirstPurchase({
        referredUserId: 'user-B',
      });

      expect(result).toEqual({ referrerUserId: 'user-A' });
    });

    it('T13.11 — R6 late-linkage: Referral.createdAt >= order.createdAt → no premia', async () => {
      const referralCreatedAt = new Date('2026-05-15');
      const orderCreatedAt = new Date('2026-05-10'); // ORDER es ANTERIOR

      prisma.referral.findUnique.mockResolvedValueOnce({
        id: 'ref-1',
        referrerUserId: 'user-A',
        rewarded: false,
        createdAt: referralCreatedAt,
      });

      const result = await service.claimRewardForFirstPurchase({
        referredUserId: 'user-B',
        orderCreatedAt,
      });

      expect(result).toBeNull();
      expect(prisma.referral.updateMany).not.toHaveBeenCalled();
    });

    it('T13.11b — R6: Referral.createdAt < order.createdAt → premia normalmente', async () => {
      const referralCreatedAt = new Date('2026-05-01'); // antes
      const orderCreatedAt = new Date('2026-05-15');

      prisma.referral.findUnique.mockResolvedValueOnce({
        id: 'ref-1',
        referrerUserId: 'user-A',
        rewarded: false,
        createdAt: referralCreatedAt,
      });
      prisma.referral.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.claimRewardForFirstPurchase({
        referredUserId: 'user-B',
        orderCreatedAt,
      });

      expect(result).toEqual({ referrerUserId: 'user-A' });
    });

    it('Sin orderCreatedAt: guard R6 no se aplica (compat)', async () => {
      prisma.referral.findUnique.mockResolvedValueOnce({
        id: 'ref-1',
        referrerUserId: 'user-A',
        rewarded: false,
        createdAt: new Date('2026-05-15'),
      });
      prisma.referral.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.claimRewardForFirstPurchase({
        referredUserId: 'user-B',
      });

      expect(result).toEqual({ referrerUserId: 'user-A' });
    });
  });

  // ─── T13.13 — cross-user isolation ───────────────────────────────────
  describe('claimRewardForFirstPurchase cross-user isolation (T13.13)', () => {
    it('T13.13 — Claim para user-B no afecta linkage de user-C', async () => {
      // Setup: A invitó tanto a B como a C (en realidad la tabla Referral
      // separa por referredUserId, así que cada compra los maneja independiente).
      prisma.referral.findUnique
        .mockResolvedValueOnce({
          id: 'ref-B',
          referrerUserId: 'user-A',
          rewarded: false,
          createdAt: new Date('2026-01-01'),
        })
        .mockResolvedValueOnce({
          id: 'ref-C',
          referrerUserId: 'user-A',
          rewarded: false,
          createdAt: new Date('2026-01-02'),
        });
      prisma.referral.updateMany.mockResolvedValue({ count: 1 });

      const [resultB, resultC] = await Promise.all([
        service.claimRewardForFirstPurchase({ referredUserId: 'user-B' }),
        service.claimRewardForFirstPurchase({ referredUserId: 'user-C' }),
      ]);

      expect(resultB).toEqual({ referrerUserId: 'user-A' });
      expect(resultC).toEqual({ referrerUserId: 'user-A' });
      expect(prisma.referral.updateMany).toHaveBeenCalledTimes(2);
    });
  });

  // ─── T13.14 — getMeOverview shape ────────────────────────────────────
  describe('getMeOverview (T13.14)', () => {
    it('T13.14 — Retorna referralCode + URL + stats + history con nombres ofuscados (R8)', async () => {
      process.env.APP_PUBLIC_URL = 'https://purpura.club';
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-A',
        referralCode: 'PCLUB-X8K2M7',
      });
      prisma.referral.findMany.mockResolvedValueOnce([
        {
          id: 'ref-1',
          rewarded: true,
          createdAt: new Date('2026-05-15'),
          rewardedAt: new Date('2026-05-16'),
          referred: { firstName: 'Pedro', lastName: 'Gómez' },
        },
        {
          id: 'ref-2',
          rewarded: false,
          createdAt: new Date('2026-05-20'),
          rewardedAt: null,
          referred: { firstName: 'María', lastName: 'Torres' },
        },
      ]);

      const result = await service.getMeOverview('user-A');

      expect(result.referralCode).toBe('PCLUB-X8K2M7');
      expect(result.referralUrl).toBe(
        'https://purpura.club/register?ref=PCLUB-X8K2M7',
      );
      expect(result.stats).toEqual({
        registered: 2,
        qualified: 1,
        ticketsEarned: 1,
      });
      expect(result.history).toHaveLength(2);
      // R8 — PII masking: "Pedro Gómez" → "Pedro G."
      expect(result.history[0].displayName).toBe('Pedro G.');
      expect(result.history[0].status).toBe('QUALIFIED');
      expect(result.history[0].ticketsAwarded).toBe(1);
      expect(result.history[1].displayName).toBe('María T.');
      expect(result.history[1].status).toBe('PENDING_PURCHASE');
      expect(result.history[1].ticketsAwarded).toBe(0);
    });

    it('Genera código lazy si el user no lo tenía aún (post-backfill defensivo)', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-legacy', referralCode: null })
        .mockResolvedValueOnce(null); // colision check para generateReferralCode
      prisma.user.update.mockResolvedValueOnce({
        id: 'user-legacy',
        referralCode: 'PCLUB-NEWGEN',
      });
      prisma.referral.findMany.mockResolvedValueOnce([]);

      const result = await service.getMeOverview('user-legacy');

      expect(prisma.user.update).toHaveBeenCalled();
      expect(result.referralCode).toMatch(REFERRAL_CODE_REGEX);
      expect(result.stats).toEqual({
        registered: 0,
        qualified: 0,
        ticketsEarned: 0,
      });
    });

    it('Throw si el user no existe', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.getMeOverview('ghost-uuid')).rejects.toThrow(
        /not found/,
      );
    });
  });
});
