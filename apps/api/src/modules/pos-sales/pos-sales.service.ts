import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CustomerDocumentType,
  InventoryLocationType,
  InventoryMovementType,
  OrderChannel,
  OrderStatus,
  POSCashSessionStatus,
  Prisma,
  ReceiptSeriesType,
  SunatStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  computeProductPricing,
  isProductMemberEligible,
} from '../../common/utils/pricing.util';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { validateDocument } from '../fiscal/document-validators';
import { FiscalConfigService } from '../fiscal/fiscal-config.service';
import {
  computeOrderBreakdown,
  formatReceiptNumber,
  lineBreakdownGross,
} from '../fiscal/fiscal.util';
import { MembershipsService } from '../memberships/memberships.service';
import { generateOrderNumber } from '../orders/helpers/order-number.helper';
import { PosCashService } from '../pos-cash/pos-cash.service';
import { ReceiptsService } from '../receipts/receipts.service';
import {
  CreatePosSaleDto,
  PosSaleCustomerFiscalDto,
} from './dto/create-pos-sale.dto';
import {
  PosSaleFiscalSnapshotDto,
  PosSaleFiscalTotalsDto,
  PosSaleItemResponseDto,
  PosSalePaymentResponseDto,
  PosSaleReceiptDto,
  PosSaleResponseDto,
} from './dto/pos-sale-response.dto';

const SUPER_ADMIN_SLUG = 'super_admin';
const CENT_EPSILON = 0.005;

const SALE_INCLUDE = Prisma.validator<Prisma.OrderInclude>()({
  items: {
    include: { product: { select: { id: true, name: true } } },
  },
  payments: true,
  customer: {
    select: {
      id: true,
      fullName: true,
      dni: true,
      ruc: true,
      documentType: true,
      legalName: true,
      fiscalAddress: true,
      email: true,
      isMember: true,
      userId: true,
    },
  },
});

type SaleAggregate = Prisma.OrderGetPayload<{ include: typeof SALE_INCLUDE }>;

const round2 = (v: number): number => Math.round(v * 100) / 100;

@Injectable()
export class PosSalesService {
  private readonly logger = new Logger(PosSalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posCash: PosCashService,
    private readonly receipts: ReceiptsService,
    private readonly fiscalConfig: FiscalConfigService,
    private readonly memberships: MembershipsService,
  ) {}

