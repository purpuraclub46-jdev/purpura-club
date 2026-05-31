import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Raffle, RaffleStatus, RaffleVisibility } from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { MembershipsService } from '../memberships/memberships.service';
import {
  AdminRaffleQueryDto,
  CreateRaffleDto,
  RaffleQueryDto,
  RaffleTimeFilter,
  UpdateRaffleDto,
} from './dto';
import { RaffleResponseDto } from './dto/raffle-response.dto';
import { generateUniqueSlug, slugify } from './helpers/slug.helper';
import { RafflePricingService } from './raffle-pricing.service';
import { RafflesRepository } from './repositories/raffles.repository';

@Injectable()
export class RafflesService {
  private readonly logger = new Logger(RafflesService.name);

  constructor(
    private readonly rafflesRepository: RafflesRepository,
    private readonly rafflePricing: RafflePricingService,
    private readonly memberships: MembershipsService,
  ) {}

  async create(dto: CreateRaffleDto): Promise<RaffleResponseDto> {
    this.assertValidDateRange(dto.startDate, dto.endDate);

    const slug = await this.resolveSlug(dto.slug, dto.title);

    try {
      // F2.7-B / D5 — Ignoramos `dto.memberTicketPrice`: el precio socio
      // es siempre 50 % off del precio público. Persistimos el valor derivado
      // en la columna legacy para mantener compatibilidad con consumers
      // externos que aún la lean. La fuente de verdad sigue siendo
      // RafflePricingService.
      const memberTicketPrice = this.rafflePricing.getMemberPrice({
        ticketPrice: dto.ticketPrice,
      });
      const raffle = await this.rafflesRepository.create({
        title: dto.title,
        slug,
        description: dto.description,
        bannerImage: dto.bannerImage,
        prizeImage: dto.prizeImage,
        countdown: dto.countdown,
        ticketPrice: new Prisma.Decimal(dto.ticketPrice),
        memberTicketPrice: new Prisma.Decimal(memberTicketPrice),
        totalTickets: dto.totalTickets,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status ?? RaffleStatus.DRAFT,
        visibility: dto.visibility ?? RaffleVisibility.PUBLIC,
      });

      this.logger.log(`Raffle created ${raffle.id} (${raffle.slug})`);
      return this.toResponse(raffle, false);
    } catch (error) {
      throw this.translateUniqueSlugError(error);
    }
  }

  async update(id: string, dto: UpdateRaffleDto): Promise<RaffleResponseDto> {
    const existing = await this.rafflesRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Raffle not found');
    }

    const startDate = dto.startDate ?? existing.startDate;
    const endDate = dto.endDate ?? existing.endDate;
    this.assertValidDateRange(startDate, endDate);

    if (
      dto.totalTickets !== undefined &&
      dto.totalTickets < existing.soldTickets
    ) {
      throw new BadRequestException(
        `totalTickets (${dto.totalTickets}) cannot be lower than already sold (${existing.soldTickets})`,
      );
    }

