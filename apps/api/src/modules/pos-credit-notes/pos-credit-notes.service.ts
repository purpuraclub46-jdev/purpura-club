import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EntryStatus,
  InventoryMovementType,
  MembershipBenefitType,
  OrderChannel,
  OrderStatus,
  POSCashMovementType,
  POSCashSessionStatus,
  POSCreditNoteType,
  Prisma,
  ReceiptSeriesType,
  SunatStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  computeOrderBreakdown,
  formatReceiptNumber,
  lineBreakdownGross,
} from '../fiscal/fiscal.util';
import {
  computeNextExpiration,
  isQualifyingPurchase,
} from '../memberships/membership.helpers';
import { ReceiptsService } from '../receipts/receipts.service';
import {
  CreateCreditNoteDto,
  CreditNoteItemDto,
} from './dto/create-credit-note.dto';
import {
  CreditNoteFiscalSnapshotDto,
  CreditNoteFiscalTotalsDto,
  CreditNoteItemResponseDto,
  CreditNoteResponseDto,
  ReturnableOrderDto,
  ReturnableOrderItemDto,
} from './dto/credit-note-response.dto';
import { generateCreditNoteNumber } from './helpers/credit-note-number.helper';

const SUPER_ADMIN_SLUG = 'super_admin';
const CENT_EPSILON = 0.005;

const CREDIT_NOTE_INCLUDE = Prisma.validator<Prisma.POSCreditNoteInclude>()({
  items: {
    include: { product: { select: { id: true, name: true } } },
  },
  order: {
    select: {
      id: true,
      number: true,
      total: true,
      receiptType: true,
      receiptSeries: true,
      receiptNumber: true,
    },
  },
  exchangeOrder: {
    select: {
      id: true,
      number: true,
      total: true,
      receiptType: true,
      receiptSeries: true,
      receiptNumber: true,
    },
  },
  location: { select: { id: true, name: true } },
  createdBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
});

type CreditNoteAggregate = Prisma.POSCreditNoteGetPayload<{
  include: typeof CREDIT_NOTE_INCLUDE;
}>;

const ORDER_FOR_RETURN_INCLUDE = Prisma.validator<Prisma.OrderInclude>()({
  items: { include: { product: { select: { id: true, name: true } } } },
  customer: {
    select: { id: true, fullName: true, dni: true, isMember: true },
  },
  location: { select: { id: true, name: true } },
  creditNotes: {
    include: CREDIT_NOTE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  },
});

type OrderForReturnAggregate = Prisma.OrderGetPayload<{
  include: typeof ORDER_FOR_RETURN_INCLUDE;
}>;

const round2 = (v: number): number => Math.round(v * 100) / 100;

const formatReceipt = (
  series: string | null,
  number: number | null,
): string | null => formatReceiptNumber(series, number);

@Injectable()
export class PosCreditNotesService {
  private readonly logger = new Logger(PosCreditNotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receipts: ReceiptsService,
  ) {}

  // ─── Búsqueda de venta para devolución ─────────────────────────────────

