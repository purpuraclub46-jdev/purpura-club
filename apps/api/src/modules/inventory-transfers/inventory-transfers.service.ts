import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryMovementType,
  InventoryTransferStatus,
  Prisma,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferQueryDto } from './dto/transfer-query.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { generateTransferNumber } from './helpers/transfer-number.helper';

const transferInclude = Prisma.validator<Prisma.InventoryTransferInclude>()({
  fromLocation: { select: { id: true, name: true, type: true } },
  toLocation: { select: { id: true, name: true, type: true } },
  createdByUser: { select: { id: true, firstName: true, lastName: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
    },
  },
});

type TransferWithRelations = Prisma.InventoryTransferGetPayload<{
  include: typeof transferInclude;
}>;

@Injectable()
export class InventoryTransfersService {
  private readonly logger = new Logger(InventoryTransfersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Create (PENDING) ───────────────────────────────────────────

  async create(
    dto: CreateTransferDto,
    actorUserId?: string,
  ): Promise<TransferResponseDto> {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException(
        'La ubicación de origen y destino deben ser distintas',
      );
    }
    if (dto.items.length === 0) {
      throw new BadRequestException('La transferencia requiere al menos un ítem');
    }

    // Consolidar duplicados por productId (sumar cantidades)
    const merged = new Map<string, number>();
    for (const item of dto.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException(
          'La cantidad por ítem debe ser mayor a 0',
        );
      }
      merged.set(
        item.productId,
        (merged.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const [from, to] = await Promise.all([
      this.prisma.inventoryLocation.findUnique({
        where: { id: dto.fromLocationId },
        select: { id: true, active: true },
      }),
      this.prisma.inventoryLocation.findUnique({
        where: { id: dto.toLocationId },
        select: { id: true, active: true },
      }),
    ]);

    if (!from) throw new NotFoundException('Ubicación origen no encontrada');
    if (!to) throw new NotFoundException('Ubicación destino no encontrada');
    if (!from.active || !to.active) {
      throw new BadRequestException(
        'Las ubicaciones origen y destino deben estar activas',
      );
    }

    const productIds = [...merged.keys()];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException(
        'Uno o más productos de la transferencia no existen',
      );
    }

    const number = await this.allocateNumber();

    const created = await this.prisma.inventoryTransfer.create({
      data: {
        number,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        notes: dto.notes,
        createdByUserId: actorUserId,
        status: InventoryTransferStatus.PENDING,
        items: {
          create: [...merged.entries()].map(([productId, quantity]) => ({
            productId,
            quantity,
          })),
        },
      },
      include: transferInclude,
    });

    this.logger.log(
      `Transfer created ${created.number}: ${dto.fromLocationId} → ${dto.toLocationId} (${productIds.length} productos)`,
    );

    return this.toResponse(created);
  }

  // ─── Complete ───────────────────────────────────────────────────

  async complete(
    id: string,
    actorUserId?: string,
  ): Promise<TransferResponseDto> {
    const existing = await this.prisma.inventoryTransfer.findUnique({
      where: { id },
      include: transferInclude,
    });
    if (!existing) throw new NotFoundException('Transferencia no encontrada');
    if (existing.status !== InventoryTransferStatus.PENDING) {
      throw new ConflictException(
        `La transferencia ya está ${existing.status === 'COMPLETED' ? 'completada' : 'cancelada'}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Mover stock + crear movimientos por cada ítem
      for (const item of existing.items) {
        const source = await tx.inventoryStock.findUnique({
          where: {
            inventoryLocationId_productId: {
              inventoryLocationId: existing.fromLocationId,
              productId: item.productId,
            },
          },
        });

        if (!source || source.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente en origen para ${item.product.name} (disponible ${source?.stock ?? 0}, requerido ${item.quantity})`,
          );
        }

        await tx.inventoryStock.update({
          where: { id: source.id },
          data: { stock: source.stock - item.quantity },
        });

        await tx.inventoryStock.upsert({
          where: {
            inventoryLocationId_productId: {
              inventoryLocationId: existing.toLocationId,
              productId: item.productId,
            },
          },
          create: {
            inventoryLocationId: existing.toLocationId,
            productId: item.productId,
            stock: item.quantity,
          },
          update: { stock: { increment: item.quantity } },
        });

        await tx.inventoryMovement.createMany({
          data: [
            {
              inventoryLocationId: existing.fromLocationId,
              productId: item.productId,
              quantity: -item.quantity,
              type: InventoryMovementType.TRANSFER_OUT,
              reason: `Transferencia ${existing.number} → ${existing.toLocation.name}`,
              createdByUserId: actorUserId,
              transferId: existing.id,
            },
            {
              inventoryLocationId: existing.toLocationId,
              productId: item.productId,
              quantity: item.quantity,
              type: InventoryMovementType.TRANSFER_IN,
              reason: `Transferencia ${existing.number} ← ${existing.fromLocation.name}`,
              createdByUserId: actorUserId,
              transferId: existing.id,
            },
          ],
        });
      }

      return tx.inventoryTransfer.update({
        where: { id },
        data: {
          status: InventoryTransferStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: transferInclude,
      });
    });

