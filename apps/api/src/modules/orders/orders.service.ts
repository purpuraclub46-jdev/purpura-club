import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerDocumentType,
  InventoryMovementType,
  OrderChannel,
  OrderStatus,
  Prisma,
  ReceiptSeriesType,
  SunatStatus,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  computeProductPricing,
  isProductMemberEligible,
} from '../../common/utils/pricing.util';
import { validateDocument } from '../fiscal/document-validators';
import { FiscalConfigService } from '../fiscal/fiscal-config.service';
import {
  computeOrderBreakdown,
  formatReceiptNumber,
  lineBreakdownGross,
} from '../fiscal/fiscal.util';
import { MembershipsService } from '../memberships/memberships.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { CreateOrderDto, OrderCustomerFiscalDto } from './dto/create-order.dto';
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
import { assertValidOrderStatusTransition } from './state-machine';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly repository: OrdersRepository,
    private readonly prisma: PrismaService,
    private readonly memberships: MembershipsService,
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
        // F2.7-A G8 — pricing engine necesita el grupo de categoría para
        // decidir si aplica el bonus 10 % de socio (Joyería / Perfumes).
        categories: {
          select: { category: { select: { group: true } } },
        },
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
        {
          isMember,
          memberDiscountEligible: isProductMemberEligible(product.categories),
        },
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
          // ── Shipping snapshot (F2.6-A) ──
          // Copia denormalizada de la dirección de envío al momento de
          // crear el pedido. Si dto.shipping no viene (POS, legacy), todos
          // los campos quedan NULL.
          shippingAddressId: dto.shipping?.addressId ?? null,
          shippingRecipientName: dto.shipping?.recipientName ?? null,
          shippingRecipientPhone: dto.shipping?.recipientPhone ?? null,
          shippingStreet: dto.shipping?.street ?? null,
          shippingNumber: dto.shipping?.number ?? null,
          shippingApartment: dto.shipping?.apartment ?? null,
          shippingDistrict: dto.shipping?.district ?? null,
          shippingProvince: dto.shipping?.province ?? null,
          shippingRegion: dto.shipping?.region ?? null,
          shippingCountryCode: dto.shipping
            ? (dto.shipping.countryCode ?? 'PE').toUpperCase()
            : null,
          shippingReference: dto.shipping?.reference ?? null,
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
        ? (customer?.ruc ?? null)
        : (customer?.dni ?? null));
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
      const rucError = validateDocument(
        CustomerDocumentType.RUC,
        documentNumber,
      );
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

    // FASE 2 / F2.4 — Whitelist de transiciones permitidas (state-machine.ts).
    // Lanza ConflictException (409) si la transición no está permitida.
    // viaManualUpdate=true bloquea → REFUNDED (debe ir por nota de crédito).
    assertValidOrderStatusTransition(existing.status, dto.status, {
      viaManualUpdate: true,
    });

    const wasPaid = existing.status === OrderStatus.PAID;
    const willBePaid = dto.status === OrderStatus.PAID;

    // Nota: ejecutamos secuencialmente (sin `$transaction`) porque Supabase
    // está detrás de pgbouncer en modo transaction. Sesiones largas con
    // múltiples awaits sobre el pooler pueden hacer perder la transacción
    // (error P2028). Cada paso es idempotente o recuperable manualmente:
    // si la app cae mid-flow, un admin puede reconciliar con el log.
    //
    // F2.8-A / Capa 1 — CAS atómico sobre la transición de status. Sin esto,
    // dos PATCH concurrentes leen `existing.status=PENDING`, ambos sobreescriben
    // a PAID y ambos disparan el Membership Engine en setImmediate → side
    // effects duplicados (stock decrement doble, tickets duplicados, etc.).
    //
    // Estrategia: el WHERE incluye `status: existing.status`, así que solo el
    // primer caller efectúa el cambio. Los demás reciben `count: 0` y
    // retornan el snapshot actual sin disparar el engine. La invariante de
    // dominio ("una sola transición canónica") se vuelve el lock.
    const claim = await this.prisma.order.updateMany({
      where: { id, status: existing.status },
      data: { status: dto.status },
    });
    if (claim.count === 0) {
      // Otro request ya transicionó esta orden. Retornamos el estado actual
      // sin tocar stock ni engine — quien ganó la carrera ya se encargará.
      const current = await this.repository.findById(id);
      if (!current) throw new NotFoundException('Pedido no encontrado');
      this.logger.log(
        `Order ${id} status transition CAS lost (requested ${dto.status}, current ${current.status})`,
      );
      return this.toResponse(current);
    }

    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
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

    // F2.7-A — Punto de entrada UNIFICADO al Membership Engine. Fire-and-forget
    // en el siguiente tick para que la respuesta HTTP del pedido salga rápido
    // y el motor corra fuera del ciclo de conexión del request.
    if (!wasPaid && willBePaid && updated.userId) {
      const orderId = updated.id;
      const orderNumber = updated.number;
      const userId = updated.userId;
      const customerId = updated.customerId;
      const total = updated.total;
      // F2.7-C / R6 — capturamos createdAt para que el guard anti late-linkage
      // pueda comparar con `Referral.createdAt`.
      const orderCreatedAt = updated.createdAt;
      setImmediate(() => {
        void this.memberships
          .applyPaidPurchase({
            userId,
            customerId,
            orderId,
            orderNumber,
            totalAmount: total,
            paidAt: new Date(),
            channel: OrderChannel.ECOMMERCE,
            orderCreatedAt,
          })
          .catch((error) =>
            this.logger.error(
              `Membership engine failed for order ${orderNumber}: ${String(error)}`,
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
   *
   * FASE 1 / D4 — Historial unificado Ecommerce + POS.
   *
   * Una orden pertenece al cliente autenticado si CUALQUIERA de estos
   * dos vínculos sostiene la relación:
   *
   *   (1) `Order.userId == JWT.id` — flujo ecommerce o POS post-link.
   *
   *   (2) `Order.customer.userId == JWT.id` — flujo POS legacy donde el
   *       walk-in compró antes de tener cuenta, y luego linkeó. La orden
   *       conserva `userId=null` históricamente pero `customerId` apunta
   *       al Customer ahora linkeado al User.
   *
   * Seguridad — por qué este filtro NO leak:
   *
   *   - `Customer.userId @unique` (schema.prisma:830) garantiza que un
   *     Customer pertenece a UN SOLO User. No es posible que dos Users
   *     "compartan" un Customer.
   *
   *   - El filtro usa Prisma nested filter `customer: { userId }` que
   *     traduce a JOIN seguro (`orders.customer_id IN (SELECT id FROM
   *     customers WHERE user_id = $1)`). NUNCA `customerId IN (lista)`
   *     que sería manipulable.
   *
   *   - Si un Customer tiene `userId=null` (walk-in puro sin cuenta),
   *     la cláusula `customer.userId = JWT.id` lo excluye por construcción.
   *
   *   - Si por anomalía histórica `Customer.userId` apunta a un User
   *     equivocado, el filtro respeta esa relación — la corrección de
   *     anomalías es responsabilidad del backfill (D6) + endpoint admin
   *     dedupe-candidates (D5), NO de esta query.
   *
   * Performance esperada:
   *
   *   - Índices utilizados (schema.prisma:668-669):
   *       @@index([userId, status])         → rama OR(1)
   *       @@index([customerId, status])     → rama OR(2) via JOIN
   *   - Postgres ejecuta como bitmap OR scan, sin sequential scan.
   *   - Estimado < 100ms p95 con < 1k órdenes por user, validación real
   *     en staging (D7) con EXPLAIN ANALYZE.
   */
  async findMine(
    userId: string,
    query: OrderQueryDto,
  ): Promise<Paginated<OrderResponseDto>> {
    const where: Prisma.OrderWhereInput = {
      OR: [{ userId }, { customer: { userId } }],
    };
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

  /**
   * Detalle de una orden propia del cliente autenticado (storefront).
   *
   * FASE 1 / D4 — Acepta UUID (Order.id) o número humano (Order.number,
   * p.ej. "ORD-20260101-0001"). El ownership check se hace dentro del
   * mismo WHERE — no hay window donde el cliente pueda leer una orden
   * ajena.
   *
   * Anti-enumeration (consistente con D3): si la orden NO pertenece al
   * cliente, devolvemos `NotFoundException` con el mismo mensaje que si
   * la orden no existiera. El cliente NO puede distinguir entre "ID que
   * no existe" e "ID que existe pero es ajeno". Cero leak de existencia.
   */
  async findOneForCustomer(
    idOrNumber: string,
    userId: string,
  ): Promise<OrderResponseDto> {
    // UUID v4 detection — si no matchea, asumimos formato número humano.
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrNumber,
      );

    const order = await this.prisma.order.findFirst({
      where: {
        AND: [
          isUuid ? { id: idOrNumber } : { number: idOrNumber },
          // Ownership integrado en el mismo WHERE — atomic check.
          // Mismo razonamiento de seguridad que findMine().
          { OR: [{ userId }, { customer: { userId } }] },
        ],
      },
      include: this.repository.include,
    });

    if (!order) {
      // Mensaje genérico — no distinguimos "no existe" de "no es tuya".
      // Anti-enumeration consistent con D3.
      throw new NotFoundException('Pedido no encontrado');
    }

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

  private async allocateOrderNumber(): Promise<string> {
    let attempts = 0;
    while (attempts < 5) {
      const candidate = generateOrderNumber();
      if (!(await this.repository.numberExists(candidate))) {
        return candidate;
      }
      attempts += 1;
    }
    throw new BadRequestException(
      'No se pudo generar un número de pedido único',
    );
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
      order.receiptType && order.receiptSeries && order.receiptNumber !== null
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

    const shipping =
      order.shippingRecipientName &&
      order.shippingStreet &&
      order.shippingNumber &&
      order.shippingDistrict &&
      order.shippingProvince &&
      order.shippingRegion
        ? {
            addressId: order.shippingAddressId,
            recipientName: order.shippingRecipientName,
            recipientPhone: order.shippingRecipientPhone ?? '',
            street: order.shippingStreet,
            number: order.shippingNumber,
            apartment: order.shippingApartment,
            district: order.shippingDistrict,
            province: order.shippingProvince,
            region: order.shippingRegion,
            countryCode: order.shippingCountryCode ?? 'PE',
            reference: order.shippingReference,
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
      shipping,
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