  /**
   * Resuelve una orden POS por número de orden, número de boleta
   * (`B001-00000123` o `B001-123`) o por orderId. Incluye items devueltos
   * y notas previas para mostrar lo realmente devolvible.
   */
  async findReturnableOrder(opts: {
    query: string;
    actor: AuthenticatedUser;
  }): Promise<ReturnableOrderDto> {
    const q = opts.query.trim();
    if (!q) throw new BadRequestException('Buscador vacío');

    let order: OrderForReturnAggregate | null = null;

    // Match: NC-... no permitido; orden número PC-...; boleta B###-#######
    const receiptMatch = q.match(/^([A-Z]{1,4}\d{1,4})-?(\d{1,8})$/i);
    if (receiptMatch) {
      const series = receiptMatch[1].toUpperCase();
      const number = parseInt(receiptMatch[2], 10);
      order = await this.prisma.order.findFirst({
        where: {
          channel: OrderChannel.POS,
          receiptSeries: series,
          receiptNumber: number,
        },
        include: ORDER_FOR_RETURN_INCLUDE,
      });
    }

    if (!order && q.startsWith('PC-')) {
      order = await this.prisma.order.findFirst({
        where: { number: q, channel: OrderChannel.POS },
        include: ORDER_FOR_RETURN_INCLUDE,
      });
    }

    if (!order && /^[0-9a-f-]{36}$/i.test(q)) {
      order = await this.prisma.order.findFirst({
        where: { id: q, channel: OrderChannel.POS },
        include: ORDER_FOR_RETURN_INCLUDE,
      });
    }

    // Búsqueda libre por número de orden o boleta sin formato exacto
    if (!order) {
      order = await this.prisma.order.findFirst({
        where: {
          channel: OrderChannel.POS,
          OR: [
            { number: { contains: q, mode: 'insensitive' } },
            { receiptSeries: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: ORDER_FOR_RETURN_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!order) {
      throw new NotFoundException('Venta POS no encontrada');
    }

    this.assertLocationAccess(order.inventoryLocationId, opts.actor);

    return this.toReturnableOrder(order);
  }

  // ─── Listado / detalle ────────────────────────────────────────────────

  async listForLocation(opts: {
    inventoryLocationId: string;
    actor: AuthenticatedUser;
    limit?: number;
  }): Promise<CreditNoteResponseDto[]> {
    this.assertLocationAccess(opts.inventoryLocationId, opts.actor);
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    const rows = await this.prisma.pOSCreditNote.findMany({
      where: { inventoryLocationId: opts.inventoryLocationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: CREDIT_NOTE_INCLUDE,
    });
    return rows.map((r) => this.toResponse(r));
  }

  async getById(opts: {
    id: string;
    actor: AuthenticatedUser;
  }): Promise<CreditNoteResponseDto> {
    const row = await this.prisma.pOSCreditNote.findUnique({
      where: { id: opts.id },
      include: CREDIT_NOTE_INCLUDE,
    });
    if (!row) throw new NotFoundException('Nota de crédito no encontrada');
    this.assertLocationAccess(row.inventoryLocationId, opts.actor);
    return this.toResponse(row);
  }

  // ─── Creación enterprise ──────────────────────────────────────────────

  /**
   * Emite una nota de crédito con rollback completo:
   *  - Inventario (RESTOCK con CAS)
   *  - Caja (POSCashMovement.REFUND si la sesión está OPEN)
   *  - Raffle entries (delete + CAS sobre raffle.soldTickets)
   *  - Membresía (smart-auto: revierte si era la única compra calificada)
   *  - Marca la orden REFUNDED en FULL_RETURN / SALE_CANCELLATION
   *  - Audita en MembershipBenefitLog (amounts negativos)
   *
   * NOTA: igual que pos-sales, evitamos $transaction por la limitación
   * pgbouncer de Supabase y usamos CAS atómico por línea.
   */
  async createCreditNote(
    dto: CreateCreditNoteDto,
    actor: AuthenticatedUser,
  ): Promise<CreditNoteResponseDto> {
    // 1) Cargar orden con todo lo necesario
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: ORDER_FOR_RETURN_INCLUDE,
    });
    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.channel !== OrderChannel.POS) {
      throw new BadRequestException(
        'Solo se pueden devolver órdenes generadas en el POS',
      );
    }
    if (!order.inventoryLocationId) {
      throw new BadRequestException(
        'La orden no tiene sucursal asociada — no se puede devolver',
      );
    }
    this.assertLocationAccess(order.inventoryLocationId, actor);

    if (order.status === OrderStatus.REFUNDED) {
      throw new ConflictException(
        'La venta ya fue completamente anulada / devuelta',
      );
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new ConflictException('La venta ya está cancelada');
    }

    // 2) Calcular qué items y cuánto se va a devolver
    const returnable = this.computeReturnableItems(order);
    if (returnable.length === 0) {
      throw new ConflictException(
        'No hay items disponibles para devolver — todos fueron devueltos en notas anteriores',
      );
    }

    const itemsToReturn = this.resolveItemsForType(dto, order, returnable);
    if (itemsToReturn.length === 0) {
      throw new BadRequestException(
        'Debes indicar al menos un item para devolver',
      );
    }

    const subtotal = round2(
      itemsToReturn.reduce(
        (acc, it) => acc + it.unitPrice * it.quantity,
        0,
      ),
    );
    const total = subtotal;
    const refundedCash =
      dto.refundedCash !== undefined ? round2(dto.refundedCash) : total;
    if (refundedCash < 0 || refundedCash - total > CENT_EPSILON) {
      throw new BadRequestException(
        `El efectivo devuelto (S/${refundedCash.toFixed(2)}) no puede superar el total (S/${total.toFixed(2)})`,
      );
    }

    // Desglose IGV de la NC. Hereda el régimen de la orden original para
    // consistencia (si la orden tenía pricesIncludeIgv=false, la NC también).
    const igvRate = Number(order.igvRate);
    const pricesIncludeIgv = order.pricesIncludeIgv;
    const fiscalTotals = computeOrderBreakdown({
      grossTotal: total,
      igvRate,
    });
    const lineBreakdowns = itemsToReturn.map((it) =>
      lineBreakdownGross({
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        igvRate,
      }),
    );

    // 3) Resolver sesión de caja (opcional pero recomendada)
    let cashSessionId = dto.cashSessionId ?? null;
    if (!cashSessionId) {
      const openSession = await this.prisma.pOSCashSession.findFirst({
        where: {
          cashRegister: { inventoryLocationId: order.inventoryLocationId },
          status: POSCashSessionStatus.OPEN,
        },
        select: { id: true },
      });
      cashSessionId = openSession?.id ?? null;
    } else {
      const sess = await this.prisma.pOSCashSession.findUnique({
        where: { id: cashSessionId },
        select: {
          status: true,
          cashRegister: { select: { inventoryLocationId: true } },
        },
      });
      if (!sess) {
        throw new NotFoundException('Sesión de caja no encontrada');
      }
      if (sess.status !== POSCashSessionStatus.OPEN) {
        throw new ConflictException('La sesión de caja no está abierta');
      }
      if (sess.cashRegister.inventoryLocationId !== order.inventoryLocationId) {
        throw new BadRequestException(
          'La sesión de caja no pertenece a la sucursal de la venta',
        );
      }
    }

    if (refundedCash > 0 && !cashSessionId) {
      throw new BadRequestException(
        'No hay sesión de caja abierta — no se puede devolver efectivo',
      );
    }

    // 4) Restock de inventario con CAS por línea
    for (const it of itemsToReturn) {
      const stockRow = await this.prisma.inventoryStock.findUnique({
        where: {
          inventoryLocationId_productId: {
            inventoryLocationId: order.inventoryLocationId,
            productId: it.productId,
          },
        },
        select: { stock: true },
      });
      const expected = stockRow?.stock ?? 0;
      if (stockRow) {
        const updated = await this.prisma.inventoryStock.updateMany({
          where: {
            inventoryLocationId: order.inventoryLocationId,
            productId: it.productId,
            stock: expected,
          },
          data: { stock: expected + it.quantity },
        });
        if (updated.count !== 1) {
          throw new ConflictException(
            `Conflicto de stock al devolver "${it.productName}" — vuelve a intentar`,
          );
        }
      } else {
        // No había stock previo en la sucursal (raro) — lo creamos.
        await this.prisma.inventoryStock.create({
          data: {
            inventoryLocationId: order.inventoryLocationId,
            productId: it.productId,
            stock: it.quantity,
          },
        });
      }

      await this.prisma.inventoryMovement.create({
        data: {
          inventoryLocationId: order.inventoryLocationId,
          productId: it.productId,
          quantity: it.quantity,
          type: InventoryMovementType.RESTOCK,
          reason: `Devolución venta ${order.number}`,
          createdByUserId: actor.id,
        },
      });
    }

    // 5) Emitir comprobante NCR-E (serie NOTA_CREDITO de la sucursal).
    //    No bloquea: si no hay serie configurada, se persiste sin numeración.
    let ncReceiptData: {
      series: string;
      number: number;
      issuedAt: Date;
    } | null = null;
    try {
      const issued = await this.receipts.issue({
        inventoryLocationId: order.inventoryLocationId,
        type: ReceiptSeriesType.NOTA_CREDITO,
      });
      ncReceiptData = {
        series: issued.series,
        number: issued.number,
        issuedAt: new Date(),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `No se pudo emitir serie NOTA_CREDITO (la NC continúa sin numeración): ${msg}`,
      );
    }

    // 6) Crear la nota de crédito y sus items con IGV breakdown + snapshot
    const number = generateCreditNoteNumber();
    const creditNote = await this.prisma.pOSCreditNote.create({
      data: {
        number,
        orderId: order.id,
        inventoryLocationId: order.inventoryLocationId,
        cashSessionId,
        createdByUserId: actor.id,
        type: dto.type,
        reason: dto.reason,
        notes: dto.notes ?? null,
        subtotal: new Prisma.Decimal(subtotal),
        total: new Prisma.Decimal(total),
        refundedCash: new Prisma.Decimal(refundedCash),
        // ── Fiscal: IGV breakdown (hereda régimen de la orden) ──
        pricesIncludeIgv,
        igvRate: new Prisma.Decimal(igvRate),
        subtotalUntaxed: new Prisma.Decimal(fiscalTotals.subtotalUntaxed),
        igvAmount: new Prisma.Decimal(fiscalTotals.igvAmount),
        // ── Snapshot fiscal copiado de la orden original ──
        customerDocumentType: order.customerDocumentType,
        customerDocumentNumber: order.customerDocumentNumber,
        customerLegalName: order.customerLegalName,
        customerFiscalAddress: order.customerFiscalAddress,
        customerEmail: order.customerEmail,
        // ── Comprobante NC ──
        receiptType: ncReceiptData
          ? ReceiptSeriesType.NOTA_CREDITO
          : null,
        receiptSeries: ncReceiptData?.series ?? null,
        receiptNumber: ncReceiptData?.number ?? null,
        receiptIssuedAt: ncReceiptData?.issuedAt ?? null,
        sunatStatus: SunatStatus.PENDING,
        items: {
          create: itemsToReturn.map((it, idx) => {
            const b = lineBreakdowns[idx];
            return {
              orderItemId: it.orderItemId,
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: new Prisma.Decimal(it.unitPrice),
              subtotal: new Prisma.Decimal(b.subtotal),
              igvRate: new Prisma.Decimal(b.igvRate),
              unitPriceUntaxed: new Prisma.Decimal(b.unitPriceUntaxed),
              subtotalUntaxed: new Prisma.Decimal(b.subtotalUntaxed),
              igvAmount: new Prisma.Decimal(b.igvAmount),
            };
          }),
        },
      },
      include: CREDIT_NOTE_INCLUDE,
    });

    // 6) Movimiento de caja (REFUND -> EXPENSE con creditNoteId)
    if (cashSessionId && refundedCash > 0) {
      await this.prisma.pOSCashMovement.create({
        data: {
          sessionId: cashSessionId,
          type: POSCashMovementType.EXPENSE,
          amount: new Prisma.Decimal(refundedCash),
          reason: `Devolución ${creditNote.number} (venta ${order.number})`,
          orderId: order.id,
          creditNoteId: creditNote.id,
          createdByUserId: actor.id,
        },
      });
    }

    // 7) Determinar si la orden queda totalmente devuelta
    const totalReturnedAfter = round2(
      this.sumRefundedTotal(order) + total,
    );
    const orderTotal = Number(order.total);
    const isFullyRefunded =
      dto.type === POSCreditNoteType.FULL_RETURN ||
      dto.type === POSCreditNoteType.SALE_CANCELLATION ||
      Math.abs(totalReturnedAfter - orderTotal) < CENT_EPSILON;

    let orderRefunded = false;
    if (isFullyRefunded) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.REFUNDED },
      });
      orderRefunded = true;
    }