    this.logger.log(`Transfer completed ${result.number}`);
    return this.toResponse(result);
  }

  // ─── Cancel ─────────────────────────────────────────────────────

  async cancel(id: string): Promise<TransferResponseDto> {
    const existing = await this.prisma.inventoryTransfer.findUnique({
      where: { id },
      select: { id: true, status: true, number: true },
    });
    if (!existing) throw new NotFoundException('Transferencia no encontrada');
    if (existing.status !== InventoryTransferStatus.PENDING) {
      throw new ConflictException(
        'Sólo se pueden cancelar transferencias pendientes',
      );
    }

    const updated = await this.prisma.inventoryTransfer.update({
      where: { id },
      data: { status: InventoryTransferStatus.CANCELLED },
      include: transferInclude,
    });

    this.logger.log(`Transfer cancelled ${updated.number}`);
    return this.toResponse(updated);
  }

  // ─── Find ───────────────────────────────────────────────────────

  async findById(id: string): Promise<TransferResponseDto> {
    const transfer = await this.prisma.inventoryTransfer.findUnique({
      where: { id },
      include: transferInclude,
    });
    if (!transfer) throw new NotFoundException('Transferencia no encontrada');
    return this.toResponse(transfer);
  }

  async findMany(
    query: TransferQueryDto,
  ): Promise<Paginated<TransferResponseDto>> {
    const where: Prisma.InventoryTransferWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.fromLocationId) where.fromLocationId = query.fromLocationId;
    if (query.toLocationId) where.toLocationId = query.toLocationId;
    if (query.search) {
      where.number = { contains: query.search, mode: 'insensitive' };
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryTransfer.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: transferInclude,
      }),
      this.prisma.inventoryTransfer.count({ where }),
    ]);

    return {
      items: items.map((t) => this.toResponse(t)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private async allocateNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const candidate = generateTransferNumber();
      const exists = await this.prisma.inventoryTransfer.findUnique({
        where: { number: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new BadRequestException(
      'No se pudo generar un número único de transferencia',
    );
  }

  private toResponse(
    transfer: TransferWithRelations,
  ): TransferResponseDto {
    return {
      id: transfer.id,
      number: transfer.number,
      fromLocation: {
        id: transfer.fromLocation.id,
        name: transfer.fromLocation.name,
        type: transfer.fromLocation.type,
      },
      toLocation: {
        id: transfer.toLocation.id,
        name: transfer.toLocation.name,
        type: transfer.toLocation.type,
      },
      status: transfer.status,
      notes: transfer.notes,
      createdByUserName: transfer.createdByUser
        ? `${transfer.createdByUser.firstName} ${transfer.createdByUser.lastName}`.trim()
        : null,
      items: transfer.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
      })),
      totalQuantity: transfer.items.reduce((sum, it) => sum + it.quantity, 0),
      createdAt: transfer.createdAt,
      completedAt: transfer.completedAt,
    };
  }
}
