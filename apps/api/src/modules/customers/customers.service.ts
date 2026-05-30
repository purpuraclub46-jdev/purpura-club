import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { APP_CONFIG_KEY, AppConfig } from '../../config/app.config';
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
import {
  DedupeCandidateByDniDto,
  DedupeCandidateByEmailDto,
  DedupeCandidatesResponseDto,
} from './dto/dedupe-candidates-response.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const CUSTOMER_INCLUDE = Prisma.validator<Prisma.CustomerInclude>()({
  primaryLocation: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, email: true, active: true } },
});

type CustomerAggregate = Prisma.CustomerGetPayload<{
  include: typeof CUSTOMER_INCLUDE;
}>;

const SUPER_ADMIN_SLUG = 'super_admin';

// Cap para dedupe-candidates — evita respuestas excesivas en DBs grandes.
const DEDUPE_CANDIDATES_CAP = 100;

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * FASE 1 / D5 — Lectura del feature flag CUSTOMER_AUTO_LINK_BY_DNI.
   *
   * Permite desactivar el auto-link sin redeploy si se detecta un
   * problema operativo (ej. cajeros confundidos por linkeos silenciosos).
   * Default: true.
   */
  private isAutoLinkByDniEnabled(): boolean {
    const appConfig = this.configService.get<AppConfig>(APP_CONFIG_KEY);
    return appConfig?.customerAutoLinkByDni ?? true;
  }

  /**
   * FASE 1 / D5 — Audit trail estructurado para operaciones de
   * vinculación Customer ↔ User.
   *
   * Emite un JSON line con el prefijo `[customer.audit]` para que
   * sea ingestible por cualquier log aggregator (Datadog, Loki,
   * CloudWatch). Campos: action, actorId, actorEmail, actorRole,
   * customerId, userId, source, meta, timestamp.
   *
   * ROADMAP FASE 1.5 / FASE 2:
   *   Promover a modelo persistente `CustomerLinkAuditLog` en
   *   schema.prisma con campos {id, action, actorId, customerId,
   *   userId, payload, createdAt}. Por ahora structured logging
   *   cumple los requisitos de auditoría externa (decisión aprobada).
   */
  private emitAudit(event: {
    action:
      | 'customer.auto_link_by_dni'
      | 'customer.manual_link'
      | 'customer.dedupe_candidates_read';
    actor: AuthenticatedUser;
    customerId: string | null;
    userId: string | null;
    source: string;
    meta?: Record<string, unknown>;
  }): void {
    const payload = {
      audit: true,
      action: event.action,
      actorId: event.actor.id,
      actorEmail: event.actor.email,
      actorRole: event.actor.role,
      customerId: event.customerId,
      userId: event.userId,
      source: event.source,
      meta: event.meta ?? null,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[customer.audit] ${JSON.stringify(payload)}`);
  }

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

    // ─── FASE 1 / D5 — Auto-link por DNI ──────────────────────────────
    //
    // Si el admin/cajero está creando un Customer con DNI provisto y SIN
    // userId explícito, buscamos un User huérfano (sin customerProfile)
    // con mismo DNI. Si existe, auto-asignamos `dto.userId` antes de
    // continuar — el resto del flujo (validate, create) lo procesa
    // normalmente.
    //
    // Beneficio: cuando un walk-in capturado en POS hace tiempo se
    // registró luego en ecommerce, este crear-Customer manual lo
    // vincula a su cuenta sin requerir acción adicional del admin.
    //
    // Política aprobada FASE 0.5: SOLO match por DNI. NO email/phone.
    // Feature flag CUSTOMER_AUTO_LINK_BY_DNI permite desactivar sin
    // redeploy.
    let autoLinkedUserId: string | null = null;
    if (this.isAutoLinkByDniEnabled() && dto.dni && !dto.userId) {
      const orphanUser = await this.prisma.user.findFirst({
        where: { dni: dto.dni, customerProfile: null },
        select: { id: true, email: true },
      });
      if (orphanUser) {
        dto.userId = orphanUser.id;
        // Si el dto no traía email pero el User sí, copiar — el User es
        // source-of-truth para email de login. Si el dto sí trae email
        // (admin lo capturó), respetamos esa decisión.
        if (!dto.email && orphanUser.email) {
          dto.email = orphanUser.email;
        }
        autoLinkedUserId = orphanUser.id;
        // Audit emitido tras crear el Customer (para incluir customerId).
      }
    }

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

      // FASE 1 / D5 — Audit trail si hubo auto-link por DNI.
      if (autoLinkedUserId) {
        this.emitAudit({
          action: 'customer.auto_link_by_dni',
          actor,
          customerId: created.id,
          userId: autoLinkedUserId,
          source: 'customers.create',
          meta: { dni: dto.dni },
        });
      }

      return this.toResponse(created, this.emptyStats());
    } catch (error) {
      throw this.translateUniqueConflict(error);
    }
  }

  // ─── FASE 1 / D5 — Vinculación manual Customer ↔ User ──────────────────

  /**
   * Vincula manualmente un Customer huérfano con un User existente.
   *
   * Solo accesible vía `POST /customers/:id/link-user` (guards en
   * controller: customers.edit + users.view). Caso de uso: el admin
   * descubre que un walk-in capturado en POS ya tenía cuenta ecommerce
   * con mismo DNI.
   *
   * Validaciones (todas en una TX):
   *   - Customer debe existir.
   *   - Customer NO debe tener `userId` previo (no relinkar — sería
   *     pisar la relación existente). Devuelve 409.
   *   - User debe existir.
   *   - User NO debe tener `customerProfile` previo (no robar Customer
   *     del User). Devuelve 409.
   *   - Si Customer Y User tienen DNI distintos → 409 (anti-typo).
   *
   * Audit trail: emite `customer.manual_link` con actorId/actorRole/
   * customerId/userId/timestamp.
   */
  async linkUser(
    customerId: string,
    userId: string,
    actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        include: CUSTOMER_INCLUDE,
      });
      if (!customer) {
        throw new NotFoundException('Cliente no encontrado');
      }
      // Scope de sucursal: el admin solo puede vincular Customers a los
      // que tiene acceso. SUPER_ADMIN bypasses.
      this.assertLocationAccess(customer.primaryLocationId, actor);

      if (customer.userId) {
        throw new ConflictException(
          'Este cliente ya está vinculado a una cuenta',
        );
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          dni: true,
          customerProfile: { select: { id: true } },
        },
      });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (user.customerProfile) {
        throw new ConflictException(
          'El usuario ya tiene un cliente asociado',
        );
      }

      // Anti-typo: si ambos tienen DNI y difieren, bloquear.
      if (customer.dni && user.dni && customer.dni !== user.dni) {
        throw new ConflictException(
          'Los DNIs del cliente y del usuario no coinciden',
        );
      }

      // DEUDA TÉCNICA documentada para FASE 1.5:
      //
      // Si entre el `findUnique` de Customer y este `update` el record
      // es eliminado por otra request (race extremadamente improbable),
      // Prisma lanza P2025 (record not found) — actualmente se propaga
      // como 500 a través del filtro global de excepciones.
      //
      // ROADMAP FASE 1.5: capturar P2025 acá y traducir a una excepción
      // de dominio específica (`CustomerLinkRaceConditionException`)
      // que el filtro global mapee a 409 ConflictException con mensaje
      // operacional claro ("El cliente fue modificado por otra sesión,
      // recarga e intenta de nuevo"). Aprobado como deuda no bloqueante
      // en D6 — el flujo P2025 es muy improbable en práctica.
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          userId: user.id,
          // Fill defensive: si Customer no tenía DNI pero User sí, copiar.
          // Mismo para email.
          dni: customer.dni ?? user.dni ?? null,
          email: customer.email ?? user.email ?? null,
        },
        include: CUSTOMER_INCLUDE,
      });

      return updated;
    });

    // Audit fuera de TX — el commit ya pasó, el evento refleja realidad.
    this.emitAudit({
      action: 'customer.manual_link',
      actor,
      customerId,
      userId,
      source: 'customers.linkUser',
    });

    const stats = await this.computeStats(result.id, result.userId);
    return this.toResponse(result, stats);
  }

  // ─── FASE 1 / D5 — Dedupe candidates (SUPER_ADMIN) ─────────────────────

  /**
   * Lista candidatos a dedupe Customer ↔ User para gobierno de datos.
   *
   * SOLO SUPER_ADMIN (defense-in-depth: el guard del controller ya lo
   * restringe, pero también verificamos acá por si el guard se omite
   * por bug futuro).
   *
   * Devuelve dos listas:
   *   - `candidatesByDni`: pares User huérfano + Customer huérfano con
   *     mismo DNI. AUTO-LINKABLES vía POST /customers/:id/link-user.
   *   - `candidatesByEmail`: pares con mismo email (informativo — el
   *     admin debe verificar manualmente que es la misma persona).
   *
   * Cap: DEDUPE_CANDIDATES_CAP (100) por categoría. El campo
   * `meta.capped` indica si hubo truncamiento.
   *
   * NOTA: Customer.dni @unique impide duplicate Customers con mismo DNI,
   * por lo que no exponemos "duplicateDnis" (no debería ocurrir).
   */
  async findDedupeCandidates(
    actor: AuthenticatedUser,
  ): Promise<DedupeCandidatesResponseDto> {
    // Defense-in-depth: incluso si el guard SUPER_ADMIN falla, el service
    // rechaza. NO leak de información.
    if (!this.isSuperAdmin(actor)) {
      throw new ForbiddenException(
        'Solo SUPER_ADMIN puede consultar candidatos de dedupe',
      );
    }

    // Audit del acceso a esta operación sensible.
    this.emitAudit({
      action: 'customer.dedupe_candidates_read',
      actor,
      customerId: null,
      userId: null,
      source: 'customers.findDedupeCandidates',
    });

    // 1. Cargar Users huérfanos (sin customerProfile) con DNI.
    //    +1 al cap para detectar truncamiento.
    const orphanUsers = await this.prisma.user.findMany({
      where: { dni: { not: null }, customerProfile: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dni: true,
      },
      take: DEDUPE_CANDIDATES_CAP + 1,
    });

    // 2. Cargar Customers huérfanos (sin userId).
    const orphanCustomers = await this.prisma.customer.findMany({
      where: { userId: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        dni: true,
      },
      take: DEDUPE_CANDIDATES_CAP * 2, // un User puede no matchear, cargar más Customers
    });

    const usersWithDni = orphanUsers.filter((u): u is typeof u & { dni: string } => !!u.dni);
    const usersByDni = new Map(usersWithDni.map((u) => [u.dni, u]));
    const usersByEmail = new Map(
      orphanUsers
        .filter((u): u is typeof u & { email: string } => !!u.email)
        .map((u) => [u.email.toLowerCase(), u]),
    );

    const candidatesByDni: DedupeCandidateByDniDto[] = [];
    const candidatesByEmail: DedupeCandidateByEmailDto[] = [];

    for (const customer of orphanCustomers) {
      if (candidatesByDni.length >= DEDUPE_CANDIDATES_CAP) break;
      if (!customer.dni) continue;
      const matchedUser = usersByDni.get(customer.dni);
      if (!matchedUser) continue;
      candidatesByDni.push({
        customerId: customer.id,
        customerFullName: customer.fullName,
        matchedDni: customer.dni,
        userId: matchedUser.id,
        userEmail: matchedUser.email,
        userFirstName: matchedUser.firstName,
        userLastName: matchedUser.lastName,
      });
    }

    for (const customer of orphanCustomers) {
      if (candidatesByEmail.length >= DEDUPE_CANDIDATES_CAP) break;
      if (!customer.email) continue;
      const matchedUser = usersByEmail.get(customer.email.toLowerCase());
      if (!matchedUser) continue;
      // Evitar duplicar si ya está en candidatesByDni
      if (candidatesByDni.some((c) => c.customerId === customer.id)) continue;
      candidatesByEmail.push({
        customerId: customer.id,
        customerFullName: customer.fullName,
        matchedEmail: customer.email,
        userId: matchedUser.id,
        userFirstName: matchedUser.firstName,
        userLastName: matchedUser.lastName,
      });
    }

    return {
      candidatesByDni,
      candidatesByEmail,
      meta: {
        capped:
          orphanUsers.length > DEDUPE_CANDIDATES_CAP ||
          candidatesByDni.length >= DEDUPE_CANDIDATES_CAP ||
          candidatesByEmail.length >= DEDUPE_CANDIDATES_CAP,
        capLimit: DEDUPE_CANDIDATES_CAP,
      },
    };
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
