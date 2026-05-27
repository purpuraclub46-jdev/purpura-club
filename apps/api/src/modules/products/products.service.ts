import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { generateUniqueSlug, slugify } from '../../common/utils/slug.util';
import { computeProductPricing } from '../../common/utils/pricing.util';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductAvailabilityInputDto } from './dto/product-availability.dto';
import {
  ProductQueryDto,
  ProductSort,
} from './dto/product-query.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductsRepository,
  ProductWithRelations,
} from './repositories/products.repository';

interface NormalizedAvailability {
  inventoryLocationId: string;
  active: boolean;
  initialStock: number;
  minimumStock: number;
}

interface ToResponseOptions {
  isMember?: boolean;
  /**
   * Restringe el cómputo de stock agregado (`inventory.totalStock` /
   * `inventory.totalReserved`) y la lista `availability` a ubicaciones
   * del canal indicado. Se usa en los endpoints públicos del storefront
   * para que NO se cuente stock de SUCURSAL/ALMACEN.
   *
   * Cuando se omite se mantiene el comportamiento histórico (todas las
   * ubicaciones), preservando admin/POS sin cambios.
   */
  stockChannelType?: 'ECOMMERCE' | 'SUCURSAL' | 'ALMACEN';
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly repository: ProductsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateProductDto,
    actorUserId?: string,
  ): Promise<ProductResponseDto> {
    this.assertDiscount(dto);

    if (await this.repository.findBySku(dto.sku)) {
      throw new ConflictException('Ya existe un producto con este SKU');
    }
    if (dto.barcode && (await this.repository.findByBarcode(dto.barcode))) {
      throw new ConflictException(
        'Ya existe un producto con este código de barras',
      );
    }

    const availability = await this.normalizeAvailability(dto.availability);

    const slug = await this.resolveSlug(dto.slug, dto.name);

    try {
      const created = await this.repository.createWithRelations({
        data: {
          name: dto.name,
          slug,
          description: dto.description ?? null,
          sku: dto.sku,
          barcode: dto.barcode ?? null,
          price: new Prisma.Decimal(dto.price),
          cost: new Prisma.Decimal(dto.cost ?? 0),
          discountPercentage:
            dto.discountPercentage !== undefined
              ? new Prisma.Decimal(dto.discountPercentage)
              : null,
          discountActive: dto.discountActive ?? false,
          discountStartsAt: dto.discountStartsAt
            ? new Date(dto.discountStartsAt)
            : null,
          discountEndsAt: dto.discountEndsAt
            ? new Date(dto.discountEndsAt)
            : null,
          featured: dto.featured ?? false,
          active: dto.active ?? true,
        },
        categoryIds: dto.categoryIds ?? [],
        images: dto.images ?? [],
        variants: dto.variants ?? [],
        availability,
        createdByUserId: actorUserId,
      });

      this.logger.log(`Product created ${created.id} (${created.slug})`);
      return this.toResponse(created);
    } catch (error) {
      throw this.translateUniqueError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Producto no encontrado');
    }

    this.assertDiscount({
      discountPercentage: dto.discountPercentage,
      discountActive: dto.discountActive,
      discountStartsAt: dto.discountStartsAt,
      discountEndsAt: dto.discountEndsAt,
    });

    if (dto.sku !== undefined && dto.sku !== existing.sku) {
      const found = await this.repository.findBySku(dto.sku);
      if (found && found.id !== id) {
        throw new ConflictException('Ya existe un producto con este SKU');
      }
    }

    if (
      dto.barcode !== undefined &&
      dto.barcode !== null &&
      dto.barcode !== existing.barcode
    ) {
      const found = await this.repository.findByBarcode(dto.barcode);
      if (found && found.id !== id) {
        throw new ConflictException(
          'Ya existe un producto con este código de barras',
        );
      }
    }

    let slug = existing.slug;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const normalized = slugify(dto.slug);
      if (await this.repository.slugExists(normalized, id)) {
        throw new ConflictException('Ya existe un producto con este slug');
      }
      slug = normalized;
    }

    const availability =
      dto.availability !== undefined
        ? (await this.normalizeAvailability(dto.availability)).map((a) => ({
            inventoryLocationId: a.inventoryLocationId,
            active: a.active,
            minimumStock: a.minimumStock,
          }))
        : undefined;

    try {
      const updated = await this.repository.updateWithRelations({
        id,
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          sku: dto.sku,
          barcode: dto.barcode,
          price:
            dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
          cost:
            dto.cost !== undefined ? new Prisma.Decimal(dto.cost) : undefined,
          discountPercentage:
            dto.discountPercentage !== undefined
              ? new Prisma.Decimal(dto.discountPercentage)
              : undefined,
          discountActive: dto.discountActive,
          discountStartsAt:
            dto.discountStartsAt !== undefined
              ? dto.discountStartsAt
                ? new Date(dto.discountStartsAt)
                : null
              : undefined,
          discountEndsAt:
            dto.discountEndsAt !== undefined
              ? dto.discountEndsAt
                ? new Date(dto.discountEndsAt)
                : null
              : undefined,
          featured: dto.featured,
          active: dto.active,
        },
        categoryIds: dto.categoryIds,
        images: dto.images,
        variants: dto.variants,
        availability,
      });

      return this.toResponse(updated);
    } catch (error) {
      throw this.translateUniqueError(error);
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
        throw new NotFoundException('Producto no encontrado');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: el producto tiene movimientos o pedidos asociados',
        );
      }
      throw error;
    }
  }

  async findById(
    id: string,
    options: ToResponseOptions = {},
  ): Promise<ProductResponseDto> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return this.toResponse(product, options);
  }

  async findBySlugPublic(
    slug: string,
    options: ToResponseOptions = {},
  ): Promise<ProductResponseDto> {
    const product = await this.repository.findBySlug(slug);
    if (!product || !product.active) {
      throw new NotFoundException('Producto no encontrado');
    }
    const hasEcommerceAvailability = product.availability.some(
      (a) => a.active && a.location.type === 'ECOMMERCE',
    );
    if (!hasEcommerceAvailability) {
      throw new NotFoundException('Producto no disponible');
    }
    return this.toResponse(product, {
      ...options,
      stockChannelType: options.stockChannelType ?? 'ECOMMERCE',
    });
  }

  async findMany(
    query: ProductQueryDto & {
      availableForType?: 'ECOMMERCE' | 'SUCURSAL' | 'ALMACEN';
      /**
       * Cuando es `true` y se pasa `categoryId`, el filtro incluye los
       * productos taggeados al `categoryId` Y a cualquier categoría
       * descendiente (toda la rama). Lo usa el catálogo público para que
       * filtrar por una categoría raíz (ej. "Joyería") muestre los productos
       * de sus subcategorías ("Anillos", "Anillos > Plata 925").
       *
       * Default `false` para preservar el comportamiento estricto del admin.
       */
      expandCategoryDescendants?: boolean;
    },
    options: ToResponseOptions = {},
  ): Promise<Paginated<ProductResponseDto>> {
    const where: Prisma.ProductWhereInput = {};

    if (typeof query.active === 'boolean') where.active = query.active;
    if (typeof query.featured === 'boolean') where.featured = query.featured;

    if (query.discounted === true) {
      // Solo productos con oferta vigente — mismo criterio que
      // `computeProductPricing.hasActive`:
      //   · discountActive = true
      //   · discountPercentage > 0
      //   · dentro de la ventana de fechas (si está definida).
      const now = new Date();
      where.discountActive = true;
      where.discountPercentage = { gt: new Prisma.Decimal(0) };
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [{ discountStartsAt: null }, { discountStartsAt: { lte: now } }],
        },
        {
          OR: [{ discountEndsAt: null }, { discountEndsAt: { gte: now } }],
        },
      ];
    }

    if (query.categoryId) {
      const ids = query.expandCategoryDescendants
        ? await this.collectCategoryDescendants(query.categoryId)
        : [query.categoryId];
      where.categories = { some: { categoryId: { in: ids } } };
    }

    if (query.inventoryLocationId) {
      where.availability = {
        some: {
          inventoryLocationId: query.inventoryLocationId,
          active: true,
        },
      };
    } else if (query.availableForType) {
      where.availability = {
        some: {
          active: true,
          location: { active: true, type: query.availableForType },
        },
      };
    }

    // Búsqueda inteligente: cuando hay `search`, resolvemos primero los IDs
    // ranqueados por trigram + unaccent y luego paginamos sobre ese set.
    // Preserva el orden de relevancia ignorando el sort solicitado (la
    // intuición de búsqueda — "lo más parecido primero" — vale más que el
    // sort en este caso).
    if (query.search && query.search.length >= 2) {
      const channelType = query.availableForType;
      const rankedIds = await this.findIdsBySearch(query.search, {
        activeOnly: query.active === true,
        channelType,
        limit: 200,
      });

      if (rankedIds.length === 0) {
        return {
          items: [],
          meta: buildPaginationMeta(0, query.page, query.limit),
        };
      }

      // Aplicamos paginación in-memory sobre la lista ranqueada.
      const offset = (query.page - 1) * query.limit;
      const pageIds = rankedIds.slice(offset, offset + query.limit);
      const total = rankedIds.length;

      // Recompilamos el where con id-IN preservando los demás filtros
      // (category, availability, etc) — Postgres intersecta ambos sets.
      where.id = { in: pageIds };

      const { items } = await this.repository.findMany({
        where,
        orderBy: this.toOrderBy(query.sort),
        page: 1,
        limit: query.limit,
      });

      // Reordenamos según el ranking trigram (Postgres pierde el orden
      // dentro de un IN, así que ordenamos client-side).
      const rankIndex = new Map(pageIds.map((id, i) => [id, i]));
      const sortedItems = [...items].sort(
        (a, b) => (rankIndex.get(a.id) ?? 0) - (rankIndex.get(b.id) ?? 0),
      );

      return {
        items: sortedItems.map((p) => this.toResponse(p, options)),
        meta: buildPaginationMeta(total, query.page, query.limit),
      };
    }

    const { items, total } = await this.repository.findMany({
      where,
      orderBy: this.toOrderBy(query.sort),
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((p) => this.toResponse(p, options)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  /**
   * Selección aleatoria de productos disponibles en el canal ECOMMERCE.
   * Pensada para el "showcase curado" del home — cada request devuelve un
   * subset distinto. `RANDOM()` de Postgres distribuye uniformemente entre
   * todas las categorías, así que con N suficientemente grande (>= 10) la
   * mezcla entre joyas y perfumes es natural.
   *
   * El `EXISTS` garantiza que el producto está marcado como activo en una
   * `InventoryLocation` ECOMMERCE también activa — la misma regla que aplica
   * `findMany` para el catálogo público.
   */
  async findRandomForHome(
    limit: number,
    options: ToResponseOptions = {},
  ): Promise<ProductResponseDto[]> {
    const cappedLimit = Math.max(1, Math.min(30, limit));

    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM products p
      WHERE p.active = true
        AND EXISTS (
          SELECT 1
          FROM product_availability pa
          INNER JOIN inventory_locations l
            ON l.id = pa."inventoryLocationId"
          WHERE pa."productId" = p.id
            AND pa.active = true
            AND l.active = true
            AND l.type = 'ECOMMERCE'
        )
      ORDER BY random()
      LIMIT ${cappedLimit}
    `;

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const products = await this.repository.findManyByIds(ids);

    // Postgres pierde el orden del set dentro de `IN`. Re-ordenamos según
    // el ranking aleatorio original para que la respuesta refleje el orden
    // determinado por `random()`.
    const rankIndex = new Map(ids.map((id, i) => [id, i]));
    products.sort(
      (a, b) => (rankIndex.get(a.id) ?? 0) - (rankIndex.get(b.id) ?? 0),
    );

    return products.map((p) =>
      this.toResponse(p, {
        ...options,
        stockChannelType: options.stockChannelType ?? 'ECOMMERCE',
      }),
    );
  }

  // ─── Smart search ──────────────────────────────────────────────────────

  /**
   * Cache de capacidad: la primera llamada a `findIdsBySearch` chequea si
   * las extensiones `pg_trgm` + `unaccent` y la helper `f_unaccent()` están
   * disponibles (las trae la migración `20260526150000_search_fuzzy_...`).
   * Si la migración aún no se aplicó, hacemos fallback gradeado a un
   * `lower(...) ILIKE` puro — pierde tolerancia a tildes y typos pero
   * mantiene la búsqueda funcionando (no rompe el storefront).
   *
   * El valor se cachea por instancia del service (no se renueva en runtime
   * porque applying una migración requiere bounce del proceso).
   */
  private smartSearchAvailable: boolean | null = null;

  private async checkSmartSearchAvailability(): Promise<boolean> {
    if (this.smartSearchAvailable !== null) return this.smartSearchAvailable;
    try {
      const result = await this.prisma.$queryRaw<[{ exists: boolean }]>`
        SELECT to_regprocedure('public.f_unaccent(text)') IS NOT NULL AS exists
      `;
      this.smartSearchAvailable = result[0]?.exists ?? false;
    } catch {
      this.smartSearchAvailable = false;
    }
    if (!this.smartSearchAvailable) {
      this.logger.warn(
        'Smart search (pg_trgm + unaccent) no está activo en la BD. ' +
          'La búsqueda usa fallback simple (lower + ILIKE). ' +
          'Para habilitar fuzzy/tildes: `cd apps/api && npx prisma migrate deploy`.',
      );
    } else {
      this.logger.log('Smart search (pg_trgm + unaccent) activo.');
    }
    return this.smartSearchAvailable;
  }

  /**
   * Resuelve IDs de productos ranqueados por relevancia para `q`.
   * Busca en: nombre, SKU, slug de producto y nombre de categorías
   * asignadas. Aplica filtros canónicos: `active=true` (opcional) y
   * disponibilidad en canal (`ECOMMERCE` por default desde el controller
   * público).
   *
   * Estrategia:
   *   · Si extensiones disponibles → trigram similarity + ILIKE +
   *     unaccent (tolerante a typos y tildes), ranking por score.
   *   · Si no → lower() + ILIKE (case-insensitive + parcial),
   *     ranking por prefix + featured + nombre.
   *
   * Ambos caminos hacen GROUP BY para deduplicar (el JOIN con categorías
   * multiplicaría filas) y devuelven hasta `limit` IDs.
   */
  private async findIdsBySearch(
    q: string,
    opts: {
      activeOnly?: boolean;
      channelType?: 'ECOMMERCE' | 'SUCURSAL' | 'ALMACEN';
      limit?: number;
    } = {},
  ): Promise<string[]> {
    const limit = Math.max(1, Math.min(opts.limit ?? 200, 500));
    const activeOnly = opts.activeOnly ?? false;
    const channelType = opts.channelType;
    const smart = await this.checkSmartSearchAvailability();

    type Row = { id: string };

    // Predicados compartidos por ambas estrategias — se cachean en
    // SQL fragments para no repetirlos.
    const activePred = activeOnly
      ? Prisma.sql`AND p.active = true`
      : Prisma.empty;
    const channelPred = channelType
      ? Prisma.sql`AND EXISTS (
          SELECT 1
          FROM product_availability pa
          JOIN inventory_locations il
            ON il.id = pa."inventoryLocationId"
          WHERE pa."productId" = p.id
            AND pa.active = true
            AND il.active = true
            AND il.type::text = ${channelType}
        )`
      : Prisma.empty;
    // Match por categoría — se aísla en EXISTS para no inflar filas con JOIN.
    // Prisma sólo mapea nombres de TABLA con @@map; las columnas siguen siendo
    // los nombres exactos del schema (camelCase) y Postgres exige doble comilla.
    //
    // Walkamos 3 niveles de la jerarquía (root > sub > leaf, máximo del schema)
    // para que buscar "joyas" matchee productos de la rama completa aunque
    // estén asignados a categorías hojas tipo "Collares Plata".
    const categoryMatch = (
      buildMatch: (col: Prisma.Sql) => Prisma.Sql,
    ) => Prisma.sql`
      EXISTS (
        SELECT 1
        FROM product_categories pc
        JOIN categories c0 ON c0.id = pc."categoryId"
        LEFT JOIN categories c1 ON c1.id = c0."parentId"
        LEFT JOIN categories c2 ON c2.id = c1."parentId"
        WHERE pc."productId" = p.id
          AND c0.active = true
          AND (
            ${buildMatch(Prisma.sql`c0.name`)}
            OR (c1.id IS NOT NULL AND ${buildMatch(Prisma.sql`c1.name`)})
            OR (c2.id IS NOT NULL AND ${buildMatch(Prisma.sql`c2.name`)})
          )
      )
    `;

    if (smart) {
      const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT p.id
        FROM products p
        WHERE 1=1
          ${activePred}
          ${channelPred}
          AND (
            public.f_unaccent(lower(p.name)) % public.f_unaccent(lower(${q}))
            OR public.f_unaccent(lower(p.name)) ILIKE '%' || public.f_unaccent(lower(${q})) || '%'
            OR public.f_unaccent(lower(p.sku))  ILIKE '%' || public.f_unaccent(lower(${q})) || '%'
            OR public.f_unaccent(lower(p.slug)) ILIKE '%' || public.f_unaccent(lower(${q})) || '%'
            OR ${categoryMatch((col) => Prisma.sql`(
                public.f_unaccent(lower(${col})) ILIKE '%' || public.f_unaccent(lower(${q})) || '%'
                OR public.f_unaccent(lower(${col})) % public.f_unaccent(lower(${q}))
              )`)}
          )
        ORDER BY
          GREATEST(
            similarity(public.f_unaccent(lower(p.name)), public.f_unaccent(lower(${q}))),
            similarity(public.f_unaccent(lower(p.sku)),  public.f_unaccent(lower(${q}))) * 0.7,
            CASE WHEN public.f_unaccent(lower(p.name)) ILIKE public.f_unaccent(lower(${q})) || '%' THEN 1.0 ELSE 0 END,
            CASE WHEN public.f_unaccent(lower(p.sku))  = public.f_unaccent(lower(${q})) THEN 1.0 ELSE 0 END,
            CASE WHEN public.f_unaccent(lower(p.slug)) ILIKE public.f_unaccent(lower(${q})) || '%' THEN 0.9 ELSE 0 END
          ) DESC,
          p.featured DESC,
          p.name ASC
        LIMIT ${limit}
      `);
      return rows.map((r) => r.id);
    }

    // Fallback sin extensiones — case-insensitive con lower(), pero sin tildes ni typos.
    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT p.id
      FROM products p
      WHERE 1=1
        ${activePred}
        ${channelPred}
        AND (
          lower(p.name) ILIKE '%' || lower(${q}) || '%'
          OR lower(p.sku)  ILIKE '%' || lower(${q}) || '%'
          OR lower(p.slug) ILIKE '%' || lower(${q}) || '%'
          OR ${categoryMatch((col) => Prisma.sql`lower(${col}) ILIKE '%' || lower(${q}) || '%'`)}
        )
      ORDER BY
        CASE WHEN lower(p.name) ILIKE lower(${q}) || '%' THEN 1 ELSE 0 END DESC,
        CASE WHEN lower(p.sku)  = lower(${q})              THEN 1 ELSE 0 END DESC,
        p.featured DESC,
        p.name ASC
      LIMIT ${limit}
    `);
    return rows.map((r) => r.id);
  }

  private toOrderBy(
    sort: ProductSort,
  ): Prisma.ProductOrderByWithRelationInput {
    const [field, direction] = sort.split(':') as [string, 'asc' | 'desc'];
    return { [field]: direction } as Prisma.ProductOrderByWithRelationInput;
  }

  /**
   * Devuelve `[rootId, ...descendientes activos]` recorriendo el árbol de
   * categorías por BFS en memoria. Se hace en una sola query (todas las
   * categorías activas, solo `id`+`parentId`). El catálogo de categorías es
   * pequeño y este método se llama una vez por request público; si el
   * volumen crece se puede meter cache TTL aquí.
   *
   * `rootId` se incluye siempre, aunque la categoría esté inactiva, para
   * respetar la intención del caller; los descendientes se filtran a
   * `active=true` para no leakear ramas archivadas.
   */
  private async collectCategoryDescendants(rootId: string): Promise<string[]> {
    const active = await this.prisma.category.findMany({
      where: { active: true },
      select: { id: true, parentId: true },
    });

    const childrenByParent = new Map<string, string[]>();
    for (const cat of active) {
      if (!cat.parentId) continue;
      const arr = childrenByParent.get(cat.parentId) ?? [];
      arr.push(cat.id);
      childrenByParent.set(cat.parentId, arr);
    }

    const result: string[] = [rootId];
    const queue: string[] = [rootId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const children = childrenByParent.get(id);
      if (!children) continue;
      for (const childId of children) {
        result.push(childId);
        queue.push(childId);
      }
    }
    return result;
  }

  private async resolveSlug(
    candidate: string | undefined,
    name: string,
  ): Promise<string> {
    if (candidate) {
      const normalized = slugify(candidate);
      if (await this.repository.slugExists(normalized)) {
        throw new ConflictException('Ya existe un producto con este slug');
      }
      return normalized;
    }

    const base = slugify(name);
    if (!(await this.repository.slugExists(base))) {
      return base;
    }

    let attempts = 0;
    while (attempts < 5) {
      const generated = generateUniqueSlug(name);
      if (!(await this.repository.slugExists(generated))) {
        return generated;
      }
      attempts += 1;
    }

    throw new ConflictException('No se pudo generar un slug único');
  }

  private assertDiscount(input: {
    discountPercentage?: number | null;
    discountActive?: boolean;
    discountStartsAt?: string | null;
    discountEndsAt?: string | null;
  }): void {
    const {
      discountPercentage,
      discountActive,
      discountStartsAt,
      discountEndsAt,
    } = input;

    if (
      discountActive === true &&
      (discountPercentage === undefined ||
        discountPercentage === null ||
        discountPercentage <= 0)
    ) {
      throw new BadRequestException(
        'Para activar la oferta debes indicar un porcentaje mayor a 0',
      );
    }

    if (discountStartsAt && discountEndsAt) {
      const start = new Date(discountStartsAt);
      const end = new Date(discountEndsAt);
      if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
        if (start > end) {
          throw new BadRequestException(
            'La fecha de inicio de la oferta no puede ser posterior a la fecha de fin',
          );
        }
      }
    }
  }

  private async normalizeAvailability(
    input?: ProductAvailabilityInputDto[],
  ): Promise<NormalizedAvailability[]> {
    if (!input || input.length === 0) return [];

    const byLocation = new Map<string, NormalizedAvailability>();
    for (const item of input) {
      const existing = byLocation.get(item.inventoryLocationId);
      const normalized: NormalizedAvailability = {
        inventoryLocationId: item.inventoryLocationId,
        active: item.active ?? true,
        initialStock: item.initialStock ?? 0,
        minimumStock: item.minimumStock ?? 0,
      };
      byLocation.set(item.inventoryLocationId, {
        ...existing,
        ...normalized,
      });
    }

    const ids = Array.from(byLocation.keys());
    const locations = await this.prisma.inventoryLocation.findMany({
      where: { id: { in: ids } },
      select: { id: true, active: true, name: true },
    });
    const foundIds = new Set(locations.map((l) => l.id));

    for (const id of ids) {
      if (!foundIds.has(id)) {
        throw new BadRequestException(
          `Ubicación de inventario no encontrada: ${id}`,
        );
      }
    }
    for (const loc of locations) {
      if (!loc.active) {
        throw new BadRequestException(
          `La ubicación "${loc.name}" no está activa`,
        );
      }
    }

    return Array.from(byLocation.values());
  }

  private translateUniqueError(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[] | undefined)?.join(', ');
      return new ConflictException(
        target
          ? `Ya existe un producto con el mismo valor en: ${target}`
          : 'Conflicto de unicidad en el producto',
      );
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private decimalToNumber(value: Prisma.Decimal | number | string): number {
    if (value instanceof Prisma.Decimal) return value.toNumber();
    return Number(value);
  }

  private toResponse(
    product: ProductWithRelations,
    options: ToResponseOptions = {},
  ): ProductResponseDto {
    const stockByLocation = new Map(
      product.stock.map((s) => [s.inventoryLocationId, s]),
    );

    // Cuando el caller pide aislar el canal (ej. ECOMMERCE para el storefront)
    // restringimos el agregado y la lista de availability a ubicaciones de
    // ese tipo que además estén activas. Si el caller no lo pide (admin/POS),
    // el comportamiento histórico queda intacto.
    const channelType = options.stockChannelType;
    const channelLocationIds = channelType
      ? new Set(
          product.availability
            .filter((a) => a.active && a.location.type === channelType)
            .map((a) => a.inventoryLocationId),
        )
      : null;

    const stockEntries = channelLocationIds
      ? product.stock.filter((s) =>
          channelLocationIds.has(s.inventoryLocationId),
        )
      : product.stock;

    const totalStock = stockEntries.reduce((sum, inv) => sum + inv.stock, 0);
    const totalReserved = stockEntries.reduce(
      (sum, inv) => sum + inv.reservedStock,
      0,
    );

    const pricing = computeProductPricing(
      {
        price: product.price,
        discountPercentage: product.discountPercentage,
        discountActive: product.discountActive,
        discountStartsAt: product.discountStartsAt,
        discountEndsAt: product.discountEndsAt,
      },
      { isMember: options.isMember ?? false },
    );

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      price: pricing.price,
      cost: this.decimalToNumber(product.cost),
      discountPercentage: pricing.discountPercentage,
      discountActive: pricing.discountActive,
      discountStartsAt: product.discountStartsAt,
      discountEndsAt: product.discountEndsAt,
      salePrice: pricing.salePrice,
      memberPrice: pricing.memberPrice,
      finalPrice: pricing.finalPrice,
      featured: product.featured,
      active: product.active,
      images: product.images.map((img) => ({
        id: img.id,
        url: img.url,
        order: img.order,
      })),
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        value: v.value,
      })),
      categories: product.categories.map((rel) => ({
        id: rel.category.id,
        name: rel.category.name,
        slug: rel.category.slug,
      })),
      availability: product.availability
        .filter((a) =>
          channelLocationIds
            ? channelLocationIds.has(a.inventoryLocationId)
            : true,
        )
        .map((a) => {
          const inv = stockByLocation.get(a.inventoryLocationId);
          return {
            inventoryLocationId: a.inventoryLocationId,
            locationName: a.location.name,
            locationSlug: a.location.slug,
            locationType: a.location.type,
            active: a.active,
            stock: inv?.stock ?? 0,
            minimumStock: inv?.minimumStock ?? 0,
          };
        }),
      inventory: {
        totalStock,
        totalReserved,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
