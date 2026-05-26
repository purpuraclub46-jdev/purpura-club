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
  EntryStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { validateDocument } from '../fiscal/document-validators';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import {
  CustomerDetailResponseDto,
  CustomerOverviewStatsDto,
  CustomerResponseDto,
  CustomerStatsDto,
} from './dto/customer-response.dto';
import { CustomerSearchDto } from './dto/customer-search.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const CUSTOMER_INCLUDE = Prisma.validator<Prisma.CustomerInclude>()({
  primaryLocation: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, email: true, active: true } },
});

type CustomerAggregate = Prisma.CustomerGetPayload<{
  include: typeof CUSTOMER_INCLUDE;
}>;

const SUPER_ADMIN_SLUG = 'super_admin';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Read ──────────────────────────────────────────────────────────────

  async findMany(
    query: CustomerQueryDto,
    actor: AuthenticatedUser,
  ): Promise<Paginated<CustomerResponseDto>> {
    const where = await this.buildWhere(query, actor);

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ active: 'desc' }, { fullName: 'asc' }],
        include: CUSTOMER_INCLUDE,
      }),
      this.prisma.customer.count({ where }),
    ]);

    const statsByCustomer = await this.computeStatsForMany(
      items.map((c) => ({ id: c.id, userId: c.userId })),
    );

    let mapped = items.map((c) =>
      this.toResponse(c, statsByCustomer.get(c.id) ?? this.emptyStats()),
    );

    // Filtro post-procesado por monto mínimo gastado (las stats se calculan
    // en runtime, así que el filtro se aplica acá). Esto puede reducir el
    // tamaño de la página actual; el total reportado se ajusta también.
    if (typeof query.minSpent === 'number' && query.minSpent > 0) {
      const filtered = mapped.filter((c) => c.stats.totalSpent >= query.minSpent!);
      mapped = filtered;
      return {
        items: mapped,
        meta: {
          ...buildPaginationMeta(filtered.length, query.page, query.limit),
          total: filtered.length,
        },
      };
    }

    return {
      items: mapped,
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async findById(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<CustomerDetailResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: CUSTOMER_INCLUDE,
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    this.assertLocationAccess(customer.primaryLocationId, actor);

    const stats = await this.computeStats(customer.id, customer.userId);
    const [recentOrders, recentRaffleEntries, wonPrizes] = await Promise.all([
      this.recentOrders(customer.userId),
      this.recentRaffleEntries(customer.userId),
      this.wonPrizes(customer.userId),
    ]);

    return {
      ...this.toResponse(customer, stats),
      recentOrders,
      recentRaffleEntries,
      wonPrizes,
    };
  }

  async search(
    dto: CustomerSearchDto,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto[]> {
    const term = (dto.q ?? '').trim();
    if (!term) return [];

    const baseScope = await this.locationScopeWhere(actor);

    const where: Prisma.CustomerWhereInput = {
      ...baseScope,
      active: true,
      OR: [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { dni: { contains: term, mode: 'insensitive' } },
      ],
    };

    const items = await this.prisma.customer.findMany({
      where,
      take: dto.limit,
      orderBy: [{ fullName: 'asc' }],
      include: CUSTOMER_INCLUDE,
    });

    const stats = await this.computeStatsForMany(
      items.map((c) => ({ id: c.id, userId: c.userId })),
    );
    return items.map((c) =>
      this.toResponse(c, stats.get(c.id) ?? this.emptyStats()),
    );
  }

  async overview(actor: AuthenticatedUser): Promise<CustomerOverviewStatsDto> {
    const scope = await this.locationScopeWhere(actor);
    const last30 = new Date();
    last30.setUTCDate(last30.getUTCDate() - 30);

    const [total, active, members, registeredLast30Days] = await Promise.all([
      this.prisma.customer.count({ where: scope }),
      this.prisma.customer.count({ where: { ...scope, active: true } }),
      this.prisma.customer.count({
        where: { ...scope, active: true, isMember: true },
      }),
      this.prisma.customer.count({
        where: { ...scope, createdAt: { gte: last30 } },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      members,
      registeredLast30Days,
    };
  }

  // ─── Mutations ─────────────────────────────────────────────────────────

  async create(
    dto: CreateCustomerDto,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    this.validateFiscalConsistency(dto);
    await this.assertUniqueness({
      dni: dto.dni,
      ruc: dto.ruc,
      email: dto.email,
      userId: dto.userId,
    });
    if (dto.primaryLocationId) {
      await this.ensureLocationExists(dto.primaryLocationId);
    }

    // Si el usuario actor pertenece a una sucursal, fuerza esa sucursal
    // como primaryLocation (a menos que sea super admin).
    const effectiveLocationId =
      this.isSuperAdmin(actor) || actor.inventoryLocationId === null
        ? (dto.primaryLocationId ?? null)
        : actor.inventoryLocationId;

    const { isMember, membershipExpiresAt } = await this.resolveMembership(
      dto.userId ?? null,
    );

    const fullName = `${dto.firstName.trim()} ${dto.lastName.trim()}`.replace(/\s+/g, ' ');
    const documentType = dto.documentType ?? CustomerDocumentType.DNI;

    try {
      const created = await this.prisma.customer.create({
        data: {
          userId: dto.userId ?? null,
          firstName: dto.firstName,
          lastName: dto.lastName,
          fullName,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          dni: dto.dni ?? null,
          documentType,
          ruc: dto.ruc ?? null,
          legalName: dto.legalName ?? null,
          fiscalAddress: dto.fiscalAddress ?? null,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          gender: dto.gender ?? null,
          notes: dto.notes ?? null,
          isMember,
          membershipExpiresAt,
          active: dto.active ?? true,
          primaryLocationId: effectiveLocationId,
        },
        include: CUSTOMER_INCLUDE,
      });

      this.logger.log(
        `Cliente creado ${created.id} (${created.fullName}) por ${actor.id}`,
      );
      return this.toResponse(created, this.emptyStats());
    } catch (error) {
      throw this.translateUniqueConflict(error);
    }
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        dni: true,
        ruc: true,
        documentType: true,
        legalName: true,
        fiscalAddress: true,
        email: true,
        primaryLocationId: true,
      },
    });
    if (!existing) throw new NotFoundException('Cliente no encontrado');

    this.assertLocationAccess(existing.primaryLocationId, actor);

    // Validar coherencia fiscal usando el estado MERGE (existente ∪ dto)
    this.validateFiscalConsistency({
      documentType: dto.documentType ?? existing.documentType,
      dni: dto.dni !== undefined ? dto.dni : existing.dni ?? undefined,
      ruc: dto.ruc !== undefined ? dto.ruc : existing.ruc ?? undefined,
      legalName:
        dto.legalName !== undefined
          ? dto.legalName
          : existing.legalName ?? undefined,
      fiscalAddress:
        dto.fiscalAddress !== undefined
          ? dto.fiscalAddress
          : existing.fiscalAddress ?? undefined,
    });

    await this.assertUniqueness({
      dni: dto.dni !== existing.dni ? dto.dni : undefined,
      ruc: dto.ruc !== existing.ruc ? dto.ruc : undefined,
      email: dto.email !== existing.email ? dto.email : undefined,
      userId:
        dto.userId !== undefined && dto.userId !== existing.userId
          ? dto.userId ?? null
          : undefined,
      excludeId: id,
    });

    if (dto.primaryLocationId) {
      await this.ensureLocationExists(dto.primaryLocationId);
      // Un usuario de sucursal no puede transferir un cliente a OTRA sucursal.
      if (
        !this.isSuperAdmin(actor) &&
        actor.inventoryLocationId &&
        dto.primaryLocationId !== actor.inventoryLocationId
      ) {
        throw new ForbiddenException(
          'No puedes mover clientes a una sucursal distinta a la asignada',
        );
      }
    }

    const data: Prisma.CustomerUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email ?? null;
    if (dto.phone !== undefined) data.phone = dto.phone ?? null;
    if (dto.dni !== undefined) data.dni = dto.dni ?? null;
    if (dto.documentType !== undefined) data.documentType = dto.documentType;
    if (dto.ruc !== undefined) data.ruc = dto.ruc ?? null;
    if (dto.legalName !== undefined) data.legalName = dto.legalName ?? null;
    if (dto.fiscalAddress !== undefined) {
      data.fiscalAddress = dto.fiscalAddress ?? null;
    }
    if (dto.birthDate !== undefined) {
      data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    }
    if (dto.gender !== undefined) data.gender = dto.gender ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    if (dto.active !== undefined) data.active = dto.active;

    // Sync de fullName si alguno de los componentes cambia.
    const nextFirst = dto.firstName ?? existing.firstName;
    const nextLast = dto.lastName ?? existing.lastName;
    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      data.fullName = `${nextFirst.trim()} ${nextLast.trim()}`.replace(/\s+/g, ' ');
    }

    if (dto.primaryLocationId !== undefined) {
      data.primaryLocation =
        dto.primaryLocationId === null
          ? { disconnect: true }
          : { connect: { id: dto.primaryLocationId } };
    }

    if (dto.userId !== undefined) {
      data.user =
        dto.userId === null
          ? { disconnect: true }
          : { connect: { id: dto.userId } };
    }

    // Si se actualizó/quitó el vínculo a User, re-sincroniza la membresía.
    const newUserId =
      dto.userId !== undefined ? dto.userId ?? null : existing.userId;
    const membership = await this.resolveMembership(newUserId);
    data.isMember = membership.isMember;
    data.membershipExpiresAt = membership.membershipExpiresAt;

    try {
      const updated = await this.prisma.customer.update({
        where: { id },
        data,
        include: CUSTOMER_INCLUDE,
      });

      this.logger.log(`Cliente actualizado ${updated.id} por ${actor.id}`);

      const stats = await this.computeStats(updated.id, updated.userId);
      return this.toResponse(updated, stats);
    } catch (error) {
      throw this.translateUniqueConflict(error);
    }
  }

  async setActive(
    id: string,
    active: boolean,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, primaryLocationId: true, userId: true },
    });
    if (!existing) throw new NotFoundException('Cliente no encontrado');
    this.assertLocationAccess(existing.primaryLocationId, actor);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { active },
      include: CUSTOMER_INCLUDE,
    });
    const stats = await this.computeStats(updated.id, updated.userId);
    return this.toResponse(updated, stats);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, primaryLocationId: true },
    });
    if (!existing) throw new NotFoundException('Cliente no encontrado');
    this.assertLocationAccess(existing.primaryLocationId, actor);

    await this.prisma.customer.delete({ where: { id } });
    this.logger.log(`Cliente eliminado ${id} por ${actor.id}`);
  }

  // ─── Helpers de scoping/permisos ───────────────────────────────────────

  private isSuperAdmin(actor: AuthenticatedUser): boolean {
    return (
      actor.role === 'SUPER_ADMIN' ||
      (actor.roleSlugs ?? []).includes(SUPER_ADMIN_SLUG)
    );
  }

  private async locationScopeWhere(
    actor: AuthenticatedUser,
  ): Promise<Prisma.CustomerWhereInput> {
    if (this.isSuperAdmin(actor)) return {};
    if (!actor.inventoryLocationId) return {};
    // Usuarios de sucursal: ven clientes de su sucursal + los "sin sucursal".
    return {
      OR: [
        { primaryLocationId: actor.inventoryLocationId },
        { primaryLocationId: null },
      ],
    };
  }

  private async buildWhere(
    query: CustomerQueryDto,
    actor: AuthenticatedUser,
  ): Promise<Prisma.CustomerWhereInput> {
    const scope = await this.locationScopeWhere(actor);
    const conditions: Prisma.CustomerWhereInput[] = [scope];

    if (typeof query.active === 'boolean') {
      conditions.push({ active: query.active });
    }
    if (typeof query.isMember === 'boolean') {
      conditions.push({ isMember: query.isMember });
    }
    if (query.primaryLocationId) {
      // Si el usuario es de sucursal, solo puede filtrar por la suya.
      if (
        !this.isSuperAdmin(actor) &&
        actor.inventoryLocationId &&
        query.primaryLocationId !== actor.inventoryLocationId
      ) {
        throw new ForbiddenException(
          'No puedes consultar clientes de otra sucursal',
        );
      }
      conditions.push({ primaryLocationId: query.primaryLocationId });
    }
    if (query.registeredFrom || query.registeredTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.registeredFrom) createdAt.gte = new Date(query.registeredFrom);
      if (query.registeredTo) {
        const to = new Date(query.registeredTo);
        to.setUTCHours(23, 59, 59, 999);
        createdAt.lte = to;
      }
      conditions.push({ createdAt });
    }
    if (query.search) {
      const term = query.search;
      conditions.push({
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term } },
          { dni: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    return { AND: conditions };
  }

  private assertLocationAccess(
    customerLocationId: string | null,
    actor: AuthenticatedUser,
  ): void {
    if (this.isSuperAdmin(actor)) return;
    if (!actor.inventoryLocationId) return;
    if (customerLocationId === null) return; // clientes sin sucursal son visibles
    if (customerLocationId !== actor.inventoryLocationId) {
      throw new ForbiddenException(
        'No tienes acceso a clientes de otra sucursal',
      );
    }
  }

  // ─── Validaciones de unicidad ──────────────────────────────────────────

  private async assertUniqueness(opts: {
    dni?: string | null;
    ruc?: string | null;
    email?: string | null;
    userId?: string | null;
    excludeId?: string;
  }): Promise<void> {
    const { dni, ruc, email, userId, excludeId } = opts;
    const not = excludeId ? { NOT: { id: excludeId } } : {};

    if (dni) {
      const conflict = await this.prisma.customer.findFirst({
        where: { dni, ...not },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('Ya existe un cliente con este DNI');
      }
    }
    if (ruc) {
      const conflict = await this.prisma.customer.findFirst({
        where: { ruc, ...not },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('Ya existe un cliente con este RUC');
      }
    }
    if (email) {
      const conflict = await this.prisma.customer.findFirst({
        where: { email, ...not },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('Ya existe un cliente con este email');
      }
    }
    if (userId) {
      const conflict = await this.prisma.customer.findFirst({
        where: { userId, ...not },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(
          'Esta cuenta de usuario ya está enlazada a otro cliente',
        );
      }
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!userExists) {
        throw new BadRequestException('El usuario indicado no existe');
      }
    }
  }

  /**
   * Valida coherencia fiscal:
   *  - Si el documento es DNI/CE/PASSPORT, el número va en `dni`.
   *    Para CE/PASSPORT permitimos chars alfanuméricos en el mismo campo.
   *  - Si el documento es RUC, requiere `ruc`, `legalName` y `fiscalAddress`.
   *  - El check digit del RUC se valida con módulo 11.
   *  - El DNI debe ser 8 dígitos numéricos cuando documentType=DNI.
   *
   * Tira BadRequestException con mensaje claro si algo no cumple.
   */
  private validateFiscalConsistency(opts: {
    documentType?: CustomerDocumentType | null;
    dni?: string | null;
    ruc?: string | null;
    legalName?: string | null;
    fiscalAddress?: string | null;
  }): void {
    const type = opts.documentType ?? CustomerDocumentType.DNI;

    if (type === CustomerDocumentType.RUC) {
      if (!opts.ruc) {
        throw new BadRequestException(
          'Para tipo de documento RUC, el campo "ruc" es obligatorio',
        );
      }
      const ruleError = validateDocument(CustomerDocumentType.RUC, opts.ruc);
      if (ruleError) throw new BadRequestException(ruleError);
      if (!opts.legalName) {
        throw new BadRequestException(
          'Para clientes con RUC, la razón social (legalName) es obligatoria',
        );
      }
      if (!opts.fiscalAddress) {
        throw new BadRequestException(
          'Para clientes con RUC, la dirección fiscal es obligatoria',
        );
      }
      return;
    }

    // DNI / CE / PASSPORT — si el campo dni viene poblado, valida formato
    // según el tipo. Si no viene, está OK (cliente walk-in sin documento).
    if (opts.dni) {
      const ruleError = validateDocument(type, opts.dni);
      if (ruleError) throw new BadRequestException(ruleError);
    }

    // Si el cliente tiene RUC adicional (persona natural con negocio), validar.
    if (opts.ruc) {
      const ruleError = validateDocument(CustomerDocumentType.RUC, opts.ruc);
      if (ruleError) throw new BadRequestException(ruleError);
    }
  }

  /**
   * Lookup rápido por documento (DNI o RUC). Devuelve el cliente si existe.
   * Retorna `null` si no hay match (la UI puede ofrecer crear uno nuevo).
   * Útil en el checkout POS para evitar buscar manualmente.
   */
  async lookupByDocument(opts: {
    documentNumber: string;
    actor: AuthenticatedUser;
  }): Promise<CustomerResponseDto | null> {
    const value = opts.documentNumber.trim().toUpperCase();
    if (!value) {
      throw new BadRequestException('Documento vacío');
    }
    const scope = await this.locationScopeWhere(opts.actor);
    const customer = await this.prisma.customer.findFirst({
      where: {
        ...scope,
        active: true,
        OR: [{ dni: value }, { ruc: value }],
      },
      include: CUSTOMER_INCLUDE,
    });
    if (!customer) return null;
    const stats = await this.computeStats(customer.id, customer.userId);
    return this.toResponse(customer, stats);
  }

  private async ensureLocationExists(locationId: string): Promise<void> {
    const exists = await this.prisma.inventoryLocation.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!exists) {
      throw new BadRequestException('La sucursal indicada no existe');
    }
  }

  private async resolveMembership(
    userId: string | null,
  ): Promise<{ isMember: boolean; membershipExpiresAt: Date | null }> {
    if (!userId) return { isMember: false, membershipExpiresAt: null };
    const m = await this.prisma.membership.findUnique({
      where: { userId },
      select: { active: true, expiresAt: true },
    });
    if (!m) return { isMember: false, membershipExpiresAt: null };
    const active = m.active && m.expiresAt > new Date();
    return { isMember: active, membershipExpiresAt: m.expiresAt };
  }

  // ─── Estadísticas (calculadas en runtime) ──────────────────────────────

  private emptyStats(): CustomerStatsDto {
    return {
      totalOrders: 0,
      paidOrders: 0,
      totalSpent: 0,
      averageTicket: 0,
      raffleEntries: 0,
      wonRaffles: 0,
      lastPurchaseAt: null,
    };
  }

  private async computeStats(
    _customerId: string,
    userId: string | null,
  ): Promise<CustomerStatsDto> {
    if (!userId) return this.emptyStats();

    const [totalOrders, paid, lastPaid, raffleEntries, wonRaffles] =
      await Promise.all([
        this.prisma.order.count({ where: { userId } }),
        this.prisma.order.aggregate({
          where: { userId, status: OrderStatus.PAID },
          _sum: { total: true },
          _count: true,
        }),
        this.prisma.order.findFirst({
          where: { userId, status: OrderStatus.PAID },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        this.prisma.raffleEntry.count({ where: { userId } }),
        this.prisma.raffleEntry.count({
          where: { userId, status: EntryStatus.WINNER },
        }),
      ]);

    const paidOrders = paid._count;
    const totalSpent = paid._sum.total ? Number(paid._sum.total) : 0;
    const averageTicket = paidOrders > 0 ? totalSpent / paidOrders : 0;

    return {
      totalOrders,
      paidOrders,
      totalSpent,
      averageTicket,
      raffleEntries,
      wonRaffles,
      lastPurchaseAt: lastPaid?.createdAt.toISOString() ?? null,
    };
  }

  private async computeStatsForMany(
    refs: { id: string; userId: string | null }[],
  ): Promise<Map<string, CustomerStatsDto>> {
    const userIds = refs.map((r) => r.userId).filter((id): id is string => !!id);
    const result = new Map<string, CustomerStatsDto>();
    if (userIds.length === 0) {
      for (const r of refs) result.set(r.id, this.emptyStats());
      return result;
    }

    // Una sola consulta agregada por userId para evitar N+1.
    const [grouped, lastPurchasesRaw, raffleCounts, winnerCounts] =
      await Promise.all([
        this.prisma.order.groupBy({
          by: ['userId', 'status'],
          where: { userId: { in: userIds } },
          _count: { _all: true },
          _sum: { total: true },
        }),
        this.prisma.order.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds }, status: OrderStatus.PAID },
          _max: { createdAt: true },
        }),
        this.prisma.raffleEntry.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _count: { _all: true },
        }),
        this.prisma.raffleEntry.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds }, status: EntryStatus.WINNER },
          _count: { _all: true },
        }),
      ]);

    interface Acc {
      totalOrders: number;
      paidOrders: number;
      totalSpent: number;
    }
    const byUser = new Map<string, Acc>();
    for (const row of grouped) {
      if (!row.userId) continue;
      const acc = byUser.get(row.userId) ?? {
        totalOrders: 0,
        paidOrders: 0,
        totalSpent: 0,
      };
      acc.totalOrders += row._count._all;
      if (row.status === OrderStatus.PAID) {
        acc.paidOrders += row._count._all;
        acc.totalSpent += row._sum.total ? Number(row._sum.total) : 0;
      }
      byUser.set(row.userId, acc);
    }

    const lastPurchasesByUser = new Map<string, Date>();
    for (const r of lastPurchasesRaw) {
      if (r.userId && r._max.createdAt) {
        lastPurchasesByUser.set(r.userId, r._max.createdAt);
      }
    }
    const raffleByUser = new Map<string, number>();
    for (const r of raffleCounts) {
      if (r.userId) raffleByUser.set(r.userId, r._count._all);
    }
    const winnerByUser = new Map<string, number>();
    for (const r of winnerCounts) {
      if (r.userId) winnerByUser.set(r.userId, r._count._all);
    }

    for (const ref of refs) {
      if (!ref.userId) {
        result.set(ref.id, this.emptyStats());
        continue;
      }
      const acc = byUser.get(ref.userId) ?? {
        totalOrders: 0,
        paidOrders: 0,
        totalSpent: 0,
      };
      result.set(ref.id, {
        totalOrders: acc.totalOrders,
        paidOrders: acc.paidOrders,
        totalSpent: acc.totalSpent,
        averageTicket:
          acc.paidOrders > 0 ? acc.totalSpent / acc.paidOrders : 0,
        raffleEntries: raffleByUser.get(ref.userId) ?? 0,
        wonRaffles: winnerByUser.get(ref.userId) ?? 0,
        lastPurchaseAt:
          lastPurchasesByUser.get(ref.userId)?.toISOString() ?? null,
      });
    }
    return result;
  }

  // ─── Detalle: historiales ──────────────────────────────────────────────

  private async recentOrders(userId: string | null) {
    if (!userId) return [];
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { _count: { select: { items: true } } },
    });
    return orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      paymentMethod: o.paymentMethod,
      total: Number(o.total),
      itemsCount: o._count.items,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  private async recentRaffleEntries(userId: string | null) {
    if (!userId) return [];
    const entries = await this.prisma.raffleEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { raffle: { select: { id: true, title: true } } },
    });
    return entries.map((e) => ({
      id: e.id,
      ticketNumber: e.ticketNumber,
      type: e.type,
      status: e.status,
      raffleId: e.raffleId,
      raffleTitle: e.raffle.title,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  private async wonPrizes(userId: string | null) {
    if (!userId) return [];
    const prizes = await this.prisma.rafflePrize.findMany({
      where: { winnerUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { raffle: { select: { id: true, title: true } } },
    });
    return prizes.map((p) => ({
      id: p.id,
      title: p.title,
      position: p.position,
      raffleId: p.raffleId,
      raffleTitle: p.raffle.title,
      winnerPublished: p.winnerPublished,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    }));
  }

  // ─── Mappers ───────────────────────────────────────────────────────────

  private toResponse(
    c: CustomerAggregate,
    stats: CustomerStatsDto,
  ): CustomerResponseDto {
    return {
      id: c.id,
      userId: c.userId,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      dni: c.dni,
      documentType: c.documentType,
      ruc: c.ruc,
      legalName: c.legalName,
      fiscalAddress: c.fiscalAddress,
      birthDate: c.birthDate ? c.birthDate.toISOString() : null,
      gender: c.gender,
      notes: c.notes,
      isMember: c.isMember,
      membershipExpiresAt: c.membershipExpiresAt
        ? c.membershipExpiresAt.toISOString()
        : null,
      active: c.active,
      primaryLocation: c.primaryLocation
        ? {
            id: c.primaryLocation.id,
            name: c.primaryLocation.name,
            slug: c.primaryLocation.slug,
          }
        : null,
      linkedUser: c.user
        ? { id: c.user.id, email: c.user.email, active: c.user.active }
        : null,
      stats,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private translateUniqueConflict(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      if (Array.isArray(target)) {
        if (target.includes('dni')) {
          return new ConflictException('Ya existe un cliente con este DNI');
        }
        if (target.includes('ruc')) {
          return new ConflictException('Ya existe un cliente con este RUC');
        }
        if (target.includes('userId')) {
          return new ConflictException(
            'Esta cuenta de usuario ya está enlazada a otro cliente',
          );
        }
        if (target.includes('email')) {
          return new ConflictException('Ya existe un cliente con este email');
        }
      }
      return new ConflictException('Ya existe un cliente con estos datos');
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
