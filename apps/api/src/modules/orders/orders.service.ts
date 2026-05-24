import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryMovementType,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  OrderResponseDto,
} from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { generateOrderNumber } from './helpers/order-number.helper';
import {
  OrderWithRelations,
  OrdersRepository,
} from './repositories/orders.repository';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly repository: OrdersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderResponseDto> {
    if (dto.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un producto');
    }

    const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        memberPrice: true,
        active: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o más productos no existen');
    }

    const productById = new Map(products.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    const items = dto.items.map((item) => {
      const product = productById.get(item.productId)!;
      if (!product.active) {
        throw new BadRequestException(
          `El producto ${product.name} no está activo`,
        );
      }

      const unitPrice =
        item.unitPrice !== undefined
          ? new Prisma.Decimal(item.unitPrice)
          : product.price;
      const lineSubtotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(lineSubtotal);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal: lineSubtotal,
      };
    });

    const discount = new Prisma.Decimal(dto.discount ?? 0);
    if (discount.greaterThan(subtotal)) {
      throw new BadRequestException(
        'El descuento no puede ser mayor que el subtotal',
      );
    }
    const total = subtotal.sub(discount);

    const number = await this.allocateOrderNumber();

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          number,
          userId: dto.userId,
          branchId: dto.branchId,
          subtotal,
          discount,
          total,
          paymentMethod: dto.paymentMethod,
          status: OrderStatus.PENDING,
          notes: dto.notes,
          items: {
            create: items,
          },
        },
        include: this.repository.include,
      });

      return order;
    });

    this.logger.log(`Order created ${created.id} (${created.number})`);
    return this.toResponse(created);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    actorUserId?: string,
  ): Promise<OrderResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (existing.status === dto.status) {
      return this.toResponse(existing);
    }

    const wasPaid = existing.status === OrderStatus.PAID;
    const willBePaid = dto.status === OrderStatus.PAID;

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id },
        data: { status: dto.status },
        include: this.repository.include,
      });

      // Every sale must affect inventory: when an order transitions
      // into PAID with a branch attached, decrement stock and log
      // a SALE movement for each item.
      if (!wasPaid && willBePaid && order.branchId) {
        for (const item of order.items) {
          const inv = await tx.branchInventory.findUnique({
            where: {
              branchId_productId: {
                branchId: order.branchId,
                productId: item.productId,
              },
            },
          });

          const currentStock = inv?.stock ?? 0;
          const nextStock = currentStock - item.quantity;
          if (nextStock < 0) {
            throw new BadRequestException(
              `Stock insuficiente para ${item.product.name} en la sucursal`,
            );
          }

          await tx.branchInventory.upsert({
            where: {
              branchId_productId: {
                branchId: order.branchId,
                productId: item.productId,
              },
            },
            update: { stock: nextStock },
            create: {
              branchId: order.branchId,
              productId: item.productId,
              stock: nextStock,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              branchId: order.branchId,
              productId: item.productId,
              quantity: -item.quantity,
              type: InventoryMovementType.SALE,
              reason: `Pedido ${order.number}`,
              createdByUserId: actorUserId,
            },
          });
        }
      }

      return order;
    });

    this.logger.log(`Order ${updated.id} status -> ${updated.status}`);
    return this.toResponse(updated);
  }

  async findById(id: string): Promise<OrderResponseDto> {
    const order = await this.repository.findById(id);
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return this.toResponse(order);
  }

  async findMany(query: OrderQueryDto): Promise<Paginated<OrderResponseDto>> {
    const where: Prisma.OrderWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
    if (query.branchId) where.branchId = query.branchId;
    if (query.userId) where.userId = query.userId;

    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        {
          user: {
            email: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const { items, total } = await this.repository.findMany({
      where,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((o) => this.toResponse(o)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  private async allocateOrderNumber(): Promise<string> {
    let attempts = 0;
    while (attempts < 5) {
      const candidate = generateOrderNumber();
      if (!(await this.repository.numberExists(candidate))) {
        return candidate;
      }
      attempts += 1;
    }
    throw new BadRequestException('No se pudo generar un número de pedido único');
  }

  private decimalToNumber(value: Prisma.Decimal | number | string): number {
    if (value instanceof Prisma.Decimal) return value.toNumber();
    return Number(value);
  }

  private toResponse(order: OrderWithRelations): OrderResponseDto {
    return {
      id: order.id,
      number: order.number,
      customer: order.user
        ? {
            id: order.user.id,
            email: order.user.email,
            fullName: `${order.user.firstName} ${order.user.lastName}`.trim(),
          }
        : null,
      branch: order.branch
        ? { id: order.branch.id, name: order.branch.name }
        : null,
      subtotal: this.decimalToNumber(order.subtotal),
      discount: this.decimalToNumber(order.discount),
      total: this.decimalToNumber(order.total),
      paymentMethod: order.paymentMethod,
      status: order.status,
      notes: order.notes,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        unitPrice: this.decimalToNumber(item.unitPrice),
        subtotal: this.decimalToNumber(item.subtotal),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
