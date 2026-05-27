import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryLocationType,
  Prisma,
  ReceiptSeriesType,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { generateUniqueSlug, slugify } from '../../common/utils/slug.util';
import { CreateInventoryLocationDto } from './dto/create-inventory-location.dto';
import { InventoryLocationQueryDto } from './dto/inventory-location-query.dto';
import { InventoryLocationResponseDto } from './dto/inventory-location-response.dto';
import { UpdateInventoryLocationDto } from './dto/update-inventory-location.dto';
import {
  InventoryLocationsRepository,
  LocationWithCount,
} from './repositories/inventory-locations.repository';

@Injectable()
export class InventoryLocationsService {
  private readonly logger = new Logger(InventoryLocationsService.name);

  constructor(
    private readonly repository: InventoryLocationsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateInventoryLocationDto,
  ): Promise<InventoryLocationResponseDto> {
    const slug = await this.resolveSlug(dto.slug, dto.name);

    try {
      const created = await this.repository.create({
        name: dto.name,
        slug,
        type: dto.type,
        address: dto.address,
        phone: dto.phone,
        active: dto.active ?? true,
      });
      this.logger.log(
        `Inventory location created ${created.id} (${created.slug}, ${created.type})`,
      );

      // Auto-provisioning enterprise: cada ubicación nueva recibe su caja
      // principal y una serie de comprobantes (BOLETA por defecto).
      // Es best-effort — los errores se loguean pero no abortan la creación
      // de la ubicación; el admin puede crear estos recursos a mano si falla.
      try {
        await this.provisionPosResources(created);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Auto-provisioning POS para ${created.slug} falló: ${msg}`,
        );
      }

      return this.toResponse({ ...created, _count: { stock: 0 } });
    } catch (error) {
      throw this.translateUniqueSlug(error);
    }
  }

  /**
   * Crea automáticamente la caja principal y la serie de comprobantes default
   * para una ubicación recién creada. Idempotente: si ya existen, no duplica.
   *
   * Reglas por tipo:
   *  - SUCURSAL  → caja física principal + serie B### (POS físico).
   *  - ECOMMERCE → SOLO serie BE0# (canal digital sin caja física).
   *  - ALMACEN   → ni caja ni serie (no opera ventas).
   */
  private async provisionPosResources(location: {
    id: string;
    name: string;
    slug: string;
    type: InventoryLocationType;
  }): Promise<void> {
    // 1) Caja principal — solo SUCURSAL física.
    if (location.type === InventoryLocationType.SUCURSAL) {
      const cashRegisterName = `Caja Principal ${location.name}`;
      const existingCash = await this.prisma.pOSCashRegister.findFirst({
        where: { inventoryLocationId: location.id, name: cashRegisterName },
        select: { id: true },
      });
      if (!existingCash) {
        await this.prisma.pOSCashRegister.create({
          data: {
            inventoryLocationId: location.id,
            name: cashRegisterName,
            active: true,
          },
        });
        this.logger.log(`Caja principal creada para ${location.slug}`);
      }
    }

    // 2) Serie de comprobantes (solo para ECOMMERCE/SUCURSAL)
    if (location.type === InventoryLocationType.ALMACEN) return;

    const series = await this.nextAvailableSeries(location.type);
    const existingSeries = await this.prisma.receiptSeries.findFirst({
      where: { inventoryLocationId: location.id, type: ReceiptSeriesType.BOLETA },
      select: { id: true },
    });
    if (!existingSeries) {
      await this.prisma.receiptSeries.create({
        data: {
          inventoryLocationId: location.id,
          type: ReceiptSeriesType.BOLETA,
          series,
          nextNumber: 1,
          active: true,
        },
      });
      this.logger.log(`Serie ${series} creada para ${location.slug}`);
    }
  }

  /**
   * Calcula la próxima serie BOLETA disponible.
   *  - ECOMMERCE: BE01, BE02, ...
   *  - SUCURSAL:  B001, B002, ...
   */
  private async nextAvailableSeries(
    type: InventoryLocationType,
  ): Promise<string> {
    if (type === InventoryLocationType.ECOMMERCE) {
      const existing = await this.prisma.receiptSeries.findMany({
        where: { series: { startsWith: 'BE' }, type: ReceiptSeriesType.BOLETA },
        select: { series: true },
      });
      const used = new Set(existing.map((e) => e.series));
      for (let i = 1; i < 100; i += 1) {
        const s = `BE${i.toString().padStart(2, '0')}`;
        if (!used.has(s)) return s;
      }
      throw new ConflictException('No hay series ecommerce disponibles');
    }

    // SUCURSAL
    const existing = await this.prisma.receiptSeries.findMany({
      where: {
        AND: [
          { series: { startsWith: 'B' } },
          { NOT: { series: { startsWith: 'BE' } } },
          { type: ReceiptSeriesType.BOLETA },
        ],
      },
      select: { series: true },
    });
    const used = new Set(existing.map((e) => e.series));
    for (let i = 1; i < 1000; i += 1) {
      const s = `B${i.toString().padStart(3, '0')}`;
      if (!used.has(s)) return s;
    }
    throw new ConflictException('No hay series de sucursal disponibles');
  }

  async update(
    id: string,
    dto: UpdateInventoryLocationDto,
  ): Promise<InventoryLocationResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Ubicación no encontrada');
    }

    let slug = existing.slug;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const normalized = slugify(dto.slug);
      if (await this.repository.slugExists(normalized, id)) {
        throw new ConflictException('Ya existe una ubicación con este slug');
      }
      slug = normalized;
    }

    try {
      const updated = await this.repository.update(id, {
        name: dto.name,
        slug,
        type: dto.type,
        address: dto.address,
        phone: dto.phone,
        active: dto.active,
      });
      return this.toResponse({ ...updated, _count: existing._count });
    } catch (error) {
      throw this.translateUniqueSlug(error);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Ubicación no encontrada');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: la ubicación tiene stock, movimientos o transferencias asociadas',
        );
      }
      throw error;
    }
  }

  async findById(id: string): Promise<InventoryLocationResponseDto> {
    const location = await this.repository.findById(id);
    if (!location) throw new NotFoundException('Ubicación no encontrada');
    return this.toResponse(location);
  }

  /**
   * Lista pública de sucursales físicas activas — pensado para el storefront
   * ("Nuestras tiendas"). NO incluye ECOMMERCE ni ALMACEN, NO requiere auth.
   */
  async findPublicStores(): Promise<InventoryLocationResponseDto[]> {
    const stores = await this.prisma.inventoryLocation.findMany({
      where: {
        active: true,
        type: InventoryLocationType.SUCURSAL,
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { stock: true } } },
    });
    return stores.map((l) => this.toResponse(l));
  }

  async findMany(
    query: InventoryLocationQueryDto,
  ): Promise<Paginated<InventoryLocationResponseDto>> {
    const where: Prisma.InventoryLocationWhereInput = {};

    if (query.type) where.type = query.type;
    if (typeof query.active === 'boolean') where.active = query.active;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const { items, total } = await this.repository.findMany({
      where,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((l) => this.toResponse(l)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  private async resolveSlug(
    candidate: string | undefined,
    name: string,
  ): Promise<string> {
    if (candidate) {
      const normalized = slugify(candidate);
      if (await this.repository.slugExists(normalized)) {
        throw new ConflictException('Ya existe una ubicación con este slug');
      }
      return normalized;
    }

    const base = slugify(name);
    if (!(await this.repository.slugExists(base))) return base;

    let attempts = 0;
    while (attempts < 5) {
      const generated = generateUniqueSlug(name);
      if (!(await this.repository.slugExists(generated))) return generated;
      attempts += 1;
    }
    throw new ConflictException('No se pudo generar un slug único');
  }

  private translateUniqueSlug(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Ya existe una ubicación con este slug');
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private toResponse(
    location: LocationWithCount,
  ): InventoryLocationResponseDto {
    return {
      id: location.id,
      name: location.name,
      slug: location.slug,
      type: location.type,
      address: location.address,
      phone: location.phone,
      active: location.active,
      productsTracked: location._count?.stock ?? 0,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }
}