  /**
   * Crea una venta POS:
   *  1) Valida sesión OPEN + permisos por sucursal.
   *  2) Carga productos + stock de la sucursal.
   *  3) Calcula precios con el pricing engine y aplica descuento de miembro
   *     automáticamente si el cliente CRM enlaza con un usuario con membresía.
   *  4) Verifica stock suficiente; si no, rechaza.
   *  5) Verifica que la suma de payments == total (con tolerancia de centavos).
   *  6) Decrementa stock + genera InventoryMovement por cada item.
   *  7) Crea Order (channel=POS) + OrderItem[] + OrderPayment[].
   *  8) Emite comprobante (BOLETA) con numeración atómica de la serie de la sucursal.
   *  9) Registra movimiento SALE en la caja.
   * 10) Si hay cliente CRM con userId: activa/renueva membresía + genera
   *     RaffleEntries automáticas + actualiza customer.isMember.
   *
   * Nota: NO se envuelve todo en una `$transaction` por las limitaciones
   * de pgbouncer en Supabase (P2028 en operaciones largas). En su lugar usamos
   * CAS para la numeración de comprobantes y operaciones idempotentes. En un
   * Postgres directo se puede envolver sin riesgo.
   */
  async createSale(
    dto: CreatePosSaleDto,
    actor: AuthenticatedUser,
  ): Promise<PosSaleResponseDto> {
    if (dto.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un producto');
    }
    if (dto.payments.length === 0) {
      throw new BadRequestException('Debe registrar al menos un pago');
    }

    // 1) Sesión OPEN + scoping
    const session = await this.prisma.pOSCashSession.findUnique({
      where: { id: dto.cashSessionId },
      include: {
        cashRegister: {
          select: {
            id: true,
            inventoryLocationId: true,
            location: {
              select: { id: true, name: true, active: true, type: true },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Sesión de caja no encontrada');
    if (session.status !== POSCashSessionStatus.OPEN) {
      throw new ConflictException('La sesión de caja no está abierta');
    }
    const locationId = session.cashRegister.inventoryLocationId;
    if (!session.cashRegister.location?.active) {
      throw new BadRequestException(
        'La sucursal no está activa para operar el POS',
      );
    }
    // Defense in depth — el POS físico solo opera en SUCURSAL.
    if (session.cashRegister.location.type !== InventoryLocationType.SUCURSAL) {
      throw new BadRequestException(
        'Las ventas POS solo se procesan en sucursales físicas, no en el canal Ecommerce',
      );
    }
    this.assertLocationAccess(locationId, actor);

    // 2) Cargar productos + stock + customer + membership
    const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
    const [products, stocks, customer] = await Promise.all([
      this.prisma.product.findMany({
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
          // aplicar el bonus socio solo en Joyería / Perfumes.
          categories: {
            select: { category: { select: { group: true } } },
          },
        },
      }),
      this.prisma.inventoryStock.findMany({
        where: {
          inventoryLocationId: locationId,
          productId: { in: productIds },
        },
        select: { productId: true, stock: true, reservedStock: true },
      }),
      dto.customerId
        ? this.prisma.customer.findUnique({
            where: { id: dto.customerId },
            select: {
              id: true,
              fullName: true,
              dni: true,
              ruc: true,
              documentType: true,
              legalName: true,
              fiscalAddress: true,
              email: true,
              userId: true,
              primaryLocationId: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (products.length !== productIds.length) {
      const found = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Productos no encontrados: ${missing.join(', ')}`,
      );
    }
    const inactive = products.find((p) => !p.active);
    if (inactive) {
      throw new BadRequestException(
        `El producto "${inactive.name}" no está activo`,
      );
    }
    if (dto.customerId && !customer) {
      throw new BadRequestException('Cliente no encontrado');
    }

    // 3) Determinar membresía — única fuente de verdad: MembershipsService.
    const isMember = customer?.userId
      ? await this.memberships.isActive(customer.userId)
      : false;

    // 4) Stock map + cálculo de líneas con desglose IGV (precios CON IGV)
    const stockMap = new Map(stocks.map((s) => [s.productId, s]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    const igvRate = this.fiscalConfig.effectiveIgvRate();
    const pricesIncludeIgv = this.fiscalConfig.pricesIncludeIgv;

    interface FiscalLine {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      igvRate: number;
      unitPriceUntaxed: number;
      subtotalUntaxed: number;
      igvAmount: number;
    }
    const lines: FiscalLine[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      const pricing = computeProductPricing(product, {
        isMember,
        memberDiscountEligible: isProductMemberEligible(product.categories),
      });
      const stockRow = stockMap.get(item.productId);
      const available = stockRow ? stockRow.stock - stockRow.reservedStock : 0;
      if (available < item.quantity) {
        throw new ConflictException(
          `Stock insuficiente para "${product.name}" — disponibles: ${available}`,
        );
      }
      const unitPrice = pricing.finalPrice;
      const breakdown = lineBreakdownGross({
        unitPrice,
        quantity: item.quantity,
        igvRate,
      });
      lines.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: breakdown.unitPrice,
        subtotal: breakdown.subtotal,
        igvRate: breakdown.igvRate,
        unitPriceUntaxed: breakdown.unitPriceUntaxed,
        subtotalUntaxed: breakdown.subtotalUntaxed,
        igvAmount: breakdown.igvAmount,
      });
    }

    const subtotal = round2(lines.reduce((acc, l) => acc + l.subtotal, 0));
    const manualDiscount = round2(dto.manualDiscount ?? 0);
    if (manualDiscount > subtotal) {
      throw new BadRequestException(
        'El descuento manual no puede ser mayor al subtotal',
      );
    }
    const total = round2(subtotal - manualDiscount);

    // Desglose IGV total — calculado sobre el total final (CON IGV).
    const fiscalTotals = computeOrderBreakdown({
      grossTotal: total,
      igvRate,
    });

    // Validar comprobante y snapshot fiscal del cliente
    const receiptType = dto.receiptType ?? ReceiptSeriesType.BOLETA;
    const fiscalSnapshot = this.resolveFiscalSnapshot({
      receiptType,
      dtoFiscal: dto.customerFiscal,
      customer,
    });

    // 5) Validar suma de pagos == total
    const paid = round2(dto.payments.reduce((acc, p) => acc + p.amount, 0));
    if (Math.abs(paid - total) > CENT_EPSILON) {
      throw new BadRequestException(
        `El pago total (S/${paid.toFixed(2)}) no coincide con el total (S/${total.toFixed(2)})`,
      );
    }

    // 6) Decrementar stock + crear movimientos de inventario (CAS por línea)
    for (const line of lines) {
      const stockRow = stockMap.get(line.productId)!;
      const expected = stockRow.stock;
      const updated = await this.prisma.inventoryStock.updateMany({
        where: {
          inventoryLocationId: locationId,
          productId: line.productId,
          stock: expected,
        },
        data: { stock: expected - line.quantity },
      });
      if (updated.count !== 1) {
        // Otro POS vendió este producto entre el read y el write.
        throw new ConflictException(
          `Conflicto de stock para "${line.productName}" — vuelve a intentar`,
        );
      }
      await this.prisma.inventoryMovement.create({
        data: {
          inventoryLocationId: locationId,
          productId: line.productId,
          quantity: -line.quantity,
          type: InventoryMovementType.SALE,
          reason: 'Venta POS',
          createdByUserId: actor.id,
        },
      });
    }

    // 7) Decidir el método "principal" para Order.paymentMethod (el de mayor monto).
    const primaryMethod = [...dto.payments].sort(
      (a, b) => b.amount - a.amount,
    )[0].method;

    // 8) Emitir comprobante (BOLETA o FACTURA según receiptType)
    let receipt: PosSaleReceiptDto | null = null;
    let receiptData: {
      receiptType: ReceiptSeriesType;
      receiptSeries: string;
      receiptNumber: number;
      receiptIssuedAt: Date;
    } | null = null;
    if (dto.issueReceipt !== false) {
      try {
        const issued = await this.receipts.issue({
          inventoryLocationId: locationId,
          type: receiptType,
        });
        const issuedAt = new Date();
        receiptData = {
          receiptType: issued.type,
          receiptSeries: issued.series,
          receiptNumber: issued.number,
          receiptIssuedAt: issuedAt,
        };
        receipt = {
          type: issued.type,
          series: issued.series,
          number: issued.number,
          formatted: formatReceiptNumber(issued.series, issued.number) ?? '',
          issuedAt: issuedAt.toISOString(),
          sunatStatus: SunatStatus.PENDING,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `No se pudo emitir comprobante (la venta continúa sin ${receiptType}): ${msg}`,
        );
      }
    }

    // 9) Crear orden + items + pagos + snapshot fiscal en nested create
    const orderNumber = generateOrderNumber();
    const order = await this.prisma.order.create({
      data: {
        number: orderNumber,
        channel: OrderChannel.POS,
        status: OrderStatus.PAID,
        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(manualDiscount),
        total: new Prisma.Decimal(total),
        paymentMethod: primaryMethod,
        notes: dto.notes ?? null,
        inventoryLocationId: locationId,
        cashSessionId: session.id,
        userId: customer?.userId ?? null,
        customerId: customer?.id ?? null,
        // ── Fiscal: IGV breakdown ──
        pricesIncludeIgv,
        igvRate: new Prisma.Decimal(igvRate),
        subtotalUntaxed: new Prisma.Decimal(fiscalTotals.subtotalUntaxed),
        igvAmount: new Prisma.Decimal(fiscalTotals.igvAmount),
        // ── Snapshot del cliente fiscal ──
        customerDocumentType: fiscalSnapshot.documentType,
        customerDocumentNumber: fiscalSnapshot.documentNumber,
        customerLegalName: fiscalSnapshot.legalName,
        customerFiscalAddress: fiscalSnapshot.fiscalAddress,
        customerEmail: fiscalSnapshot.email,
        // ── Comprobante emitido ──
        receiptType: receiptData?.receiptType,
        receiptSeries: receiptData?.receiptSeries,
        receiptNumber: receiptData?.receiptNumber,
        receiptIssuedAt: receiptData?.receiptIssuedAt,
        sunatStatus: SunatStatus.PENDING,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: new Prisma.Decimal(l.unitPrice),
            subtotal: new Prisma.Decimal(l.subtotal),
            igvRate: new Prisma.Decimal(l.igvRate),
            unitPriceUntaxed: new Prisma.Decimal(l.unitPriceUntaxed),
            subtotalUntaxed: new Prisma.Decimal(l.subtotalUntaxed),
            igvAmount: new Prisma.Decimal(l.igvAmount),
          })),
        },
        payments: {
          create: dto.payments.map((p) => ({
            method: p.method,
            amount: new Prisma.Decimal(p.amount),
            reference: p.reference ?? null,
          })),
        },
      },
      include: SALE_INCLUDE,
    });

    // 10) Movimiento de caja SALE
    await this.posCash.recordSaleMovement({
      sessionId: session.id,
      orderId: order.id,
      amount: total,
      actor,
    });

    // 11) F2.7-A — Punto único de entrada al Membership Engine. Cubre
    //     activate/renew, sync Customer.isMember, tickets PURCHASE_REWARD,
    //     bono al referente y envío de email de bienvenida. Idempotente y
    //     resistente a fallos parciales — un error aquí no aborta la venta
    //     ni revierte caja/stock.
    let raffleEntriesGenerated = 0;
    const membershipDiscountApplied = isMember;
    if (customer?.userId) {
      try {
        const result = await this.memberships.applyPaidPurchase({
          userId: customer.userId,
          customerId: customer.id,
          orderId: order.id,
          orderNumber: order.number,
          totalAmount: total,
          paidAt: order.createdAt,
          channel: OrderChannel.POS,
          // F2.7-C / R6 — paidAt y createdAt coinciden en POS (venta instantánea).
          orderCreatedAt: order.createdAt,
        });
        raffleEntriesGenerated = result.ticketsGranted;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Post-venta (membresía/raffle) falló para orden ${order.id}: ${msg}`,
        );
      }
    }

    this.logger.log(
      `Venta POS ${order.number} en ${locationId} por S/${total.toFixed(2)} (cajero ${actor.id})`,
    );

    return this.toResponse(
      order,
      receipt,
      raffleEntriesGenerated,
      membershipDiscountApplied,
    );
  }

  // ─── Internals ─────────────────────────────────────────────────────────

  /**
   * Resuelve el snapshot fiscal del cliente para esta venta combinando:
   *  - `dto.customerFiscal` (datos declarados por el cajero en este checkout)
   *  - datos del Customer del CRM (si hay customerId)
   *
   * Reglas:
   *  - Para FACTURA: requiere documentType=RUC, documentNumber válido (módulo
   *    11), legalName y fiscalAddress no vacíos. Falla con BadRequest si no.
   *  - Para BOLETA: snapshot opcional. Si hay documentNumber, valida formato
   *    según documentType. Si no hay datos, queda como "Consumidor Final".
   */
  private resolveFiscalSnapshot(opts: {
    receiptType: ReceiptSeriesType;
    dtoFiscal: PosSaleCustomerFiscalDto | undefined;
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

    // Determinar valores efectivos: dtoFiscal sobreescribe al customer.
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
      // BOLETA con documento: validar formato si fue declarado.
      const err = validateDocument(documentType, documentNumber);
      if (err) throw new BadRequestException(err);
    }

    return { documentType, documentNumber, legalName, fiscalAddress, email };
  }

  private isSuperAdmin(actor: AuthenticatedUser): boolean {
    return (
      actor.role === 'SUPER_ADMIN' ||
      (actor.roleSlugs ?? []).includes(SUPER_ADMIN_SLUG)
    );
  }

  private assertLocationAccess(
    locationId: string,
    actor: AuthenticatedUser,
  ): void {
    if (this.isSuperAdmin(actor)) return;
    if (!actor.inventoryLocationId) {
      throw new ForbiddenException(
        'No tienes una sucursal asignada para operar el POS',
      );
    }
    if (locationId !== actor.inventoryLocationId) {
      throw new ForbiddenException(
        'No puedes vender desde la caja de otra sucursal',
      );
    }
  }

  private toResponse(
    order: SaleAggregate,
    receipt: PosSaleReceiptDto | null,
    raffleEntriesGenerated: number,
    membershipDiscountApplied: boolean,
  ): PosSaleResponseDto {
    const items: PosSaleItemResponseDto[] = order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
      igvRate: Number(i.igvRate),
      unitPriceUntaxed: Number(i.unitPriceUntaxed),
      subtotalUntaxed: Number(i.subtotalUntaxed),
      igvAmount: Number(i.igvAmount),
    }));
    const payments: PosSalePaymentResponseDto[] = order.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: Number(p.amount),
      reference: p.reference,
    }));

    const fiscal: PosSaleFiscalTotalsDto = {
      igvRate: Number(order.igvRate),
      subtotalUntaxed: Number(order.subtotalUntaxed),
      igvAmount: Number(order.igvAmount),
      total: Number(order.total),
      pricesIncludeIgv: order.pricesIncludeIgv,
    };

    const fiscalSnapshot: PosSaleFiscalSnapshotDto = {
      documentType: order.customerDocumentType,
      documentNumber: order.customerDocumentNumber,
      legalName: order.customerLegalName,
      fiscalAddress: order.customerFiscalAddress,
      email: order.customerEmail,
    };

    const resolvedReceipt: PosSaleReceiptDto | null =
      receipt ??
      (order.receiptSeries && order.receiptNumber !== null && order.receiptType
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
        : null);

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      fiscal,
      items,
      payments,
      receipt: resolvedReceipt,
      customer: order.customer
        ? {
            id: order.customer.id,
            fullName: order.customer.fullName,
            dni: order.customer.dni,
            isMember: order.customer.isMember,
          }
        : null,
      fiscalSnapshot,
      raffleEntriesGenerated,
      membershipDiscountApplied,
      createdAt: order.createdAt.toISOString(),
    };
  }

  /**
   * Para uso del frontend: retorna las últimas N ventas POS de una sucursal.
   */
  async listRecent(
    locationId: string,
    actor: AuthenticatedUser,
    limit = 20,
  ): Promise<PosSaleResponseDto[]> {
    this.assertLocationAccess(locationId, actor);
    const orders = await this.prisma.order.findMany({
      where: {
        inventoryLocationId: locationId,
        channel: OrderChannel.POS,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: SALE_INCLUDE,
    });
    return orders.map((o) => this.toResponse(o, null, 0, false));
  }
}
