import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerDocumentType,
  EntryStatus,
  EntryType,
  InventoryMovementType,
  MembershipBenefitType,
  OrderStatus,
  Prisma,
  RaffleStatus,
  ReceiptSeriesType,
  SunatStatus,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { computeProductPricing } from '../../common/utils/pricing.util';
import { validateDocument } from '../fiscal/document-validators';
import { FiscalConfigService } from '../fiscal/fiscal-config.service';
import {
  computeOrderBreakdown,
  formatReceiptNumber,
  lineBreakdownGross,
} from '../fiscal/fiscal.util';
import { MembershipsService } from '../memberships/memberships.service';
import { computePurchaseEntries } from '../memberships/membership.helpers';
import { ReceiptsService } from '../receipts/receipts.service';
import { ReferralsService } from '../referrals/referrals.service';
import {
  CreateOrderDto,
  OrderCustomerFiscalDto,
} from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  OrderFiscalSnapshotDto,
  OrderFiscalTotalsDto,
  OrderReceiptDto,
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
    private readonly receipts: ReceiptsService,
    private readonly fiscalConfig: FiscalConfigService,
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

    // Carga el customer fiscal si está enlazado (opcional).
    const customer = dto.customerId
      ? await this.prisma.customer.findUnique({
          where: { id: dto.customerId },
          select: {
            id: true,
            userId: true,
            fullName: true,
            dni: true,
            ruc: true,
            documentType: true,
            legalName: true,
            fiscalAddress: true,
            email: true,
          },
        })
      : null;
    if (dto.customerId && !customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // El precio del miembro solo aplica si el comprador es miembro Y la oferta
    // está vigente. Si el pedido es anónimo (sin userId), nunca es miembro.
    const effectiveUserId = dto.userId ?? customer?.userId ?? null;
    const isMember = effectiveUserId
      ? await this.memberships.isActive(effectiveUserId)
      : false;

    const igvRate = this.fiscalConfig.effectiveIgvRate();
    const pricesIncludeIgv = this.fiscalConfig.pricesIncludeIgv;

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

      const unitPriceNum =
        item.unitPrice !== undefined ? item.unitPrice : pricing.finalPrice;
      const breakdown = lineBreakdownGross({
        unitPrice: unitPriceNum,
        quantity: item.quantity,
        igvRate,
      });
      const lineSubtotal = new Prisma.Decimal(breakdown.subtotal);
      subtotal = subtotal.add(lineSubtotal);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(breakdown.unitPrice),
        subtotal: lineSubtotal,
        igvRate: new Prisma.Decimal(breakdown.igvRate),
        unitPriceUntaxed: new Prisma.Decimal(breakdown.unitPriceUntaxed),
        subtotalUntaxed: new Prisma.Decimal(breakdown.subtotalUntaxed),
        igvAmount: new Prisma.Decimal(breakdown.igvAmount),
      };
    });

    const discount = new Prisma.Decimal(dto.discount ?? 0);
    if (discount.greaterThan(subtotal)) {
      throw new BadRequestException(
        'El descuento no puede ser mayor que el subtotal',
      );
    }
    const total = subtotal.sub(discount);

    // Desglose IGV sobre el total final.
    const fiscalTotals = computeOrderBreakdown({
      grossTotal: total.toNumber(),
      igvRate,
    });

    // Snapshot fiscal del cliente y validación según receiptType.
    const receiptType = dto.receiptType ?? ReceiptSeriesType.BOLETA;
    const fiscalSnapshot = this.resolveFiscalSnapshot({
      receiptType,
      dtoFiscal: dto.customerFiscal,
      customer,
    });

    const number = await this.allocateOrderNumber();

    // Emisión opcional inmediata del comprobante (cuando el flujo lo requiera).
    // Por defecto las órdenes ecommerce se emiten al cambiar a PAID; este flag
    // permite forzar emisión en creación (e.g., pagos sincrónicos).
    let receiptData: {
      receiptType: ReceiptSeriesType;
      receiptSeries: string;
      receiptNumber: number;
      receiptIssuedAt: Date;
    } | null = null;
    if (dto.issueReceipt) {
      try {
        const issued = await this.receipts.issue({
          inventoryLocationId: dto.inventoryLocationId ?? null,
          type: receiptType,
        });
        receiptData = {
          receiptType: issued.type,
          receiptSeries: issued.series,
          receiptNumber: issued.number,
          receiptIssuedAt: new Date(),
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Orden ${number}: no se pudo emitir ${receiptType}: ${msg}`,
        );
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          number,
          userId: effectiveUserId,
          customerId: customer?.id ?? null,
          inventoryLocationId: dto.inventoryLocationId,
          subtotal,
          discount,
          total,
          paymentMethod: dto.paymentMethod,
          status: OrderStatus.PENDING,
          notes: dto.notes,
          // ── Fiscal ──
          pricesIncludeIgv,
          igvRate: new Prisma.Decimal(igvRate),
          subtotalUntaxed: new Prisma.Decimal(fiscalTotals.subtotalUntaxed),
          igvAmount: new Prisma.Decimal(fiscalTotals.igvAmount),
          customerDocumentType: fiscalSnapshot.documentType,
          customerDocumentNumber: fiscalSnapshot.documentNumber,
          customerLegalName: fiscalSnapshot.legalName,
          customerFiscalAddress: fiscalSnapshot.fiscalAddress,
          customerEmail: fiscalSnapshot.email,
          receiptType: receiptData?.receiptType,
          receiptSeries: receiptData?.receiptSeries,
          receiptNumber: receiptData?.receiptNumber,
          receiptIssuedAt: receiptData?.receiptIssuedAt,
          sunatStatus: SunatStatus.PENDING,
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

  private resolveFiscalSnapshot(opts: {
    receiptType: ReceiptSeriesType;
    dtoFiscal: OrderCustomerFiscalDto | undefined;
    customer: {
      fullName: string;
      dni: string | null;
      ruc: string | null;
      documentType: CustomerDocumentType;
      legalName: string | null;
      fiscalAddress: string | null;
      email: string | null;
    } | null;
  }): {
    documentType: CustomerDocumentType | null;
    documentNumber: string | null;
    legalName: string | null;
    fiscalAddress: string | null;
    email: string | null;
  } {
    const { receiptType, dtoFiscal, customer } = opts;

    const documentType =
      dtoFiscal?.documentType ?? customer?.documentType ?? null;
    const documentNumber =
      dtoFiscal?.documentNumber ??
      (documentType === CustomerDocumentType.RUC
        ? customer?.ruc ?? null
        : customer?.dni ?? null);
    const legalName =
      dtoFiscal?.legalName ?? customer?.legalName ?? customer?.fullName ?? null;
    const fiscalAddress =
      dtoFiscal?.fiscalAddress ?? customer?.fiscalAddress ?? null;
    const email = dtoFiscal?.email ?? customer?.email ?? null;

    if (receiptType === ReceiptSeriesType.FACTURA) {
      if (documentType !== CustomerDocumentType.RUC) {
        throw new BadRequestException(
          'Para emitir FACTURA, el cliente debe tener documentType=RUC',
        );
      }
      if (!documentNumber) {
        throw new BadRequestException(
          'Para emitir FACTURA, el RUC del cliente es obligatorio',
        );
      }
      const rucError = validateDocument(CustomerDocumentType.RUC, documentNumber);
      if (rucError) throw new BadRequestException(rucError);
      if (!legalName) {
        throw new BadRequestException(
          'Para emitir FACTURA, la razón social del cliente es obligatoria',
        );
      }
      if (!fiscalAddress) {
        throw new BadRequestException(
          'Para emitir FACTURA, la dirección fiscal del cliente es obligatoria',
        );
      }
    } else if (documentNumber && documentType) {
      const err = validateDocument(documentType, documentNumber);
      if (err) throw new BadRequestException(err);
    }

    return { documentType, documentNumber, legalName, fiscalAddress, email };
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

  /**
   * Lista los pedidos del cliente autenticado (storefront "Mi cuenta").
   * Filtra estrictamente por `userId` del JWT — un cliente JAMÁS puede ver
   * pedidos ajenos aunque manipule query params.
   */
  async findMine(
    userId: string,
    query: OrderQueryDto,
  ): Promise<Paginated<OrderResponseDto>> {
    const where: Prisma.OrderWhereInput = { userId };
    if (query.status) where.status = query.status;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;

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
    const fiscal: OrderFiscalTotalsDto = {
      igvRate: this.decimalToNumber(order.igvRate),
      subtotalUntaxed: this.decimalToNumber(order.subtotalUntaxed),
      igvAmount: this.decimalToNumber(order.igvAmount),
      total: this.decimalToNumber(order.total),
      pricesIncludeIgv: order.pricesIncludeIgv,
    };

    const fiscalSnapshot: OrderFiscalSnapshotDto = {
      documentType: order.customerDocumentType,
      documentNumber: order.customerDocumentNumber,
      legalName: order.customerLegalName,
      fiscalAddress: order.customerFiscalAddress,
      email: order.customerEmail,
    };

    const receipt: OrderReceiptDto | null =
      order.receiptType &&
      order.receiptSeries &&
      order.receiptNumber !== null
        ? {
            type: order.receiptType,
            series: order.receiptSeries,
            number: order.receiptNumber,
            formatted:
              formatReceiptNumber(order.receiptSeries, order.receiptNumber) ??
              '',
            issuedAt: (order.receiptIssuedAt ?? order.createdAt).toISOString(),
            sunatStatus: order.sunatStatus,
          }
        : null;

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
      fiscal,
      fiscalSnapshot,
      receipt,
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
        igvRate: this.decimalToNumber(item.igvRate),
        unitPriceUntaxed: this.decimalToNumber(item.unitPriceUntaxed),
        subtotalUntaxed: this.decimalToNumber(item.subtotalUntaxed),
        igvAmount: this.decimalToNumber(item.igvAmount),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
