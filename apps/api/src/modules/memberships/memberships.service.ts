import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  MembershipBenefitType,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailsService } from '../emails/emails.service';
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

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailsService,
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

    // Solo enviamos bienvenida la primera vez que se crea la membresía.
    let welcomeSent = false;
    if (!existing) {
      const userInfo = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });
      if (userInfo) {
        try {
          await this.emails.sendWelcomeMembership(userInfo.email, {
            firstName: userInfo.firstName,
            expiresAt: upserted.expiresAt,
          });
          welcomeSent = true;
        } catch (error) {
          this.logger.warn(
            `Welcome email failed for ${userInfo.email}: ${String(error)}`,
          );
        }
      }
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
        amount: args.amount !== undefined ? new Prisma.Decimal(args.amount) : null,
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
      daysRemaining:
        status.daysRemaining ?? computeDaysRemaining(m.expiresAt),
      lastPurchaseAt: m.lastPurchaseAt,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
