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
import { BranchQueryDto } from './dto/branch-query.dto';
import { BranchResponseDto } from './dto/branch-response.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import {
  BranchWithCount,
  BranchesRepository,
} from './repositories/branches.repository';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(private readonly repository: BranchesRepository) {}

  async create(dto: CreateBranchDto): Promise<BranchResponseDto> {
    const slug = await this.resolveSlug(dto.slug, dto.name);

    try {
      const created = await this.repository.create({
        name: dto.name,
        slug,
        address: dto.address,
        phone: dto.phone,
        active: dto.active ?? true,
      });
      this.logger.log(`Branch created ${created.id} (${created.slug})`);
      return this.toResponse({ ...created, _count: { inventory: 0 } });
    } catch (error) {
      throw this.translateUniqueSlug(error);
    }
  }

  async update(
    id: string,
    dto: UpdateBranchDto,
  ): Promise<BranchResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    let slug = existing.slug;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const normalized = slugify(dto.slug);
      if (await this.repository.slugExists(normalized, id)) {
        throw new ConflictException('Ya existe una sucursal con este slug');
      }
      slug = normalized;
    }

    try {
      const updated = await this.repository.update(id, {
        name: dto.name,
        slug,
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
        throw new NotFoundException('Sucursal no encontrada');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: la sucursal tiene inventario o pedidos asociados',
        );
      }
      throw error;
    }
  }

  async findById(id: string): Promise<BranchResponseDto> {
    const branch = await this.repository.findById(id);
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return this.toResponse(branch);
  }

  async findMany(
    query: BranchQueryDto,
  ): Promise<Paginated<BranchResponseDto>> {
    const where: Prisma.BranchWhereInput = {};

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
      items: items.map((b) => this.toResponse(b)),
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
        throw new ConflictException('Ya existe una sucursal con este slug');
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

  private translateUniqueSlug(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Ya existe una sucursal con este slug');
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private toResponse(branch: BranchWithCount): BranchResponseDto {
    return {
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      address: branch.address,
      phone: branch.phone,
      active: branch.active,
      productsTracked: branch._count?.inventory ?? 0,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }
}
