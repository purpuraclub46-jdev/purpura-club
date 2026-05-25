import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ADJUSTMENT_MOVEMENT_TYPES,
  AdjustStockDto,
  ReserveStockDto,
  UpdateMinimumStockDto,
} from './dto/adjust-stock.dto';
import {
  MovementsQueryDto,
  StockQueryDto,
} from './dto/inventory-query.dto';
import {
  InventoryMovementResponseDto,
  StockRowDto,
} from './dto/inventory-response.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Stock list ─────────────────────────────────────────────────

  async findStock(query: StockQueryDto): Promise<Paginated<StockRowDto>> {
    const where: Prisma.InventoryStockWhereInput = {};

    if (query.inventoryLocationId) {
      where.inventoryLocationId = query.inventoryLocationId;
    }
    if (query.productId) where.productId = query.productId;

    if (query.search) {
      where.product = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const skip = (query.page - 1) * query.limit;

    let [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryStock.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [
          { location: { name: 'asc' } },
          { product: { name: 'asc' } },
        ],
        include: {
          location: { select: { id: true, name: true, type: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      }),
      this.prisma.inventoryStock.count({ where }),
    ]);

    if (query.lowStockOnly) {
      // Filtramos a nivel app porque Prisma no soporta comparar dos
      // columnas en where directamente en versiones 5.x.
      items = items.filter((row) => row.stock <= row.minimumStock);
      total = items.length;
    }

    return {
      items: items.map((row) => this.toStockRow(row)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  // ─── Adjust ─────────────────────────────────────────────────────

  async adjust(
    dto: AdjustStockDto,
    actorUserId?: string,
  ): Promise<StockRowDto> {
    if (dto.quantity === 0) {
      throw new BadRequestException('La cantidad no puede ser 0');
    }
    if (
      !ADJUSTMENT_MOVEMENT_TYPES.includes(
        dto.type as (typeof ADJUSTMENT_MOVEMENT_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        'Tipo de movimiento no permitido para ajuste manual',
      );
    }

    await this.assertLocationAndProduct(dto.inventoryLocationId, dto.productId);

    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.inventoryStock.upsert({
        where: {
          inventoryLocationId_productId: {
            inventoryLocationId: dto.inventoryLocationId,
            productId: dto.productId,
          },
        },
        update: {},
        create: {
          inventoryLocationId: dto.inventoryLocationId,
          productId: dto.productId,
          stock: 0,
        },
      });

      const nextStock = current.stock + dto.quantity;
      if (nextStock < 0) {
        throw new BadRequestException(
          `Stock insuficiente: actual ${current.stock}, ajuste ${dto.quantity}`,
        );
      }

      const updated = await tx.inventoryStock.update({
        where: { id: current.id },
        data: { stock: nextStock },
        include: {
          location: { select: { id: true, name: true, type: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryLocationId: dto.inventoryLocationId,
          productId: dto.productId,
          quantity: dto.quantity,
          type: dto.type,
          reason: dto.reason,
          createdByUserId: actorUserId,
        },
      });

      return updated;
    });

    this.logger.log(
      `Stock adjusted ${dto.productId} @ ${dto.inventoryLocationId} by ${dto.quantity} (${dto.type})`,
    );
    return this.toStockRow(row);
  }

  // ─── Minimum stock ──────────────────────────────────────────────

  async setMinimum(
    dto: UpdateMinimumStockDto,
  ): Promise<StockRowDto> {
    if (dto.minimumStock < 0) {
      throw new BadRequestException('El stock mínimo no puede ser negativo');
    }

    await this.assertLocationAndProduct(dto.inventoryLocationId, dto.productId);

    const row = await this.prisma.inventoryStock.upsert({
      where: {
        inventoryLocationId_productId: {
          inventoryLocationId: dto.inventoryLocationId,
          productId: dto.productId,
        },
      },
      create: {
        inventoryLocationId: dto.inventoryLocationId,
        productId: dto.productId,
        stock: 0,
        minimumStock: dto.minimumStock,
      },
      update: { minimumStock: dto.minimumStock },
      include: {
        location: { select: { id: true, name: true, type: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    return this.toStockRow(row);
  }

  // ─── Reservations ───────────────────────────────────────────────

  async reserve(
    dto: ReserveStockDto,
    actorUserId?: string,
  ): Promise<StockRowDto> {
    if (dto.quantity <= 0) {
      throw new BadRequestException(
        'La cantidad a reservar debe ser mayor a 0',
      );
    }
    return this.applyReservation(dto, dto.quantity, actorUserId);
  }

  async release(
    dto: ReserveStockDto,
    actorUserId?: string,
  ): Promise<StockRowDto> {
    if (dto.quantity <= 0) {
      throw new BadRequestException(
        'La cantidad a liberar debe ser mayor a 0',
      );
    }
    return this.applyReservation(dto, -dto.quantity, actorUserId);
  }

  private async applyReservation(
    dto: ReserveStockDto,
    signedQuantity: number,
    actorUserId?: string,
  ): Promise<StockRowDto> {
    await this.assertLocationAndProduct(dto.inventoryLocationId, dto.productId);

    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.inventoryStock.upsert({
        where: {
          inventoryLocationId_productId: {
            inventoryLocationId: dto.inventoryLocationId,
            productId: dto.productId,
          },
        },
        update: {},
        create: {
          inventoryLocationId: dto.inventoryLocationId,
          productId: dto.productId,
          stock: 0,
        },
      });

      const nextReserved = current.reservedStock + signedQuantity;
      if (nextReserved < 0) {
        throw new BadRequestException(
          `No hay suficiente reserva para liberar (actual ${current.reservedStock})`,
        );
      }

      const available = current.stock - current.reservedStock;
      if (signedQuantity > 0 && available < signedQuantity) {
        throw new BadRequestException(
          `Stock disponible insuficiente (${available}) para reservar ${signedQuantity}`,
        );
      }

      const updated = await tx.inventoryStock.update({
        where: { id: current.id },
        data: { reservedStock: nextReserved },
        include: {
          location: { select: { id: true, name: true, type: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryLocationId: dto.inventoryLocationId,
          productId: dto.productId,
          quantity: signedQuantity,
          type: InventoryMovementType.RESERVATION,
          reason: dto.reason ?? (signedQuantity > 0 ? 'Reserva' : 'Liberación'),
          createdByUserId: actorUserId,
        },
      });

      return updated;
    });

    return this.toStockRow(row);
  }

  // ─── Movements ──────────────────────────────────────────────────

  async findMovements(
    query: MovementsQueryDto,
  ): Promise<Paginated<InventoryMovementResponseDto>> {
    const where: Prisma.InventoryMovementWhereInput = {};

    if (query.inventoryLocationId) {
      where.inventoryLocationId = query.inventoryLocationId;
    }
    if (query.productId) where.productId = query.productId;
    if (query.type) where.type = query.type;

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          location: { select: { id: true, name: true, type: true } },
          product: { select: { id: true, name: true, sku: true } },
          createdByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          transfer: { select: { id: true, number: true } },
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      items: items.map(
        (m): InventoryMovementResponseDto => ({
          id: m.id,
          inventoryLocationId: m.inventoryLocationId,
          locationName: m.location.name,
          locationType: m.location.type,
          productId: m.productId,
          productName: m.product.name,
          productSku: m.product.sku,
          quantity: m.quantity,
          type: m.type,
          reason: m.reason,
          transferId: m.transferId,
          transferNumber: m.transfer?.number ?? null,
          createdByUserId: m.createdByUserId,
          createdByUserName: m.createdByUser
            ? `${m.createdByUser.firstName} ${m.createdByUser.lastName}`.trim()
            : null,
          createdAt: m.createdAt,
        }),
      ),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private async assertLocationAndProduct(
    locationId: string,
    productId: string,
  ): Promise<void> {
    const [loc, prod] = await Promise.all([
      this.prisma.inventoryLocation.findUnique({
        where: { id: locationId },
        select: { id: true },
      }),
      this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
      }),
    ]);
    if (!loc) throw new NotFoundException('Ubicación no encontrada');
    if (!prod) throw new NotFoundException('Producto no encontrado');
  }

  private toStockRow(row: {
    id: string;
    inventoryLocationId: string;
    productId: string;
    stock: number;
    reservedStock: number;
    minimumStock: number;
    updatedAt: Date;
    location: { id: string; name: string; type: any };
    product: { id: string; name: string; sku: string };
  }): StockRowDto {
    const available = Math.max(0, row.stock - row.reservedStock);
    let stockLevel: 'OK' | 'LOW' | 'OUT_OF_STOCK' = 'OK';
    if (row.stock === 0) stockLevel = 'OUT_OF_STOCK';
    else if (row.stock <= row.minimumStock) stockLevel = 'LOW';

    return {
      id: row.id,
      inventoryLocationId: row.inventoryLocationId,
      locationName: row.location.name,
      locationType: row.location.type,
      productId: row.productId,
      productName: row.product.name,
      productSku: row.product.sku,
      stock: row.stock,
      reservedStock: row.reservedStock,
      minimumStock: row.minimumStock,
      availableStock: available,
      stockLevel,
      updatedAt: row.updatedAt,
    };
  }
}
