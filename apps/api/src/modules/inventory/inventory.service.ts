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
import { AdjustStockDto } from './dto/adjust-stock.dto';
import {
  InventoryQueryDto,
  MovementsQueryDto,
} from './dto/inventory-query.dto';
import {
  InventoryMovementResponseDto,
  InventoryRowDto,
} from './dto/inventory-response.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findInventory(
    query: InventoryQueryDto,
  ): Promise<Paginated<InventoryRowDto>> {
    const where: Prisma.BranchInventoryWhereInput = {};

    if (query.branchId) where.branchId = query.branchId;
    if (query.productId) where.productId = query.productId;
    if (query.lowStockOnly) where.stock = { lte: 5 };

    if (query.search) {
      where.product = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.branchInventory.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ branch: { name: 'asc' } }, { product: { name: 'asc' } }],
        include: {
          branch: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      }),
      this.prisma.branchInventory.count({ where }),
    ]);

    return {
      items: items.map(
        (row): InventoryRowDto => ({
          id: row.id,
          branchId: row.branchId,
          branchName: row.branch.name,
          productId: row.productId,
          productName: row.product.name,
          productSku: row.product.sku,
          stock: row.stock,
          reservedStock: row.reservedStock,
          availableStock: Math.max(0, row.stock - row.reservedStock),
          updatedAt: row.updatedAt,
        }),
      ),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async adjust(
    dto: AdjustStockDto,
    actorUserId?: string,
  ): Promise<InventoryRowDto> {
    if (dto.quantity === 0) {
      throw new BadRequestException('La cantidad no puede ser 0');
    }

    const [branch, product] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);

    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    if (!product) throw new NotFoundException('Producto no encontrado');

    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.branchInventory.upsert({
        where: {
          branchId_productId: {
            branchId: dto.branchId,
            productId: dto.productId,
          },
        },
        update: {},
        create: {
          branchId: dto.branchId,
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

      const updated = await tx.branchInventory.update({
        where: { id: current.id },
        data: { stock: nextStock },
        include: {
          branch: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          branchId: dto.branchId,
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
      `Stock adjusted ${dto.productId} @ ${dto.branchId} by ${dto.quantity} (${dto.type})`,
    );

    return {
      id: row.id,
      branchId: row.branchId,
      branchName: row.branch.name,
      productId: row.productId,
      productName: row.product.name,
      productSku: row.product.sku,
      stock: row.stock,
      reservedStock: row.reservedStock,
      availableStock: Math.max(0, row.stock - row.reservedStock),
      updatedAt: row.updatedAt,
    };
  }

  async transfer(
    dto: TransferStockDto,
    actorUserId?: string,
  ): Promise<void> {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException(
        'La sucursal origen y destino deben ser distintas',
      );
    }

    const [from, to, product] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.fromBranchId } }),
      this.prisma.branch.findUnique({ where: { id: dto.toBranchId } }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);

    if (!from) throw new NotFoundException('Sucursal origen no encontrada');
    if (!to) throw new NotFoundException('Sucursal destino no encontrada');
    if (!product) throw new NotFoundException('Producto no encontrado');

    await this.prisma.$transaction(async (tx) => {
      const source = await tx.branchInventory.findUnique({
        where: {
          branchId_productId: {
            branchId: dto.fromBranchId,
            productId: dto.productId,
          },
        },
      });

      if (!source || source.stock < dto.quantity) {
        throw new BadRequestException(
          'Stock insuficiente en la sucursal origen',
        );
      }

      await tx.branchInventory.update({
        where: { id: source.id },
        data: { stock: source.stock - dto.quantity },
      });

      const target = await tx.branchInventory.upsert({
        where: {
          branchId_productId: {
            branchId: dto.toBranchId,
            productId: dto.productId,
          },
        },
        update: { stock: { increment: dto.quantity } },
        create: {
          branchId: dto.toBranchId,
          productId: dto.productId,
          stock: dto.quantity,
        },
      });

      await tx.inventoryMovement.createMany({
        data: [
          {
            branchId: dto.fromBranchId,
            productId: dto.productId,
            quantity: -dto.quantity,
            type: InventoryMovementType.TRANSFER,
            reason: dto.reason ?? `Transferencia a ${to.name}`,
            createdByUserId: actorUserId,
          },
          {
            branchId: dto.toBranchId,
            productId: dto.productId,
            quantity: dto.quantity,
            type: InventoryMovementType.TRANSFER,
            reason: dto.reason ?? `Transferencia desde ${from.name}`,
            createdByUserId: actorUserId,
          },
        ],
      });

      return target;
    });

    this.logger.log(
      `Transferred ${dto.quantity} of ${dto.productId} from ${dto.fromBranchId} to ${dto.toBranchId}`,
    );
  }

  async findMovements(
    query: MovementsQueryDto,
  ): Promise<Paginated<InventoryMovementResponseDto>> {
    const where: Prisma.InventoryMovementWhereInput = {};

    if (query.branchId) where.branchId = query.branchId;
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
          branch: { select: { id: true, name: true } },
          product: { select: { id: true, name: true, sku: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      items: items.map(
        (m): InventoryMovementResponseDto => ({
          id: m.id,
          branchId: m.branchId,
          branchName: m.branch.name,
          productId: m.productId,
          productName: m.product.name,
          productSku: m.product.sku,
          quantity: m.quantity,
          type: m.type,
          reason: m.reason,
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
}
