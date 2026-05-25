import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralQueryDto } from './dto/referral-query.dto';
import { ReferralResponseDto } from './dto/referral-response.dto';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea el vínculo cuando un usuario nuevo se registra usando otro como
   * referrer. Idempotente: no duplica si ya existe.
   */
  async link(args: { referrerUserId: string; referredUserId: string }) {
    if (args.referrerUserId === args.referredUserId) return null;
    const existing = await this.prisma.referral.findUnique({
      where: { referredUserId: args.referredUserId },
    });
    if (existing) return existing;

    return this.prisma.referral.create({
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
   * (OrdersService) le otorgue la entrada bonus.
   *
   * Atómico cuando se pasa una transacción: usa updateMany(where: rewarded:false)
   * para garantizar que solo un caller en concurrencia recibe la responsabilidad
   * de otorgar la recompensa.
   */
  async claimRewardForFirstPurchase(args: {
    referredUserId: string;
    tx?: Tx;
  }): Promise<{ referrerUserId: string } | null> {
    const db = args.tx ?? this.prisma;
    const referral = await db.referral.findUnique({
      where: { referredUserId: args.referredUserId },
      select: { id: true, referrerUserId: true, rewarded: true },
    });
    if (!referral || referral.rewarded) return null;

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