    // 8) Revertir raffle entries proporcionalmente (en full o si la orden ya quedó fully refunded)
    let raffleEntriesReversed = 0;
    if (orderRefunded && order.userId) {
      raffleEntriesReversed = await this.reverseRaffleEntriesForOrder(
        order.id,
      );
    }

    // 9) Smart-auto: revertir membresía si esta era la única compra calificada
    let membershipReverted = false;
    if (orderRefunded && order.userId && isQualifyingPurchase(orderTotal)) {
      membershipReverted = await this.smartRevertMembership({
        userId: order.userId,
        customerId: order.customerId,
        excludeOrderId: order.id,
      });
    }

    // 10) Auditoría en MembershipBenefitLog (amounts negativos)
    if (order.userId && (raffleEntriesReversed > 0 || membershipReverted)) {
      await this.prisma.membershipBenefitLog.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          type: MembershipBenefitType.RAFFLE_ENTRY,
          description: `Nota de crédito ${creditNote.number}: -${raffleEntriesReversed} ticket(s)${membershipReverted ? ', membresía revertida' : ''}`,
          amount: new Prisma.Decimal(-raffleEntriesReversed),
        },
      });
    }

    this.logger.log(
      `NC ${creditNote.number} emitida sobre venta ${order.number} (${dto.type}, S/${total.toFixed(2)})`,
    );

    return this.toResponse(creditNote, {
      raffleEntriesReversed,
      membershipReverted,
      orderRefunded,
    });
  }

  // ─── Internals ─────────────────────────────────────────────────────────

  private resolveItemsForType(
    dto: CreateCreditNoteDto,
    order: OrderForReturnAggregate,
    returnable: ReturnableOrderItemDto[],
  ): Array<{
    orderItemId: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }> {
    const returnableMap = new Map(returnable.map((r) => [r.orderItemId, r]));
    const orderItemMap = new Map(order.items.map((i) => [i.id, i]));

    if (
      dto.type === POSCreditNoteType.FULL_RETURN ||
      dto.type === POSCreditNoteType.SALE_CANCELLATION
    ) {
      return returnable
        .filter((r) => r.quantityAvailable > 0)
        .map((r) => {
          const oi = orderItemMap.get(r.orderItemId)!;
          return {
            orderItemId: r.orderItemId,
            productId: r.productId,
            productName: r.productName,
            quantity: r.quantityAvailable,
            unitPrice: Number(oi.unitPrice),
          };
        });
    }

    // PARTIAL_RETURN / PRODUCT_EXCHANGE — el cajero especifica items
    const requested = dto.items ?? [];
    if (requested.length === 0) {
      throw new BadRequestException(
        'Debes seleccionar al menos un item para devolver',
      );
    }

    return requested.map((req: CreditNoteItemDto) => {
      const rr = returnableMap.get(req.orderItemId);
      const oi = orderItemMap.get(req.orderItemId);
      if (!rr || !oi) {
        throw new BadRequestException(
          `El item ${req.orderItemId} no pertenece a la venta`,
        );
      }
      if (req.quantity > rr.quantityAvailable) {
        throw new BadRequestException(
          `Solo puedes devolver ${rr.quantityAvailable} unidad(es) de "${rr.productName}" (${rr.quantityReturned} ya devuelta(s))`,
        );
      }
      return {
        orderItemId: req.orderItemId,
        productId: oi.productId,
        productName: oi.product.name,
        quantity: req.quantity,
        unitPrice: Number(oi.unitPrice),
      };
    });
  }

  private computeReturnableItems(
    order: OrderForReturnAggregate,
  ): ReturnableOrderItemDto[] {
    const returnedByOrderItem = new Map<string, number>();
    for (const cn of order.creditNotes) {
      for (const it of cn.items) {
        if (!it.orderItemId) continue;
        returnedByOrderItem.set(
          it.orderItemId,
          (returnedByOrderItem.get(it.orderItemId) ?? 0) + it.quantity,
        );
      }
    }
    return order.items.map((oi) => {
      const returned = returnedByOrderItem.get(oi.id) ?? 0;
      const available = Math.max(oi.quantity - returned, 0);
      return {
        orderItemId: oi.id,
        productId: oi.productId,
        productName: oi.product.name,
        quantitySold: oi.quantity,
        quantityReturned: returned,
        quantityAvailable: available,
        unitPrice: Number(oi.unitPrice),
        subtotal: Number(oi.subtotal),
      };
    });
  }

  private sumRefundedTotal(order: OrderForReturnAggregate): number {
    return round2(
      order.creditNotes.reduce((acc, cn) => acc + Number(cn.total), 0),
    );
  }

  private async reverseRaffleEntriesForOrder(
    orderId: string,
  ): Promise<number> {
    const entries = await this.prisma.raffleEntry.findMany({
      where: {
        orderId,
        status: { in: [EntryStatus.PAID, EntryStatus.PENDING_PAYMENT] },
      },
      select: { id: true, raffleId: true, status: true },
    });
    if (entries.length === 0) return 0;

    // Agrupar por raffle para decrementar soldTickets de forma atómica
    const byRaffle = new Map<string, number>();
    for (const e of entries) {
      byRaffle.set(e.raffleId, (byRaffle.get(e.raffleId) ?? 0) + 1);
    }

    let reversed = 0;
    for (const [raffleId, count] of byRaffle.entries()) {
      // Cancel entries (mantenemos la fila como auditoría)
      const updated = await this.prisma.raffleEntry.updateMany({
        where: {
          orderId,
          raffleId,
          status: { in: [EntryStatus.PAID, EntryStatus.PENDING_PAYMENT] },
        },
        data: { status: EntryStatus.CANCELLED },
      });
      reversed += updated.count;

      // Decrementar soldTickets (CAS no es estrictamente necesario, decrement)
      await this.prisma.raffle.update({
        where: { id: raffleId },
        data: { soldTickets: { decrement: count } },
      });
    }
    return reversed;
  }

  /**
   * Smart-auto rollback de membresía:
   *  - Si el cliente tiene OTRA compra PAID (POS o ECOMMERCE) calificada
   *    diferente de esta venta → solo actualiza lastPurchaseAt al máximo
   *    de las otras y deja la membresía activa.
   *  - Si NO hay otra compra calificada → desactiva membresía y limpia
   *    customer.isMember / membershipExpiresAt.
   *
   * Retorna `true` si revirtió la membresía.
   */
  private async smartRevertMembership(opts: {
    userId: string;
    customerId: string | null;
    excludeOrderId: string;
  }): Promise<boolean> {
    const otherQualifying = await this.prisma.order.findFirst({
      where: {
        userId: opts.userId,
        id: { not: opts.excludeOrderId },
        status: OrderStatus.PAID,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, total: true },
    });

    const hasOtherQualifying =
      !!otherQualifying && isQualifyingPurchase(otherQualifying.total);

    if (hasOtherQualifying) {
      // Recalcular expiración basada en la última compra elegible vigente
      const newExpires = computeNextExpiration(otherQualifying!.createdAt);
      const now = new Date();
      const stillActive = newExpires > now;
      await this.prisma.membership.update({
        where: { userId: opts.userId },
        data: {
          active: stillActive,
          expiresAt: newExpires,
          lastPurchaseAt: otherQualifying!.createdAt,
        },
      });
      if (opts.customerId) {
        await this.prisma.customer.update({
          where: { id: opts.customerId },
          data: {
            isMember: stillActive,
            membershipExpiresAt: stillActive ? newExpires : null,
          },
        });
      }
      return false;
    }

    // Era la única compra calificada → revocar
    const existing = await this.prisma.membership.findUnique({
      where: { userId: opts.userId },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.membership.update({
        where: { userId: opts.userId },
        data: {
          active: false,
          expiresAt: new Date(),
          lastPurchaseAt: null,
        },
      });
    }
    if (opts.customerId) {
      await this.prisma.customer.update({
        where: { id: opts.customerId },
        data: { isMember: false, membershipExpiresAt: null },
      });
    }
    return true;
  }

  private isSuperAdmin(actor: AuthenticatedUser): boolean {
    return (
      actor.role === 'SUPER_ADMIN' ||
      (actor.roleSlugs ?? []).includes(SUPER_ADMIN_SLUG)
    );
  }

  private assertLocationAccess(
    locationId: string | null | undefined,
    actor: AuthenticatedUser,
  ): void {
    if (this.isSuperAdmin(actor)) return;
    if (!actor.inventoryLocationId) {
      throw new ForbiddenException(
        'No tienes una sucursal asignada para operar devoluciones',
      );
    }
    if (locationId && locationId !== actor.inventoryLocationId) {
      throw new ForbiddenException(
        'No puedes operar devoluciones de otra sucursal',
      );
    }
  }

  // ─── Mapeos a DTO ──────────────────────────────────────────────────────

  private toResponse(
    cn: CreditNoteAggregate,
    extras?: {
      raffleEntriesReversed?: number;
      membershipReverted?: boolean;
      orderRefunded?: boolean;
    },
  ): CreditNoteResponseDto {
    const items: CreditNoteItemResponseDto[] = cn.items.map((it) => ({
      id: it.id,
      orderItemId: it.orderItemId,
      productId: it.productId,
      productName: it.product.name,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      subtotal: Number(it.subtotal),
      igvRate: Number(it.igvRate),
      unitPriceUntaxed: Number(it.unitPriceUntaxed),
      subtotalUntaxed: Number(it.subtotalUntaxed),
      igvAmount: Number(it.igvAmount),
    }));

    const fiscal: CreditNoteFiscalTotalsDto = {
      igvRate: Number(cn.igvRate),
      subtotalUntaxed: Number(cn.subtotalUntaxed),
      igvAmount: Number(cn.igvAmount),
      total: Number(cn.total),
      pricesIncludeIgv: cn.pricesIncludeIgv,
    };

    const fiscalSnapshot: CreditNoteFiscalSnapshotDto = {
      documentType: cn.customerDocumentType,
      documentNumber: cn.customerDocumentNumber,
      legalName: cn.customerLegalName,
      fiscalAddress: cn.customerFiscalAddress,
      email: cn.customerEmail,
    };

    return {
      id: cn.id,
      number: cn.number,
      type: cn.type,
      reason: cn.reason,
      notes: cn.notes,
      subtotal: Number(cn.subtotal),
      total: Number(cn.total),
      refundedCash: Number(cn.refundedCash),
      fiscal,
      fiscalSnapshot,
      receiptType: cn.receiptType,
      receiptSeries: cn.receiptSeries,
      receiptNumber: cn.receiptNumber,
      formattedReceipt: formatReceipt(cn.receiptSeries, cn.receiptNumber),
      receiptIssuedAt: cn.receiptIssuedAt?.toISOString() ?? null,
      sunatStatus: cn.sunatStatus,
      order: {
        id: cn.order.id,
        number: cn.order.number,
        total: Number(cn.order.total),
        receiptType: cn.order.receiptType,
        receiptSeries: cn.order.receiptSeries,
        receiptNumber: cn.order.receiptNumber,
        formattedReceipt: formatReceipt(
          cn.order.receiptSeries,
          cn.order.receiptNumber,
        ),
      },
      exchangeOrder: cn.exchangeOrder
        ? {
            id: cn.exchangeOrder.id,
            number: cn.exchangeOrder.number,
            total: Number(cn.exchangeOrder.total),
            receiptType: cn.exchangeOrder.receiptType,
            receiptSeries: cn.exchangeOrder.receiptSeries,
            receiptNumber: cn.exchangeOrder.receiptNumber,
            formattedReceipt: formatReceipt(
              cn.exchangeOrder.receiptSeries,
              cn.exchangeOrder.receiptNumber,
            ),
          }
        : null,
      inventoryLocationId: cn.inventoryLocationId,
      inventoryLocationName: cn.location.name,
      cashSessionId: cn.cashSessionId,
      createdBy: {
        id: cn.createdBy.id,
        firstName: cn.createdBy.firstName,
        lastName: cn.createdBy.lastName,
        email: cn.createdBy.email,
      },
      items,
      raffleEntriesReversed: extras?.raffleEntriesReversed ?? 0,
      membershipReverted: extras?.membershipReverted ?? false,
      orderRefunded: extras?.orderRefunded ?? false,
      createdAt: cn.createdAt.toISOString(),
    };
  }

  private async toReturnableOrder(
    order: OrderForReturnAggregate,
  ): Promise<ReturnableOrderDto> {
    const returnable = this.computeReturnableItems(order);
    const refundedTotal = this.sumRefundedTotal(order);
    const fullyReturned = returnable.every(
      (r) => r.quantityAvailable === 0,
    );

    const openSession = await this.prisma.pOSCashSession.findFirst({
      where: {
        cashRegister: { inventoryLocationId: order.inventoryLocationId! },
        status: POSCashSessionStatus.OPEN,
      },
      select: { id: true },
    });

    return {
      id: order.id,
      number: order.number,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      status: order.status,
      receiptType: order.receiptType,
      receiptSeries: order.receiptSeries,
      receiptNumber: order.receiptNumber,
      formattedReceipt: formatReceipt(
        order.receiptSeries,
        order.receiptNumber,
      ),
      createdAt: order.createdAt.toISOString(),
      refundedTotal,
      hasOpenSession: Boolean(openSession),
      fullyReturned,
      items: returnable,
      customer: order.customer
        ? {
            id: order.customer.id,
            fullName: order.customer.fullName,
            dni: order.customer.dni,
            isMember: order.customer.isMember,
          }
        : null,
      inventoryLocationId: order.inventoryLocationId!,
      inventoryLocationName: order.location?.name ?? '',
      creditNotes: order.creditNotes.map((cn) => this.toResponse(cn)),
    };
  }
}
