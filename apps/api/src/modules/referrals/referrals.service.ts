import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralQueryDto } from './dto/referral-query.dto';
import { ReferralResponseDto } from './dto/referral-response.dto';
import { ReferralMeResponseDto } from './dto/referral-me.dto';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// F2.7-C — Alfabeto sin caracteres ambiguos (sin 0/O/1/I/L) para que el
// código sea fácil de copiar/dictar por teléfono o WhatsApp.
const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REFERRAL_CODE_LENGTH = 6;
const REFERRAL_CODE_PREFIX = 'PCLUB-';
const REFERRAL_CODE_MAX_ATTEMPTS = 6;

// Formato canónico del código completo (incluye prefijo).
export const REFERRAL_CODE_REGEX = /^PCLUB-[A-HJKMNP-Z2-9]{6}$/;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Code generation & URL builders ───────────────────────────────────

  /**
   * Genera un código de referido único y válido.
   *
   * Estrategia: random bytes → mapeo al alfabeto sin ambigüedad → verificación
   * de unicidad. Si colisiona (probabilidad ~1/24⁶ ≈ 1 en 191M), reintenta.
   * Tras `REFERRAL_CODE_MAX_ATTEMPTS` falla con throw — alerta operacional.
   *
   * Acepta opcionalmente un cliente transaccional (`tx`) para garantizar
   * que el check de unicidad y la posterior escritura ocurran dentro de la
   * misma transacción atómica.
   */
  async generateReferralCode(tx?: Tx): Promise<string> {
    const db = tx ?? this.prisma;
    for (let attempt = 0; attempt < REFERRAL_CODE_MAX_ATTEMPTS; attempt++) {
      const candidate = this.buildRandomCode();
      const existing = await db.user.findUnique({
        where: { referralCode: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    throw new Error(
      `Could not generate a unique referral code after ${REFERRAL_CODE_MAX_ATTEMPTS} attempts`,
    );
  }

  /**
   * Normaliza un código entrante: trim + uppercase. Permite que el usuario
   * pegue el código con espacios o minúsculas sin que falle el lookup.
   * Retorna null si el resultado no matchea el formato canónico.
   */
  normalizeReferralCode(input: string | null | undefined): string | null {
    if (typeof input !== 'string') return null;
    const normalized = input.trim().toUpperCase();
    if (!REFERRAL_CODE_REGEX.test(normalized)) return null;
    return normalized;
  }

  /**
   * Construye la URL canónica del link de referido. Usa `APP_PUBLIC_URL`
   * (env) como base, con fallback al dominio de producción aprobado en R4.
   */
  buildReferralUrl(code: string): string {
    const baseRaw = process.env.APP_PUBLIC_URL || 'https://purpura.club';
    const base = baseRaw.replace(/\/$/, '');
    return `${base}/register?ref=${code}`;
  }

  // ─── Linkage ──────────────────────────────────────────────────────────

  /**
   * Crea el vínculo cuando un usuario nuevo se registra usando otro como
   * referrer. Idempotente: no duplica si ya existe (R10 — first wins).
   *
   * Reglas de seguridad:
   *   - Anti-self-referral: si referrer === referred, no-op.
   *   - First wins (R10): si el referido YA tiene un Referral, lo respetamos
   *     y NO sobrescribimos — devolvemos el existente.
   */
  async link(args: {
    referrerUserId: string;
    referredUserId: string;
    tx?: Tx;
  }) {
    if (args.referrerUserId === args.referredUserId) return null;
    const db = args.tx ?? this.prisma;

    // R10 — Si ya existe linkage, el primero gana. No reasignamos.
    const existing = await db.referral.findUnique({
      where: { referredUserId: args.referredUserId },
    });
    if (existing) return existing;

    return db.referral.create({
      data: {
        referrerUserId: args.referrerUserId,
        referredUserId: args.referredUserId,
        rewarded: false,
      },
    });
  }

  /**
   * Si el usuario `referredUserId` tiene un referrer pendiente de recompensa,
   * lo marca como `rewarded`. Devuelve el referrerId para que el caller
   * (MembershipsService) le otorgue la entrada bonus.
   *
   * Atómico cuando se pasa una transacción: usa updateMany(where: rewarded:false)
   * para garantizar que solo un caller en concurrencia recibe la responsabilidad
   * de otorgar la recompensa.
   *
   * R6 — Protección anti late-linkage: si el Referral fue creado DESPUÉS de
   * la orden (ej. admin manualmente vinculó al referrer después de la compra),
   * NO se premia. Sin este filtro un actor con acceso a admin podría atribuir
   * retroactivamente compras pasadas.
   */
  async claimRewardForFirstPurchase(args: {
    referredUserId: string;
    orderCreatedAt?: Date;
    tx?: Tx;
  }): Promise<{ referrerUserId: string } | null> {
    const db = args.tx ?? this.prisma;
    const referral = await db.referral.findUnique({
      where: { referredUserId: args.referredUserId },
      select: {
        id: true,
        referrerUserId: true,
        rewarded: true,
        createdAt: true,
      },
    });
    if (!referral || referral.rewarded) return null;

    // R6 — late-linkage guard. Si la orden existe antes que el referral,
    // significa que el linkage fue creado retroactivamente y NO debe premiarse.
    if (
      args.orderCreatedAt &&
      referral.createdAt.getTime() >= args.orderCreatedAt.getTime()
    ) {
      this.logger.warn(
        `Referral late-linkage rejected: referral.createdAt=${referral.createdAt.toISOString()} >= order.createdAt=${args.orderCreatedAt.toISOString()} (referred=${args.referredUserId})`,
      );
      return null;
    }

    const claimed = await db.referral.updateMany({
      where: { id: referral.id, rewarded: false },
      data: { rewarded: true, rewardedAt: new Date() },
    });

    if (claimed.count === 0) return null;
    this.logger.log(
      `Referral rewarded: referrer=${referral.referrerUserId} referred=${args.referredUserId}`,
    );
    return { referrerUserId: referral.referrerUserId };
  }

  // ─── Customer-facing overview ─────────────────────────────────────────

  /**
   * Resumen del programa de referidos para el usuario autenticado: su
   * código + link + stats + historial.
   *
   * R8 — Privacidad: nombres del historial se ofuscan (Pedro G. en vez de
   * Pedro Gómez).
   */
  async getMeOverview(userId: string): Promise<ReferralMeResponseDto> {
    // Asegurar que el user tenga código (defensivo: si por alguna razón un
    // user pre-backfill no tiene código, se lo asignamos lazy).
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (!user.referralCode) {
      const code = await this.generateReferralCode();
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { id: true, referralCode: true },
      });
      this.logger.log(
        `Lazily assigned referral code ${code} to user ${userId}`,
      );
    }

    const referralCode = user.referralCode!;
    const referralUrl = this.buildReferralUrl(referralCode);

    const referrals = await this.prisma.referral.findMany({
      where: { referrerUserId: userId },
      include: {
        referred: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const registered = referrals.length;
    const qualified = referrals.filter((r) => r.rewarded).length;
    const ticketsEarned = qualified; // 1 ticket por referral elegible.

    const history = referrals.map((r) => ({
      id: r.id,
      displayName: this.maskName(r.referred.firstName, r.referred.lastName),
      status: r.rewarded
        ? ('QUALIFIED' as const)
        : ('PENDING_PURCHASE' as const),
      ticketsAwarded: r.rewarded ? 1 : 0,
      createdAt: r.createdAt,
      rewardedAt: r.rewardedAt,
    }));

    return {
      referralCode,
      referralUrl,
      stats: {
        registered,
        qualified,
        ticketsEarned,
      },
      history,
    };
  }

  // ─── Admin listing (sin cambios funcionales) ──────────────────────────

  async findMany(
    query: ReferralQueryDto,
  ): Promise<Paginated<ReferralResponseDto>> {
    const where: Prisma.ReferralWhereInput = {};
    if (typeof query.rewarded === 'boolean') where.rewarded = query.rewarded;
    if (query.search) {
      where.OR = [
        {
          referrer: {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
        {
          referred: {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.referral.findMany({
        where,
        include: { referrer: true, referred: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.referral.count({ where }),
    ]);

    return {
      items: items.map((r) => this.toResponse(r)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  // ─── Internal helpers ─────────────────────────────────────────────────

  private buildRandomCode(): string {
    const bytes = randomBytes(REFERRAL_CODE_LENGTH);
    let suffix = '';
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
      suffix +=
        REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length];
    }
    return `${REFERRAL_CODE_PREFIX}${suffix}`;
  }

  private maskName(firstName: string, lastName: string): string {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    const initial = last ? `${last.charAt(0).toUpperCase()}.` : '';
    return [first, initial].filter(Boolean).join(' ');
  }

  private toResponse(
    row: Prisma.ReferralGetPayload<{
      include: { referrer: true; referred: true };
    }>,
  ): ReferralResponseDto {
    return {
      id: row.id,
      referrer: {
        id: row.referrer.id,
        email: row.referrer.email,
        firstName: row.referrer.firstName,
        lastName: row.referrer.lastName,
      },
      referred: {
        id: row.referred.id,
        email: row.referred.email,
        firstName: row.referred.firstName,
        lastName: row.referred.lastName,
      },
      rewarded: row.rewarded,
      rewardedAt: row.rewardedAt,
      createdAt: row.createdAt,
    };
  }
}