    let slug = existing.slug;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const normalized = slugify(dto.slug);
      const exists = await this.rafflesRepository.slugExists(normalized, id);
      if (exists) {
        throw new ConflictException('A raffle with this slug already exists');
      }
      slug = normalized;
    }

    try {
      // F2.7-B / D5 — Cuando se actualiza `ticketPrice`, recalculamos el
      // precio socio derivado para no dejar la columna legacy huérfana. Si
      // el caller envía `memberTicketPrice` se ignora deliberadamente.
      const memberTicketPriceForDb =
        dto.ticketPrice !== undefined
          ? new Prisma.Decimal(
              this.rafflePricing.getMemberPrice({
                ticketPrice: dto.ticketPrice,
              }),
            )
          : undefined;

      const updated = await this.rafflesRepository.update(id, {
        title: dto.title,
        slug,
        description: dto.description,
        bannerImage: dto.bannerImage,
        prizeImage: dto.prizeImage,
        countdown: dto.countdown,
        ticketPrice:
          dto.ticketPrice !== undefined
            ? new Prisma.Decimal(dto.ticketPrice)
            : undefined,
        memberTicketPrice: memberTicketPriceForDb,
        totalTickets: dto.totalTickets,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status,
        visibility: dto.visibility,
      });

      return this.toResponse(updated, false);
    } catch (error) {
      throw this.translateUniqueSlugError(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.rafflesRepository.delete(id);
      this.logger.log(`Raffle deleted ${id}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Raffle not found');
      }
      throw error;
    }
  }

  async publish(id: string): Promise<RaffleResponseDto> {
    const raffle = await this.rafflesRepository.findById(id);

    if (!raffle) {
      throw new NotFoundException('Raffle not found');
    }

    if (raffle.status === RaffleStatus.PUBLISHED) {
      return this.toResponse(raffle, false);
    }

    if (raffle.status === RaffleStatus.CANCELLED) {
      throw new BadRequestException('Cancelled raffles cannot be published');
    }

    if (raffle.totalTickets <= 0) {
      throw new BadRequestException(
        'Raffle must have at least one ticket available before publishing',
      );
    }

    const updated = await this.rafflesRepository.update(id, {
      status: RaffleStatus.PUBLISHED,
    });

    this.logger.log(`Raffle published ${id}`);
    return this.toResponse(updated, false);
  }

  async close(id: string): Promise<RaffleResponseDto> {
    const raffle = await this.rafflesRepository.findById(id);
    if (!raffle) {
      throw new NotFoundException('Raffle not found');
    }
    if (raffle.status === RaffleStatus.CLOSED) {
      return this.toResponse(raffle, false);
    }
    const updated = await this.rafflesRepository.update(id, {
      status: RaffleStatus.CLOSED,
    });
    return this.toResponse(updated, false);
  }

  async findPublic(
    query: RaffleQueryDto,
    userId?: string | null,
  ): Promise<Paginated<RaffleResponseDto>> {
    const now = new Date();
    const where: Prisma.RaffleWhereInput = {
      status: RaffleStatus.PUBLISHED,
      visibility: RaffleVisibility.PUBLIC,
    };

    if (query.timeFilter === RaffleTimeFilter.UPCOMING) {
      where.endDate = { gte: now };
    } else if (query.timeFilter === RaffleTimeFilter.PAST) {
      where.endDate = { lt: now };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.runListQuery(where, query.page, query.limit, userId);
  }

  async findAdmin(
    query: AdminRaffleQueryDto,
  ): Promise<Paginated<RaffleResponseDto>> {
    const now = new Date();
    const where: Prisma.RaffleWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.visibility) where.visibility = query.visibility;

    if (query.timeFilter === RaffleTimeFilter.UPCOMING) {
      where.endDate = { gte: now };
    } else if (query.timeFilter === RaffleTimeFilter.PAST) {
      where.endDate = { lt: now };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.runListQuery(where, query.page, query.limit, null);
  }

  async findBySlugPublic(
    slug: string,
    userId?: string | null,
  ): Promise<RaffleResponseDto> {
    const raffle = await this.rafflesRepository.findBySlug(slug);

    if (
      !raffle ||
      raffle.status !== RaffleStatus.PUBLISHED ||
      raffle.visibility !== RaffleVisibility.PUBLIC
    ) {
      throw new NotFoundException('Raffle not found');
    }

    const isMember = await this.resolveIsMember(userId);
    return this.toResponse(raffle, isMember);
  }

  async findByIdOrFail(id: string): Promise<Raffle> {
    const raffle = await this.rafflesRepository.findById(id);

    if (!raffle) {
      throw new NotFoundException('Raffle not found');
    }

    return raffle;
  }

  async findByIdAdmin(id: string): Promise<RaffleResponseDto> {
    const raffle = await this.findByIdOrFail(id);
    return this.toResponse(raffle, false);
  }

  private async runListQuery(
    where: Prisma.RaffleWhereInput,
    page: number,
    limit: number,
    userId?: string | null,
  ): Promise<Paginated<RaffleResponseDto>> {
    const { items, total } = await this.rafflesRepository.findMany({
      where,
      page,
      limit,
    });

    // Resolvemos `isMember` UNA vez por request (no por raffle) para evitar
    // N consultas en listados grandes.
    const isMember = await this.resolveIsMember(userId);

    return {
      items: items.map((raffle) => this.toResponse(raffle, isMember)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  private async resolveIsMember(
    userId: string | null | undefined,
  ): Promise<boolean> {
    if (!userId) return false;
    return this.memberships.isActive(userId);
  }

  private async resolveSlug(
    candidate: string | undefined,
    title: string,
  ): Promise<string> {
    if (candidate) {
      const normalized = slugify(candidate);
      const exists = await this.rafflesRepository.slugExists(normalized);
      if (exists) {
        throw new ConflictException('A raffle with this slug already exists');
      }
      return normalized;
    }

    let attempt = 0;
    while (attempt < 5) {
      const generated = generateUniqueSlug(title);
      const exists = await this.rafflesRepository.slugExists(generated);
      if (!exists) {
        return generated;
      }
      attempt += 1;
    }

    throw new ConflictException('Could not generate a unique slug');
  }

  private assertValidDateRange(start: Date, end: Date): void {
    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException('endDate must be after startDate');
    }
  }

  private translateUniqueSlugError(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('A raffle with this slug already exists');
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private decimalToNumber(value: Prisma.Decimal | number | string): number {
    if (value instanceof Prisma.Decimal) {
      return value.toNumber();
    }
    return Number(value);
  }

  private toResponse(raffle: Raffle, isMember: boolean): RaffleResponseDto {
    const pricing = this.rafflePricing.resolveFor(raffle, isMember);
    return {
      id: raffle.id,
      title: raffle.title,
      slug: raffle.slug,
      description: raffle.description,
      bannerImage: raffle.bannerImage,
      prizeImage: raffle.prizeImage,
      countdown: raffle.countdown,
      ticketPrice: this.decimalToNumber(raffle.ticketPrice),
      // F2.7-B — `memberTicketPrice` se sigue exponiendo como derivado
      // server-side (NUNCA se lee directo desde DB) para no romper consumers
      // legacy. El bloque `pricing` es la fuente canónica nueva.
      memberTicketPrice: pricing.memberPrice,
      totalTickets: raffle.totalTickets,
      soldTickets: raffle.soldTickets,
      remainingTickets: Math.max(0, raffle.totalTickets - raffle.soldTickets),
      status: raffle.status,
      visibility: raffle.visibility,
      winnerUserId: raffle.winnerUserId,
      startDate: raffle.startDate,
      endDate: raffle.endDate,
      createdAt: raffle.createdAt,
      updatedAt: raffle.updatedAt,
      pricing,
    };
  }
}
