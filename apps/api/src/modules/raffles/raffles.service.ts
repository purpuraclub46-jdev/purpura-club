import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Raffle,
  RaffleStatus,
  RaffleVisibility,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import {
  AdminRaffleQueryDto,
  CreateRaffleDto,
  RaffleQueryDto,
  RaffleTimeFilter,
  UpdateRaffleDto,
} from './dto';
import { RaffleResponseDto } from './dto/raffle-response.dto';
import { generateUniqueSlug, slugify } from './helpers/slug.helper';
import { RafflesRepository } from './repositories/raffles.repository';

@Injectable()
export class RafflesService {
  private readonly logger = new Logger(RafflesService.name);

  constructor(private readonly rafflesRepository: RafflesRepository) {}

  async create(dto: CreateRaffleDto): Promise<RaffleResponseDto> {
    this.assertValidDateRange(dto.startDate, dto.endDate);
    this.assertValidPricing(dto.ticketPrice, dto.memberTicketPrice);

    const slug = await this.resolveSlug(dto.slug, dto.title);

    try {
      const raffle = await this.rafflesRepository.create({
        title: dto.title,
        slug,
        description: dto.description,
        bannerImage: dto.bannerImage,
        prizeImage: dto.prizeImage,
        countdown: dto.countdown,
        ticketPrice: new Prisma.Decimal(dto.ticketPrice),
        memberTicketPrice: new Prisma.Decimal(dto.memberTicketPrice),
        totalTickets: dto.totalTickets,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status ?? RaffleStatus.DRAFT,
        visibility: dto.visibility ?? RaffleVisibility.PUBLIC,
      });

      this.logger.log(`Raffle created ${raffle.id} (${raffle.slug})`);
      return this.toResponse(raffle);
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

    if (dto.totalTickets !== undefined && dto.totalTickets < existing.soldTickets) {
      throw new BadRequestException(
        `totalTickets (${dto.totalTickets}) cannot be lower than already sold (${existing.soldTickets})`,
      );
    }

    const ticketPrice =
      dto.ticketPrice ?? this.decimalToNumber(existing.ticketPrice);
    const memberTicketPrice =
      dto.memberTicketPrice ?? this.decimalToNumber(existing.memberTicketPrice);
    this.assertValidPricing(ticketPrice, memberTicketPrice);

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
        memberTicketPrice:
          dto.memberTicketPrice !== undefined
            ? new Prisma.Decimal(dto.memberTicketPrice)
            : undefined,
        totalTickets: dto.totalTickets,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status,
        visibility: dto.visibility,
      });

      return this.toResponse(updated);
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
      return this.toResponse(raffle);
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
    return this.toResponse(updated);
  }

  async close(id: string): Promise<RaffleResponseDto> {
    const raffle = await this.rafflesRepository.findById(id);
    if (!raffle) {
      throw new NotFoundException('Raffle not found');
    }
    if (raffle.status === RaffleStatus.CLOSED) {
      return this.toResponse(raffle);
    }
    const updated = await this.rafflesRepository.update(id, {
      status: RaffleStatus.CLOSED,
    });
    return this.toResponse(updated);
  }

  async findPublic(
    query: RaffleQueryDto,
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

    return this.runListQuery(where, query.page, query.limit);
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

    return this.runListQuery(where, query.page, query.limit);
  }

  async findBySlugPublic(slug: string): Promise<RaffleResponseDto> {
    const raffle = await this.rafflesRepository.findBySlug(slug);

    if (
      !raffle ||
      raffle.status !== RaffleStatus.PUBLISHED ||
      raffle.visibility !== RaffleVisibility.PUBLIC
    ) {
      throw new NotFoundException('Raffle not found');
    }

    return this.toResponse(raffle);
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
    return this.toResponse(raffle);
  }

  private async runListQuery(
    where: Prisma.RaffleWhereInput,
    page: number,
    limit: number,
  ): Promise<Paginated<RaffleResponseDto>> {
    const { items, total } = await this.rafflesRepository.findMany({
      where,
      page,
      limit,
    });

    return {
      items: items.map((raffle) => this.toResponse(raffle)),
      meta: buildPaginationMeta(total, page, limit),
    };
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

  private assertValidPricing(ticket: number, member: number): void {
    if (member > ticket) {
      throw new BadRequestException(
        'memberTicketPrice cannot exceed ticketPrice',
      );
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

  private toResponse(raffle: Raffle): RaffleResponseDto {
    return {
      id: raffle.id,
      title: raffle.title,
      slug: raffle.slug,
      description: raffle.description,
      bannerImage: raffle.bannerImage,
      prizeImage: raffle.prizeImage,
      countdown: raffle.countdown,
      ticketPrice: this.decimalToNumber(raffle.ticketPrice),
      memberTicketPrice: this.decimalToNumber(raffle.memberTicketPrice),
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
    };
  }
}
