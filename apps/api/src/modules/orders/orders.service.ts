import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EntryStatus,
  EntryType,
  InventoryMovementType,
  MembershipBenefitType,
  OrderStatus,
  Prisma,
  RaffleStatus,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { computeProductPricing } from '../../common/utils/pricing.util';
import { MembershipsService } from '../memberships/memberships.service';
import { computePurchaseEntries } from '../memberships/membership.helpers';
import { ReferralsService } from '../referrals/referrals.service';
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
    private readonly memberships: MembershipsService,
    private readonly referrals: ReferralsService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderResponseDto> {
    if (dto.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un producto');
    }

    if (dto.inventoryLocationId) {
      const loc = await this.prisma.inventoryLocation.findUnique({
        where: { id: dto.inventoryLocationId },
        select: { id: true, active: true },
      });
      if (!loc) {
        throw new NotFoundException('Ubicación de inventario no encontrada');
      }
      if (!loc.active) {
        throw new BadRequestException(
          'La ubicación de inventario no está activa',
        );
      }
    }

    const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        active: true,
        discountPercentage: true,
        discountActive: true,
        discountStartsAt: true,
        discountEndsAt: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o más productos no existen');
    }

    // El precio del miembro solo aplica si el comprador es miembro Y la oferta
    // está vigente. Si el pedido es anónimo (sin userId), nunca es miembro.
    const isMember = dto.userId
      ? await this.memberships.isActive(dto.userId)
      : false;

    const productById = new Map(products.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    const items = dto.items.map((item) => {
      const product = productById.get(item.productId)!;
      if (!product.active) {
        throw new BadRequestException(
          `El producto ${product.name} no está activo`,
        );
      }

      const pricing = computeProductPricing(
        {
          price: product.price,
          discountPercentage: product.discountPercentage,
          discountActive: product.discountActive,
          discountStartsAt: product.discountStartsAt,
          discountEndsAt: product.discountEndsAt,
        },
        { isMember },
      );

      const unitPrice =
        item.unitPrice !== undefined
          ? new Prisma.Decimal(item.unitPrice)
          : new Prisma.Decimal(pricing.finalPrice);
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
          inventoryLocationId: dto.inventoryLocationId,
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

    // Nota: ejecutamos secuencialmente (sin `$transaction`) porque Supabase
    // está detrás de pgbouncer en modo transaction. Sesiones largas con
    // múltiples awaits sobre el pooler pueden hacer perder la transacción
    // (error P2028). Cada paso es idempotente o recuperable manualmente:
    // si la app cae mid-flow, un admin puede reconciliar con el log.
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: this.repository.include,
    });

    if (!wasPaid && willBePaid && order.inventoryLocationId) {
      const locationId = order.inventoryLocationId;
      for (const item of order.items) {
        const inv = await this.prisma.inventoryStock.findUnique({
          where: {
            inventoryLocationId_productId: {
              inventoryLocationId: locationId,
              productId: item.productId,
            },
          },
        });

        const currentStock = inv?.stock ?? 0;
        const nextStock = currentStock - item.quantity;
        if (nextStock < 0) {
          throw new BadRequestException(
            `Stock insuficiente para ${item.product.name} en la ubicación`,
          );
        }

        await this.prisma.inventoryStock.upsert({
          where: {
            inventoryLocationId_productId: {
              inventoryLocationId: locationId,
              productId: item.productId,
            },
          },
          update: { stock: nextStock },
          create: {
            inventoryLocationId: locationId,
            productId: item.productId,
            stock: nextStock,
          },
        });

        await this.prisma.inventoryMovement.create({
          data: {
            inventoryLocationId: locationId,
            productId: item.productId,
            quantity: -item.quantity,
            type: InventoryMovementType.SALE,
            reason: `Pedido ${order.number}`,
            createdByUserId: actorUserId,
          },
        });
      }
    }

    const updated = order;

    // Membership Engine: lo disparamos fire-and-forget en el siguiente tick
    // para garantizar que la respuesta HTTP del pedido salga rápido y para
    // que el motor corra fuera del ciclo de la conexión del request.
    // Cada paso es idempotente y resistente a fallos parciales (ver
    // `processMembershipBenefits`).
    if (!wasPaid && willBePaid && updated.userId) {
      setImmediate(() => {
        void this.processMembershipBenefits({
          orderId: updated.id,
          orderNumber: updated.number,
          userId: updated.userId as string,
          totalAmount: updated.total,
          paidAt: new Date(),
        }).catch((error) =>
          this.logger.error(
            `Membership engine failed for order ${updated.number}: ${String(error)}`,
          ),
        );
      });
    }

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
    if (query.inventoryLocationId) {
      where.inventoryLocationId = query.inventoryLocationId;
    }
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

  /**
   * Núcleo del Membership Engine cuando un pedido cambia a PAID.
   *
   * Se ejecuta DESPUÉS del commit de la transacción de inventario para
   * evitar transacciones largas en pgbouncer (Supabase). Cada paso es
   * idempotente:
   *   - membresía: upsert por userId
   *   - participaciones: el "lock" lo da raffle.updateMany con WHERE
   *     soldTickets=N para evitar dobles
   *   - referral: updateMany WHERE rewarded=false atómico
   */
  private async processMembershipBenefits(args: {
    orderId: string;
    orderNumber: string;
    userId: string;
    totalAmount: Prisma.Decimal | number;
    paidAt: Date;
  }): Promise<void> {
    const { orderId, orderNumber, userId, paidAt } = args;
    const totalNumber =
      args.totalAmount instanceof Prisma.Decimal
        ? args.totalAmount.toNumber()
        : Number(args.totalAmount);

    const { membership, renewed } = await this.memberships.activateOrRenew({
      userId,
      purchaseAmount: totalNumber,
      purchaseAt: paidAt,
    });

    if (!membership) {
      // Compra por debajo del mínimo: no hay beneficios.
      return;
    }

    await this.memberships.logBenefit({
      userId,
      orderId,
      type: MembershipBenefitType.DISCOUNT,
      description: renewed
        ? `Membresía renovada por compra ${orderNumber}`
        : `Membresía activada por compra ${orderNumber}`,
      amount: totalNumber,
    });

    // Participaciones automáticas por cada S/25 consumidos.
    const entriesQty = computePurchaseEntries(totalNumber);
    if (entriesQty > 0) {
      const granted = await this.grantPurchaseEntries(
        userId,
        entriesQty,
        orderNumber,
      );
      if (granted > 0) {
        await this.memberships.logBenefit({
          userId,
          orderId,
          type: MembershipBenefitType.RAFFLE_ENTRY,
          description: `${granted} participación(es) automática(s) por compra ${orderNumber}`,
          amount: granted,
        });
      }
    }

    // Recompensa al referente (BONUS entry) cuando el referido hace su
    // primera compra elegible.
    const claim = await this.referrals.claimRewardForFirstPurchase({
      referredUserId: userId,
    });
    if (claim) {
      const grantedBonus = await this.grantPurchaseEntries(
        claim.referrerUserId,
        1,
        `referido ${orderNumber}`,
        EntryType.BONUS,
      );
      if (grantedBonus > 0) {
        await this.memberships.logBenefit({
          userId: claim.referrerUserId,
          orderId,
          type: MembershipBenefitType.REFERRAL_BONUS,
          description: `Bono por referido (pedido ${orderNumber})`,
          amount: grantedBonus,
        });
      }
    }
  }

  /**
   * Concede `quantity` participaciones al `userId` sobre el sorteo PUBLISHED
   * activo más próximo a finalizar. Usa `raffle.updateMany` con CAS sobre
   * `soldTickets` para evitar dobles en concurrencia.
   */
  private async grantPurchaseEntries(
    userId: string,
    quantity: number,
    reference: string,
    entryType: EntryType = EntryType.PURCHASE_REWARD,
  ): Promise<number> {
    if (quantity <= 0) return 0;

    const now = new Date();
    const raffle = await this.prisma.raffle.findFirst({
      where: {
        status: RaffleStatus.PUBLISHED,
        endDate: { gt: now },
      },
      orderBy: { endDate: 'asc' },
    });
    if (!raffle) {
      this.logger.log(
        `No active raffle — purchase entries for ${userId} skipped (${reference})`,
      );
      return 0;
    }

    const seatsLeft = raffle.totalTickets - raffle.soldTickets;
    const toGrant = Math.min(quantity, seatsLeft);
    if (toGrant <= 0) return 0;

    const reservation = await this.prisma.raffle.updateMany({
      where: {
        id: raffle.id,
        status: RaffleStatus.PUBLISHED,
        soldTickets: raffle.soldTickets,
        totalTickets: { gte: raffle.soldTickets + toGrant },
      },
      data: { soldTickets: { increment: toGrant } },
    });
    if (reservation.count === 0) {
      return 0;
    }

    for (let i = 0; i < toGrant; i += 1) {
      const ticketNumber = raffle.soldTickets + i + 1;
      await this.prisma.raffleEntry.create({
        data: {
          userId,
          raffleId: raffle.id,
          ticketNumber,
          type: entryType,
          status: EntryStatus.PAID,
          paymentReference: `auto-${reference}`,
        },
      });
    }

    return toGrant;
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
      location: order.location
        ? {
            id: order.location.id,
            name: order.location.name,
            type: order.location.type,
          }
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
