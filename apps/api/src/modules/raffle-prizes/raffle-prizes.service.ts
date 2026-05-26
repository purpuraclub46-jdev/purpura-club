import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EntryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignWinnerDto } from './dto/assign-winner.dto';
import { CreatePrizeDto } from './dto/create-prize.dto';
import { PrizeResponseDto } from './dto/prize-response.dto';
import { PublishWinnerDto } from './dto/publish-winner.dto';
import { UpdatePrizeDto } from './dto/update-prize.dto';

@Injectable()
export class RafflePrizesService {
  private readonly logger = new Logger(RafflePrizesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listByRaffle(raffleId: string): Promise<PrizeResponseDto[]> {
    await this.ensureRaffleExists(raffleId);
    const prizes = await this.prisma.rafflePrize.findMany({
      where: { raffleId },
      orderBy: { position: 'asc' },
      include: {
        winnerUser: true,
        winnerEntry: { select: { ticketNumber: true } },
      },
    });
    return prizes.map((p) => this.toResponse(p));
  }

  async findById(id: string): Promise<PrizeResponseDto> {
    const prize = await this.prisma.rafflePrize.findUnique({
      where: { id },
      include: {
        winnerUser: true,
        winnerEntry: { select: { ticketNumber: true } },
      },
    });
    if (!prize) throw new NotFoundException('Premio no encontrado');
    return this.toResponse(prize);
  }

  async create(
    raffleId: string,
    dto: CreatePrizeDto,
  ): Promise<PrizeResponseDto> {
    await this.ensureRaffleExists(raffleId);

    try {
      const created = await this.prisma.rafflePrize.create({
        data: {
          raffleId,
          title: dto.title,
          description: dto.description ?? null,
          image: dto.image ?? null,
          position: dto.position,
        },
        include: {
          winnerUser: true,
          winnerEntry: { select: { ticketNumber: true } },
        },
      });
      return this.toResponse(created);
    } catch (error) {
      throw this.translatePositionConflict(error);
    }
  }

  async update(id: string, dto: UpdatePrizeDto): Promise<PrizeResponseDto> {
    const existing = await this.prisma.rafflePrize.findUnique({
      where: { id },
      select: { id: true, raffleId: true },
    });
    if (!existing) throw new NotFoundException('Premio no encontrado');

    try {
      const updated = await this.prisma.rafflePrize.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          image: dto.image,
          position: dto.position,
        },
        include: {
          winnerUser: true,
          winnerEntry: { select: { ticketNumber: true } },
        },
      });
      return this.toResponse(updated);
    } catch (error) {
      throw this.translatePositionConflict(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.rafflePrize.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Premio no encontrado');
      }
      throw error;
    }
  }

  /**
   * Asigna un ganador manualmente con base en el número de ticket
   * exportado en el Excel. Validaciones:
   *   - ticket debe existir en el sorteo correcto
   *   - ticket debe estar PAGADO (no PENDING / CANCELLED)
   *   - ticket no debe haber sido usado por otro premio del mismo sorteo
   *
   * No publica automáticamente — el admin debe llamar `publishWinner`
   * después de cargar foto/video.
   */
  async assignWinner(
    id: string,
    dto: AssignWinnerDto,
  ): Promise<PrizeResponseDto> {
    const prize = await this.prisma.rafflePrize.findUnique({
      where: { id },
      select: { id: true, raffleId: true, winnerPublished: true },
    });
    if (!prize) throw new NotFoundException('Premio no encontrado');
    if (prize.winnerPublished) {
      throw new ConflictException(
        'El ganador ya fue publicado oficialmente. Desbloquéalo antes de cambiarlo.',
      );
    }

    const entry = await this.prisma.raffleEntry.findUnique({
      where: {
        raffleId_ticketNumber: {
          raffleId: prize.raffleId,
          ticketNumber: dto.ticketNumber,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            dni: true,
          },
        },
        wonPrize: { select: { id: true, title: true } },
      },
    });

    if (!entry) {
      throw new NotFoundException(
        `El ticket #${dto.ticketNumber} no existe en este sorteo.`,
      );
    }
    if (entry.status !== EntryStatus.PAID) {
      throw new BadRequestException(
        `El ticket #${dto.ticketNumber} no está PAGADO (estado actual: ${entry.status}).`,
      );
    }
    if (entry.wonPrize && entry.wonPrize.id !== id) {
      throw new ConflictException(
        `El ticket #${dto.ticketNumber} ya está asignado al premio "${entry.wonPrize.title}".`,
      );
    }

    const updated = await this.prisma.rafflePrize.update({
      where: { id },
      data: {
        winnerUserId: entry.userId,
        winnerEntryId: entry.id,
        winnerTicketNumber: entry.ticketNumber,
      },
      include: {
        winnerUser: true,
        winnerEntry: { select: { ticketNumber: true } },
      },
    });

    this.logger.log(
      `Prize ${id} assigned to ticket #${entry.ticketNumber} (user=${entry.userId})`,
    );
    return this.toResponse(updated);
  }

  /** Limpia el ganador asignado (solo si aún no fue publicado). */
  async clearWinner(id: string): Promise<PrizeResponseDto> {
    const prize = await this.prisma.rafflePrize.findUnique({
      where: { id },
      select: { winnerPublished: true },
    });
    if (!prize) throw new NotFoundException('Premio no encontrado');
    if (prize.winnerPublished) {
      throw new ConflictException(
        'No se puede quitar al ganador publicado oficialmente.',
      );
    }

    const updated = await this.prisma.rafflePrize.update({
      where: { id },
      data: {
        winnerUserId: null,
        winnerEntryId: null,
        winnerTicketNumber: null,
      },
      include: {
        winnerUser: true,
        winnerEntry: { select: { ticketNumber: true } },
      },
    });
    return this.toResponse(updated);
  }

  /**
   * Publica oficialmente al ganador: registra foto, video, comunicado y
   * marca `publishedAt`. Requiere que ya exista un ganador asignado.
   */
  async publishWinner(
    id: string,
    dto: PublishWinnerDto,
  ): Promise<PrizeResponseDto> {
    const prize = await this.prisma.rafflePrize.findUnique({
      where: { id },
      select: { winnerEntryId: true },
    });
    if (!prize) throw new NotFoundException('Premio no encontrado');
    if (!prize.winnerEntryId) {
      throw new BadRequestException(
        'Asigna primero un ganador con el número de ticket antes de publicar.',
      );
    }

    const updated = await this.prisma.rafflePrize.update({
      where: { id },
      data: {
        winnerPhoto: dto.winnerPhoto,
        winnerVideo: dto.winnerVideo,
        winnerAnnouncement: dto.winnerAnnouncement,
        winnerPublished: true,
        publishedAt: new Date(),
      },
      include: {
        winnerUser: true,
        winnerEntry: { select: { ticketNumber: true } },
      },
    });

    this.logger.log(`Prize ${id} winner published`);
    return this.toResponse(updated);
  }

  /** Despublicar (solo SUPER_ADMIN debería poder, validado en controller). */
  async unpublishWinner(id: string): Promise<PrizeResponseDto> {
    const prize = await this.prisma.rafflePrize.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!prize) throw new NotFoundException('Premio no encontrado');

    const updated = await this.prisma.rafflePrize.update({
      where: { id },
      data: { winnerPublished: false, publishedAt: null },
      include: {
        winnerUser: true,
        winnerEntry: { select: { ticketNumber: true } },
      },
    });
    return this.toResponse(updated);
  }

  /** Listado público de ganadores oficiales (landing / panel usuario). */
  async listPublishedWinners(): Promise<PrizeResponseDto[]> {
    const prizes = await this.prisma.rafflePrize.findMany({
      where: { winnerPublished: true },
      orderBy: [{ publishedAt: 'desc' }, { position: 'asc' }],
      include: {
        winnerUser: true,
        winnerEntry: { select: { ticketNumber: true } },
      },
    });
    return prizes.map((p) => this.toResponse(p));
  }

  // ─── helpers privados ────────────────────────────────────────────
  private async ensureRaffleExists(raffleId: string): Promise<void> {
    const raffle = await this.prisma.raffle.findUnique({
      where: { id: raffleId },
      select: { id: true },
    });
    if (!raffle) throw new NotFoundException('Sorteo no encontrado');
  }

  private translatePositionConflict(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        'Ya existe otro premio con la misma posición en este sorteo.',
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private toResponse(
    prize: Prisma.RafflePrizeGetPayload<{
      include: {
        winnerUser: true;
        winnerEntry: { select: { ticketNumber: true } };
      };
    }>,
  ): PrizeResponseDto {
    return {
      id: prize.id,
      raffleId: prize.raffleId,
      title: prize.title,
      description: prize.description,
      image: prize.image,
      position: prize.position,
      winner:
        prize.winnerUser && prize.winnerEntry
          ? {
              userId: prize.winnerUser.id,
              fullName:
                `${prize.winnerUser.firstName} ${prize.winnerUser.lastName}`.trim(),
              email: prize.winnerUser.email,
              dni: prize.winnerUser.dni,
              ticketNumber: prize.winnerEntry.ticketNumber,
            }
          : null,
      winnerPublished: prize.winnerPublished,
      winnerPhoto: prize.winnerPhoto,
      winnerVideo: prize.winnerVideo,
      winnerAnnouncement: prize.winnerAnnouncement,
      publishedAt: prize.publishedAt,
      createdAt: prize.createdAt,
      updatedAt: prize.updatedAt,
    };
  }
}
