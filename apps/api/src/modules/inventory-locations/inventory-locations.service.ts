import {
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

  constructor(private readonly repository: InventoryLocationsRepository) {}

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
      return this.toResponse({ ...created, _count: { stock: 0 } });
    } catch (error) {
      throw this.translateUniqueSlug(error);
    }
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
