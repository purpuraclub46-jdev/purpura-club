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
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  CategoriesRepository,
  CategoryWithCount,
} from './repositories/categories.repository';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly repository: CategoriesRepository) {}

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const slug = await this.resolveSlug(dto.slug, dto.name);

    try {
      const created = await this.repository.create({
        name: dto.name,
        slug,
        image: dto.image,
        group: dto.group,
        order: dto.order ?? 0,
        active: dto.active ?? true,
      });

      this.logger.log(`Category created ${created.id} (${created.slug})`);
      return this.toResponse({ ...created, _count: { products: 0 } });
    } catch (error) {
      throw this.translateUniqueSlug(error);
    }
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }

    let slug = existing.slug;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const normalized = slugify(dto.slug);
      if (await this.repository.slugExists(normalized, id)) {
        throw new ConflictException('Ya existe una categoría con este slug');
      }
      slug = normalized;
    }

    try {
      const updated = await this.repository.update(id, {
        name: dto.name,
        slug,
        image: dto.image,
        group: dto.group,
        order: dto.order,
        active: dto.active,
      });
      return this.toResponse({
        ...updated,
        _count: existing._count,
      });
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
        throw new NotFoundException('Categoría no encontrada');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.repository.findById(id);
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return this.toResponse(category);
  }

  async findMany(
    query: CategoryQueryDto,
  ): Promise<Paginated<CategoryResponseDto>> {
    const where: Prisma.CategoryWhereInput = {};

    if (query.group) where.group = query.group;
    if (typeof query.active === 'boolean') where.active = query.active;
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const { items, total } = await this.repository.findMany({
      where,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((c) => this.toResponse(c)),
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
        throw new ConflictException('Ya existe una categoría con este slug');
      }
      return normalized;
    }

    let attempts = 0;
    while (attempts < 5) {
      const generated =
        attempts === 0 ? slugify(name) : generateUniqueSlug(name);
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
      return new ConflictException('Ya existe una categoría con este slug');
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private toResponse(category: CategoryWithCount): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      group: category.group,
      order: category.order,
      active: category.active,
      productsCount: category._count?.products ?? 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
