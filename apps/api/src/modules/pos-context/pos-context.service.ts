import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryLocationType,
  OrderChannel,
  POSCashMovementType,
  POSCashSessionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  PosBootstrapDto,
  PosLocationDto,
  PosLocationReceiptSeriesDto,
  PosReportsDto,
} from './dto/pos-context-response.dto';

const SUPER_ADMIN_SLUG = 'super_admin';

@Injectable()
export class PosContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve las sucursales FÍSICAS que el usuario puede operar como POS.
   * Ecommerce y almacenes quedan FUERA — el POS físico es solo tiendas reales
   * con caja, cajero y efectivo. El canal Ecommerce se opera desde su
   * dashboard `/ecommerce` aparte.
   *
   *  - SUPER_ADMIN: todas las SUCURSAL activas.
   *  - Otros: su sucursal asignada, siempre que sea SUCURSAL.
   */
  async bootstrap(actor: AuthenticatedUser): Promise<PosBootstrapDto> {
    const where: Prisma.InventoryLocationWhereInput = {
      active: true,
      type: InventoryLocationType.SUCURSAL,
    };
    if (!this.isSuperAdmin(actor)) {
      if (!actor.inventoryLocationId) {
        return { availableLocations: [], defaultLocationId: null };
      }
      where.id = actor.inventoryLocationId;
    }

    const locations = await this.prisma.inventoryLocation.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        active: true,
        _count: { select: { cashRegisters: true } },
      },
    });

    const locationIds = locations.map((l) => l.id);
    const openSessions = locationIds.length
      ? await this.prisma.pOSCashSession.findMany({
          where: {
            status: POSCashSessionStatus.OPEN,
            cashRegister: { inventoryLocationId: { in: locationIds } },
          },
          select: {
            id: true,
            cashRegister: { select: { inventoryLocationId: true } },
          },
        })
      : [];
    const openByLocation = new Map<string, string>();
    for (const s of openSessions) {
      openByLocation.set(s.cashRegister.inventoryLocationId, s.id);
    }

    const items: PosLocationDto[] = locations.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      type: l.type,
      active: l.active,
      cashRegistersCount: l._count.cashRegisters,
      activeSessionId: openByLocation.get(l.id) ?? null,
    }));

    return {
      availableLocations: items,
      defaultLocationId: this.isSuperAdmin(actor)
        ? (items[0]?.id ?? null)
        : (actor.inventoryLocationId ?? null),
    };
  }

  async resolveLocationBySlug(
    slug: string,
    actor: AuthenticatedUser,
  ): Promise<PosLocationDto> {
    const loc = await this.prisma.inventoryLocation.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        active: true,
        _count: { select: { cashRegisters: true } },
      },
    });
    if (!loc) throw new NotFoundException('Sucursal no encontrada');
    if (!loc.active) throw new ForbiddenException('La sucursal no está activa');

    if (loc.type !== InventoryLocationType.SUCURSAL) {
      throw new ForbiddenException(
        loc.type === InventoryLocationType.ECOMMERCE
          ? 'Ecommerce no opera como terminal POS — usa el dashboard /ecommerce'
          : 'Los almacenes no operan como terminal POS',
      );
    }

    if (!this.isSuperAdmin(actor)) {
      if (!actor.inventoryLocationId || actor.inventoryLocationId !== loc.id) {
        throw new ForbiddenException(
          'No tienes acceso al POS de esta sucursal',
        );
      }
    }

    const open = await this.prisma.pOSCashSession.findFirst({
      where: {
        status: POSCashSessionStatus.OPEN,
        cashRegister: { inventoryLocationId: loc.id },
      },
      select: { id: true },
    });

    return {
      id: loc.id,
      name: loc.name,
      slug: loc.slug,
      type: loc.type,
      active: loc.active,
      cashRegistersCount: loc._count.cashRegisters,
      activeSessionId: open?.id ?? null,
    };
  }

  async listReceiptSeries(
    locationId: string,
    actor: AuthenticatedUser,
  ): Promise<PosLocationReceiptSeriesDto[]> {
    this.assertLocationAccess(locationId, actor);
    const rows = await this.prisma.receiptSeries.findMany({
      where: { inventoryLocationId: locationId },
      orderBy: [{ type: 'asc' }, { series: 'asc' }],
      select: {
        id: true,
        type: true,
        series: true,
        nextNumber: true,
        active: true,
      },
    });
    return rows;
  }

  async reports(
    locationId: string,
    actor: AuthenticatedUser,
  ): Promise<PosReportsDto> {
    this.assertLocationAccess(locationId, actor);

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseOrderWhere = (from: Date): Prisma.OrderWhereInput => ({
      inventoryLocationId: locationId,
      channel: OrderChannel.POS,
      status: 'PAID',
      createdAt: { gte: from },
    });

    const [
      todaySales,
      monthSales,
      incomeAgg,
      expenseAgg,
      diffAgg,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: baseOrderWhere(startOfDay),
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: baseOrderWhere(startOfMonth),
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.pOSCashMovement.aggregate({
        where: {
          type: POSCashMovementType.INCOME,
          createdAt: { gte: startOfDay },
          session: { cashRegister: { inventoryLocationId: locationId } },
        },
        _sum: { amount: true },
      }),
      this.prisma.pOSCashMovement.aggregate({
        where: {
          type: POSCashMovementType.EXPENSE,
          createdAt: { gte: startOfDay },
          session: { cashRegister: { inventoryLocationId: locationId } },
        },
        _sum: { amount: true },
      }),
      this.prisma.pOSCashSession.aggregate({
        where: {
          status: POSCashSessionStatus.CLOSED,
          closedAt: { gte: startOfDay },
          cashRegister: { inventoryLocationId: locationId },
        },
        _sum: { differenceAmount: true },
      }),
    ]);

    return {
      salesToday: todaySales._sum.total ? Number(todaySales._sum.total) : 0,
      ordersToday: todaySales._count._all,
      salesMonth: monthSales._sum.total ? Number(monthSales._sum.total) : 0,
      ordersMonth: monthSales._count._all,
      incomeToday: incomeAgg._sum.amount ? Number(incomeAgg._sum.amount) : 0,
      expenseToday: expenseAgg._sum.amount ? Number(expenseAgg._sum.amount) : 0,
      cashDifferenceToday: diffAgg._sum.differenceAmount
        ? Number(diffAgg._sum.differenceAmount)
        : 0,
    };
  }

  // ─── helpers ───────────────────────────────────────────────────────────

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
    if (
      !actor.inventoryLocationId ||
      actor.inventoryLocationId !== locationId
    ) {
      throw new ForbiddenException(
        'No tienes acceso a esta sucursal en el POS',
      );
    }
  }
}
