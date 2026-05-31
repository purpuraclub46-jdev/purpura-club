import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  InventoryLocationType,
  OrderPaymentMethod,
  OrderStatus,
  POSCashMovement,
  POSCashMovementType,
  POSCashSession,
  POSCashSessionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  CashRegisterSummaryDto,
  CashSessionMovementDto,
  CashSessionResponseDto,
  CashSessionTotalsDto,
  CashSessionUserDto,
  PaymentMethodTotalDto,
} from './dto/cash-session-response.dto';
import {
  CreateCashMovementDto,
  ManualMovementType,
} from './dto/cash-movement.dto';

const SUPER_ADMIN_SLUG = 'super_admin';

const SESSION_INCLUDE = Prisma.validator<Prisma.POSCashSessionInclude>()({
  cashRegister: { select: { id: true, name: true, active: true } },
  openedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  closedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  movements: {
    orderBy: { createdAt: 'asc' },
    include: {
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      order: { select: { id: true, number: true } },
    },
  },
});

type SessionAggregate = Prisma.POSCashSessionGetPayload<{
  include: typeof SESSION_INCLUDE;
}>;

@Injectable()
export class PosCashService implements OnModuleInit {
  private readonly logger = new Logger(PosCashService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Limpieza arquitectónica: el canal Ecommerce ya no opera caja física.
   * Si quedaron cajas legacy auto-provisionadas para ubicaciones ECOMMERCE,
   * se desactivan en el boot. No se borran para preservar la auditoría
   * histórica de cualquier sesión cerrada que pudiera haberse abierto antes
   * del rollout.
   */
  async onModuleInit(): Promise<void> {
    try {
      const result = await this.prisma.pOSCashRegister.updateMany({
        where: {
          active: true,
          location: { type: InventoryLocationType.ECOMMERCE },
        },
        data: { active: false },
      });
      if (result.count > 0) {
        this.logger.log(
          `Cajas legacy de canal Ecommerce desactivadas: ${result.count}`,
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudo desactivar cajas ECOMMERCE legacy: ${msg}`);
    }
  }

  // ─── Cash registers ────────────────────────────────────────────────────

  async findRegistersForLocation(
    inventoryLocationId: string,
    actor: AuthenticatedUser,
  ): Promise<CashRegisterSummaryDto[]> {
    this.assertLocationAccess(inventoryLocationId, actor);
    const rows = await this.prisma.pOSCashRegister.findMany({
      where: { inventoryLocationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, active: true },
    });
    return rows;
  }

  async getOrCreatePrimaryRegister(
    inventoryLocationId: string,
  ): Promise<{ id: string; name: string }> {
    await this.assertPhysicalSalesFloor(inventoryLocationId);

    const existing = await this.prisma.pOSCashRegister.findFirst({
      where: { inventoryLocationId, active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    if (existing) return existing;

    const loc = await this.prisma.inventoryLocation.findUnique({
      where: { id: inventoryLocationId },
      select: { name: true },
    });
    if (!loc) {
      throw new NotFoundException('Ubicación no encontrada');
    }
    const created = await this.prisma.pOSCashRegister.create({
      data: {
        inventoryLocationId,
        name: `Caja Principal ${loc.name}`,
        active: true,
      },
      select: { id: true, name: true },
    });
    return created;
  }

  /**
   * Garantiza que la ubicación es una SUCURSAL física — bloquea apertura,
   * cierre y operación de caja para ECOMMERCE y ALMACEN. La caja física
   * no existe para el canal ecommerce; sus órdenes se procesan vía
   * MercadoPago en el dashboard `/ecommerce`.
   */
  private async assertPhysicalSalesFloor(
    inventoryLocationId: string,
  ): Promise<void> {
    const loc = await this.prisma.inventoryLocation.findUnique({
      where: { id: inventoryLocationId },
      select: { type: true, name: true },
    });
    if (!loc) {
      throw new NotFoundException('Ubicación no encontrada');
    }
    if (loc.type !== InventoryLocationType.SUCURSAL) {
      throw new BadRequestException(
        loc.type === InventoryLocationType.ECOMMERCE
          ? `${loc.name} es canal Ecommerce — no opera caja física. Usa el dashboard /ecommerce.`
          : `${loc.name} es un almacén — no opera caja física.`,
      );
    }
  }

  // ─── Sesiones ──────────────────────────────────────────────────────────

  async findActiveSession(
    cashRegisterId: string,
  ): Promise<SessionAggregate | null> {
    return this.prisma.pOSCashSession.findFirst({
      where: { cashRegisterId, status: POSCashSessionStatus.OPEN },
      include: SESSION_INCLUDE,
    });
  }

  async findActiveSessionForLocation(
    inventoryLocationId: string,
    actor: AuthenticatedUser,
  ): Promise<CashSessionResponseDto | null> {
    this.assertLocationAccess(inventoryLocationId, actor);
    const session = await this.prisma.pOSCashSession.findFirst({
      where: {
        cashRegister: { inventoryLocationId },
        status: POSCashSessionStatus.OPEN,
      },
      include: SESSION_INCLUDE,
    });
    if (!session) return null;
    return this.toResponse(session);
  }

  async openSession(opts: {
    inventoryLocationId: string;
    cashRegisterId?: string;
    openingAmount: number;
    notes?: string;
    actor: AuthenticatedUser;
  }): Promise<CashSessionResponseDto> {
    this.assertLocationAccess(opts.inventoryLocationId, opts.actor);
    await this.assertPhysicalSalesFloor(opts.inventoryLocationId);

    const register = opts.cashRegisterId
      ? await this.prisma.pOSCashRegister.findUnique({
          where: { id: opts.cashRegisterId },
          select: {
            id: true,
            name: true,
            active: true,
            inventoryLocationId: true,
          },
        })
      : await this.getOrCreatePrimaryRegister(opts.inventoryLocationId);

    if (!register) {
      throw new NotFoundException('Caja no encontrada');
    }
    if ('active' in register && !register.active) {
      throw new BadRequestException('La caja no está activa');
    }
    if (
      'inventoryLocationId' in register &&
      register.inventoryLocationId !== opts.inventoryLocationId
    ) {
      throw new BadRequestException(
        'La caja no pertenece a la ubicación indicada',
      );
    }

    const open = await this.prisma.pOSCashSession.findFirst({
      where: { cashRegisterId: register.id, status: POSCashSessionStatus.OPEN },
      select: { id: true },
    });
    if (open) {
      throw new ConflictException(
        'Ya hay una sesión de caja abierta — ciérrala antes de abrir otra',
      );
    }

    const session = await this.prisma.pOSCashSession.create({
      data: {
        cashRegisterId: register.id,
        openedByUserId: opts.actor.id,
        openingAmount: new Prisma.Decimal(opts.openingAmount),
        status: POSCashSessionStatus.OPEN,
        notes: opts.notes ?? null,
        movements: {
          create: [
            {
              type: POSCashMovementType.OPENING,
              amount: new Prisma.Decimal(opts.openingAmount),
              reason: 'Apertura de caja',
              createdByUserId: opts.actor.id,
            },
          ],
        },
      },
      include: SESSION_INCLUDE,
    });

    this.logger.log(
      `Caja ${register.id} abierta por ${opts.actor.id} con S/${opts.openingAmount}`,
    );
    return this.toResponse(session);
  }

  async closeSession(opts: {
    sessionId: string;
    closingAmount: number;
    notes?: string;
    actor: AuthenticatedUser;
  }): Promise<CashSessionResponseDto> {
    const session = await this.prisma.pOSCashSession.findUnique({
      where: { id: opts.sessionId },
      include: {
        cashRegister: {
          select: { id: true, inventoryLocationId: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Sesión de caja no encontrada');
    if (session.status === POSCashSessionStatus.CLOSED) {
      throw new ConflictException('La sesión de caja ya está cerrada');
    }

    this.assertLocationAccess(
      session.cashRegister.inventoryLocationId,
      opts.actor,
    );

    const totals = await this.computeTotals(session);
    const expected = totals.expectedCash;
    const difference = opts.closingAmount - expected;

    const updated = await this.prisma.pOSCashSession.update({
      where: { id: session.id },
      data: {
        status: POSCashSessionStatus.CLOSED,
        closedAt: new Date(),
        closedByUserId: opts.actor.id,
        closingAmount: new Prisma.Decimal(opts.closingAmount),
        expectedAmount: new Prisma.Decimal(expected),
        differenceAmount: new Prisma.Decimal(difference),
        notes: opts.notes
          ? `${session.notes ? `${session.notes}\n---\n` : ''}${opts.notes}`
          : session.notes,
        movements: {
          create: [
            {
              type: POSCashMovementType.CLOSING,
              amount: new Prisma.Decimal(opts.closingAmount),
              reason: `Cierre de caja (esperado S/${expected.toFixed(2)}, diferencia S/${difference.toFixed(2)})`,
              createdByUserId: opts.actor.id,
            },
          ],
        },
      },
      include: SESSION_INCLUDE,
    });

    this.logger.log(
      `Caja ${session.cashRegisterId} cerrada por ${opts.actor.id} (diff S/${difference.toFixed(2)})`,
    );
    return this.toResponse(updated);
  }

  async addMovement(opts: {
    sessionId: string;
    dto: CreateCashMovementDto;
    actor: AuthenticatedUser;
  }): Promise<CashSessionMovementDto> {
    const session = await this.prisma.pOSCashSession.findUnique({
      where: { id: opts.sessionId },
      include: {
        cashRegister: { select: { inventoryLocationId: true } },
      },
    });
    if (!session) throw new NotFoundException('Sesión de caja no encontrada');
    if (session.status !== POSCashSessionStatus.OPEN) {
      throw new ConflictException(
        'No se pueden registrar movimientos en una sesión cerrada',
      );
    }
    this.assertLocationAccess(
      session.cashRegister.inventoryLocationId,
      opts.actor,
    );

    const type =
      opts.dto.type === ManualMovementType.INCOME
        ? POSCashMovementType.INCOME
        : POSCashMovementType.EXPENSE;

    const movement = await this.prisma.pOSCashMovement.create({
      data: {
        sessionId: session.id,
        type,
        amount: new Prisma.Decimal(opts.dto.amount),
        reason: opts.dto.reason,
        notes: opts.dto.notes ?? null,
        createdByUserId: opts.actor.id,
      },
      include: {
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        order: { select: { id: true, number: true } },
      },
    });

    return this.toMovementResponse(movement);
  }

  // ─── Helpers consumidos por PosSalesService ────────────────────────────

  /**
   * Crea un movimiento SALE asociado a una orden POS. Usado internamente por
   * `PosSalesService` luego de crear la orden.
   * NOTA: `amount` aquí refleja el TOTAL de la orden — el cálculo de efectivo
   * esperado en cierre considera solo los pagos en efectivo de la orden.
   */
  async recordSaleMovement(opts: {
    sessionId: string;
    orderId: string;
    amount: number;
    actor: AuthenticatedUser;
  }): Promise<void> {
    await this.prisma.pOSCashMovement.create({
      data: {
        sessionId: opts.sessionId,
        type: POSCashMovementType.SALE,
        amount: new Prisma.Decimal(opts.amount),
        reason: 'Venta POS',
        orderId: opts.orderId,
        createdByUserId: opts.actor.id,
      },
    });
  }

  // ─── Detalle / totales ─────────────────────────────────────────────────

  async getSession(
    sessionId: string,
    actor: AuthenticatedUser,
  ): Promise<CashSessionResponseDto> {
    const session = await this.prisma.pOSCashSession.findUnique({
      where: { id: sessionId },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException('Sesión de caja no encontrada');
    const locId = await this.locationOfRegister(session.cashRegisterId);
    this.assertLocationAccess(locId, actor);
    return this.toResponse(session);
  }

  async listSessionsForLocation(
    inventoryLocationId: string,
    actor: AuthenticatedUser,
    limit = 20,
  ): Promise<CashSessionResponseDto[]> {
    this.assertLocationAccess(inventoryLocationId, actor);
    const rows = await this.prisma.pOSCashSession.findMany({
      where: { cashRegister: { inventoryLocationId } },
      orderBy: { openedAt: 'desc' },
      take: limit,
      include: SESSION_INCLUDE,
    });
    return Promise.all(rows.map((r) => this.toResponse(r)));
  }

  // ─── Internals ─────────────────────────────────────────────────────────

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
        'No tienes una sucursal asignada para operar el POS',
      );
    }
    if (locationId && locationId !== actor.inventoryLocationId) {
      throw new ForbiddenException(
        'No puedes operar la caja de otra sucursal',
      );
    }
  }

  private async locationOfRegister(registerId: string): Promise<string> {
    const r = await this.prisma.pOSCashRegister.findUnique({
      where: { id: registerId },
      select: { inventoryLocationId: true },
    });
    if (!r) throw new NotFoundException('Caja no encontrada');
    return r.inventoryLocationId;
  }

  /**
   * Calcula totales de una sesión:
   *  - salesTotal, salesCount agregando órdenes PAID.
   *  - incomeTotal/expenseTotal de los movimientos manuales.
   *  - expectedCash = apertura + ingresos efectivo - egresos efectivo + ventas en efectivo.
   *  - byPaymentMethod a partir de OrderPayment.
   */
  private async computeTotals(
    session: POSCashSession,
  ): Promise<CashSessionTotalsDto> {
    const [movementsByType, salesAgg, paymentsAgg] = await Promise.all([
      this.prisma.pOSCashMovement.groupBy({
        by: ['type'],
        where: { sessionId: session.id },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { cashSessionId: session.id, status: OrderStatus.PAID },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.orderPayment.groupBy({
        by: ['method'],
        where: {
          order: { cashSessionId: session.id, status: OrderStatus.PAID },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const byType = new Map<POSCashMovementType, number>();
    for (const m of movementsByType) {
      byType.set(m.type, m._sum.amount ? Number(m._sum.amount) : 0);
    }

    const incomeTotal = byType.get(POSCashMovementType.INCOME) ?? 0;
    const expenseTotal = byType.get(POSCashMovementType.EXPENSE) ?? 0;

    const cashPayments =
      paymentsAgg.find((p) => p.method === OrderPaymentMethod.CASH)?._sum.amount;
    const cashSales = cashPayments ? Number(cashPayments) : 0;

    const expectedCash =
      Number(session.openingAmount) + incomeTotal - expenseTotal + cashSales;

    return {
      salesTotal: salesAgg._sum.total ? Number(salesAgg._sum.total) : 0,
      salesCount: salesAgg._count._all,
      incomeTotal,
      expenseTotal,
      expectedCash,
      byPaymentMethod: paymentsAgg.map(
        (p): PaymentMethodTotalDto => ({
          method: p.method,
          total: p._sum.amount ? Number(p._sum.amount) : 0,
          count: p._count._all,
        }),
      ),
    };
  }

  private async toResponse(
    session: SessionAggregate,
  ): Promise<CashSessionResponseDto> {
    const totals = await this.computeTotals(session);
    return {
      id: session.id,
      cashRegisterId: session.cashRegisterId,
      cashRegister: {
        id: session.cashRegister.id,
        name: session.cashRegister.name,
        active: session.cashRegister.active,
      },
      status: session.status,
      openedBy: this.toUserDto(session.openedBy),
      closedBy: session.closedBy ? this.toUserDto(session.closedBy) : null,
      openingAmount: Number(session.openingAmount),
      closingAmount:
        session.closingAmount !== null ? Number(session.closingAmount) : null,
      expectedAmount:
        session.expectedAmount !== null ? Number(session.expectedAmount) : null,
      differenceAmount:
        session.differenceAmount !== null
          ? Number(session.differenceAmount)
          : null,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      notes: session.notes,
      totals,
      movements: session.movements.map((m) => this.toMovementResponse(m)),
    };
  }

  private toMovementResponse(
    m: POSCashMovement & {
      createdBy?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      } | null;
      order?: { id: string; number: string } | null;
    },
  ): CashSessionMovementDto {
    return {
      id: m.id,
      type: m.type,
      amount: Number(m.amount),
      reason: m.reason,
      notes: m.notes,
      orderId: m.order?.id ?? null,
      orderNumber: m.order?.number ?? null,
      createdBy: m.createdBy ? this.toUserDto(m.createdBy) : null,
      createdAt: m.createdAt.toISOString(),
    };
  }

  private toUserDto(u: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }): CashSessionUserDto {
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
    };
  }
}
