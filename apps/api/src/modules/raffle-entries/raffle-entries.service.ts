import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EntryStatus,
  EntryType,
  PaymentMethod,
  Prisma,
  RaffleStatus,
  Role,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RafflePricingService } from '../raffles/raffle-pricing.service';
import {
  DecideEntryDto,
  EntryDecision,
  EntryQueryDto,
  GrantEntryDto,
  PurchaseEntryDto,
} from './dto';
import {
  PurchaseEntryResponseDto,
  RaffleEntryResponseDto,
} from './dto/entry-response.dto';
import { PaymentProviderRegistry } from './payments/payment-provider.registry';
import {
  ENTRY_DETAIL_INCLUDE,
  EntryWithDetails,
  RaffleEntriesRepository,
} from './repositories/raffle-entries.repository';

@Injectable()
export class RaffleEntriesService {
  private readonly logger = new Logger(RaffleEntriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entriesRepository: RaffleEntriesRepository,
    private readonly paymentProviderRegistry: PaymentProviderRegistry,
    private readonly rafflePricing: RafflePricingService,
  ) {}

  async purchase(
    user: AuthenticatedUser,
    dto: PurchaseEntryDto,
  ): Promise<PurchaseEntryResponseDto> {
    const provider = this.paymentProviderRegistry.resolve(dto.paymentMethod);

    const raffle = await this.prisma.raffle.findUnique({
      where: { id: dto.raffleId },
    });

    if (!raffle) {
      throw new NotFoundException('Raffle not found');
    }

    if (raffle.status !== RaffleStatus.PUBLISHED) {
      throw new BadRequestException('Raffle is not open for entries');
    }

    const now = new Date();
    if (raffle.endDate && now > raffle.endDate) {
      throw new BadRequestException('Raffle has already closed');
    }

    // F2.7-B / G9 — Fuente ÚNICA de verdad: el precio sale del
    // RafflePricingService, NUNCA de `raffle.ticketPrice` directo.
    // Aplica 50 % off automáticamente si el comprador es socio activo.
    // El cliente NO puede influir en el precio (anti-tamper).
    const pricing = await this.rafflePricing.resolveForUser(raffle, user.id);
    const unitPrice = pricing.applicablePrice;

    if (dto.paymentMethod === PaymentMethod.FREE && unitPrice > 0) {
      throw new BadRequestException(
        'FREE payment method can only be used for zero-priced raffles',
      );
    }

    if (raffle.soldTickets + dto.quantity > raffle.totalTickets) {
      throw new ConflictException(
        `Only ${raffle.totalTickets - raffle.soldTickets} ticket(s) remaining`,
      );
    }

    const totalAmount = +(unitPrice * dto.quantity).toFixed(2);

    const paymentResult = await provider.initiate({
      user,
      raffleId: raffle.id,
      quantity: dto.quantity,
      unitPrice,
      totalAmount,
    });

    const entries = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.raffle.updateMany({
        where: {
          id: raffle.id,
          status: RaffleStatus.PUBLISHED,
          soldTickets: raffle.soldTickets,
          totalTickets: { gte: raffle.soldTickets + dto.quantity },
        },
        data: { soldTickets: { increment: dto.quantity } },
      });

      if (reservation.count === 0) {
        throw new ConflictException(
          'Inventory changed — please retry your purchase',
        );
      }

      const created: EntryWithDetails[] = [];
      for (let i = 0; i < dto.quantity; i += 1) {
        const ticketNumber = raffle.soldTickets + i + 1;
        const entry = await tx.raffleEntry.create({
          data: {
            userId: user.id,
            raffleId: raffle.id,
            ticketNumber,
            type: dto.type ?? EntryType.DIRECT_PURCHASE,
            status: paymentResult.status,
            paymentMethod: dto.paymentMethod,
            paymentReference: paymentResult.reference,
          },
          include: ENTRY_DETAIL_INCLUDE,
        });
        created.push(entry);
      }

      const refreshed = await tx.raffle.findUniqueOrThrow({
        where: { id: raffle.id },
      });

      if (refreshed.soldTickets >= refreshed.totalTickets) {
        await tx.raffle.update({
          where: { id: raffle.id },
          data: { status: RaffleStatus.CLOSED },
        });
      }

      return created;
    });

    this.logger.log(
      `Entry purchase: user=${user.id} raffle=${raffle.id} qty=${dto.quantity} method=${dto.paymentMethod} status=${paymentResult.status}`,
    );

    return {
      entries: entries.map((e) => this.toResponse(e)),
      paymentReference: paymentResult.reference ?? null,
      totalAmount,
      paymentMethod: dto.paymentMethod,
    };
  }

  async grant(dto: GrantEntryDto): Promise<RaffleEntryResponseDto[]> {
    const raffle = await this.prisma.raffle.findUnique({
      where: { id: dto.raffleId },
    });

    if (!raffle) {
      throw new NotFoundException('Raffle not found');
    }

    if (raffle.soldTickets + dto.quantity > raffle.totalTickets) {
      throw new ConflictException(
        `Only ${raffle.totalTickets - raffle.soldTickets} ticket(s) remaining`,
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const entries = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.raffle.updateMany({
        where: {
          id: raffle.id,
          soldTickets: raffle.soldTickets,
          totalTickets: { gte: raffle.soldTickets + dto.quantity },
        },
        data: { soldTickets: { increment: dto.quantity } },
      });

      if (reservation.count === 0) {
        throw new ConflictException(
          'Inventory changed — please retry the grant',
        );
      }

      const created: EntryWithDetails[] = [];
      for (let i = 0; i < dto.quantity; i += 1) {
        const ticketNumber = raffle.soldTickets + i + 1;
        const entry = await tx.raffleEntry.create({
          data: {
            userId: dto.userId,
            raffleId: dto.raffleId,
            ticketNumber,
            type: dto.type,
            status: EntryStatus.PAID,
            paymentReference: `grant-${Date.now()}`,
          },
          include: ENTRY_DETAIL_INCLUDE,
        });
        created.push(entry);
      }

      return created;
    });

    return entries.map((e) => this.toResponse(e));
  }

  async findMine(
    user: AuthenticatedUser,
    query: EntryQueryDto,
  ): Promise<Paginated<RaffleEntryResponseDto>> {
    const where: Prisma.RaffleEntryWhereInput = { userId: user.id };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
    if (query.raffleId) where.raffleId = query.raffleId;

    return this.listAndMap(where, query.page, query.limit);
  }

  async findAll(
    query: EntryQueryDto,
  ): Promise<Paginated<RaffleEntryResponseDto>> {
    const where: Prisma.RaffleEntryWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
    if (query.raffleId) where.raffleId = query.raffleId;
    if (query.userId) where.userId = query.userId;

    return this.listAndMap(where, query.page, query.limit);
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<RaffleEntryResponseDto> {
    const entry = await this.entriesRepository.findById(id);

    if (!entry) {
      throw new NotFoundException('Entry not found');
    }

    const isPrivileged =
      user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    if (!isPrivileged && entry.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this entry');
    }

    return this.toResponse(entry);
  }

  async decide(
    id: string,
    dto: DecideEntryDto,
  ): Promise<RaffleEntryResponseDto> {
    const entry = await this.entriesRepository.findById(id);
    if (!entry) {
      throw new NotFoundException('Entry not found');
    }

    if (entry.status !== EntryStatus.PENDING_PAYMENT) {
      throw new ConflictException(
        `Entry is not pending review — current status: ${entry.status}`,
      );
    }

    const nextStatus =
      dto.decision === EntryDecision.APPROVE
        ? EntryStatus.PAID
        : EntryStatus.CANCELLED;

    await this.entriesRepository.updateStatus(entry.id, { status: nextStatus });

    // On reject, release the slot so others can buy it
    if (nextStatus === EntryStatus.CANCELLED) {
      await this.prisma.raffle.update({
        where: { id: entry.raffleId },
        data: { soldTickets: { decrement: 1 } },
      });
    }

    const refreshed = await this.entriesRepository.findById(entry.id);
    if (!refreshed) {
      throw new NotFoundException('Entry not found after decision');
    }

    this.logger.log(
      `Entry ${entry.id} ${dto.decision}d (status=${nextStatus})`,
    );
    return this.toResponse(refreshed);
  }

  private async listAndMap(
    where: Prisma.RaffleEntryWhereInput,
    page: number,
    limit: number,
  ): Promise<Paginated<RaffleEntryResponseDto>> {
    const { items, total } = await this.entriesRepository.findMany({
      where,
      page,
      limit,
    });

    return {
      items: items.map((e) => this.toResponse(e)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  private decimalToNumber(value: Prisma.Decimal | number | string): number {
    if (value instanceof Prisma.Decimal) {
      return value.toNumber();
    }
    return Number(value);
  }

  private toResponse(entry: EntryWithDetails): RaffleEntryResponseDto {
    return {
      id: entry.id,
      userId: entry.userId,
      raffleId: entry.raffleId,
      ticketNumber: entry.ticketNumber,
      type: entry.type,
      status: entry.status,
      paymentMethod: entry.paymentMethod,
      paymentReference: entry.paymentReference,
      createdAt: entry.createdAt,
      raffle: entry.raffle
        ? {
            id: entry.raffle.id,
            title: entry.raffle.title,
            slug: entry.raffle.slug,
            startDate: entry.raffle.startDate,
            endDate: entry.raffle.endDate,
          }
        : undefined,
      user: entry.user
        ? {
            id: entry.user.id,
            email: entry.user.email,
            firstName: entry.user.firstName,
            lastName: entry.user.lastName,
          }
        : undefined,
    };
  }
}
