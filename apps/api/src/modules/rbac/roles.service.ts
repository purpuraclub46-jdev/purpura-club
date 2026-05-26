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
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { OFFICIAL_ROLES } from './rbac.constants';

interface RoleAggregate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: { permission: { key: string } }[];
  _count: { users: number };
}

const OFFICIAL_SLUGS = new Set<string>(Object.values(OFFICIAL_ROLES));

const slugifyRoleName = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: RoleQueryDto): Promise<Paginated<RoleResponseDto>> {
    const where: Prisma.AppRoleWhereInput = {};
    if (typeof query.active === 'boolean') where.active = query.active;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.appRole.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        include: {
          permissions: { select: { permission: { select: { key: true } } } },
          _count: { select: { users: true } },
        },
      }),
      this.prisma.appRole.count({ where }),
    ]);

    return {
      items: items.map((r) => this.toResponse(r)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async findById(id: string): Promise<RoleResponseDto> {
    const role = await this.prisma.appRole.findUnique({
      where: { id },
      include: {
        permissions: { select: { permission: { select: { key: true } } } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return this.toResponse(role);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const slug = await this.resolveSlug(dto.slug, dto.name);
    const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);

    try {
      const created = await this.prisma.appRole.create({
        data: {
          slug,
          name: dto.name,
          description: dto.description,
          active: dto.active ?? true,
          permissions: {
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
        include: {
          permissions: { select: { permission: { select: { key: true } } } },
          _count: { select: { users: true } },
        },
      });
      this.logger.log(`Rol creado ${created.id} (${created.slug})`);
      return this.toResponse(created);
    } catch (error) {
      throw this.translateUniqueSlug(error);
    }
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const existing = await this.prisma.appRole.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!existing) throw new NotFoundException('Rol no encontrado');

    const isOfficial = OFFICIAL_SLUGS.has(existing.slug);
    if (isOfficial && dto.slug !== undefined && dto.slug !== existing.slug) {
      throw new BadRequestException(
        'No se puede modificar el slug de un rol oficial del sistema',
      );
    }

    let slug = existing.slug;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      slug = slugifyRoleName(dto.slug);
      const collision = await this.prisma.appRole.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true },
      });
      if (collision) {
        throw new ConflictException('Ya existe un rol con este slug');
      }
    }

    try {
      const updateData: Prisma.AppRoleUpdateInput = {
        slug,
        name: dto.name,
        description: dto.description,
        active: dto.active,
      };

      // Si se reciben permissionKeys, se reemplaza el set por completo.
      if (dto.permissionKeys !== undefined) {
        const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);
        await this.prisma.appRolePermission.deleteMany({
          where: { roleId: id },
        });
        if (permissionIds.length > 0) {
          await this.prisma.appRolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }

      const updated = await this.prisma.appRole.update({
        where: { id },
        data: updateData,
        include: {
          permissions: { select: { permission: { select: { key: true } } } },
          _count: { select: { users: true } },
        },
      });
      return this.toResponse(updated);
    } catch (error) {
      throw this.translateUniqueSlug(error);
    }
  }

  async remove(id: string): Promise<void> {
    const role = await this.prisma.appRole.findUnique({
      where: { id },
      select: { slug: true, _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');

    if (OFFICIAL_SLUGS.has(role.slug)) {
      throw new BadRequestException(
        'No se puede eliminar un rol oficial del sistema',
      );
    }
    if (role._count.users > 0) {
      throw new ConflictException(
        'No se puede eliminar: hay usuarios asignados a este rol',
      );
    }

    try {
      await this.prisma.appRole.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Rol no encontrado');
      }
      throw error;
    }
  }

  /**
   * Asignar / sincronizar permisos de un rol. Reemplazo total por la lista.
   */
  async setPermissions(
    id: string,
    permissionKeys: string[],
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.appRole.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const permissionIds = await this.resolvePermissionIds(permissionKeys);
    await this.prisma.appRolePermission.deleteMany({ where: { roleId: id } });
    if (permissionIds.length > 0) {
      await this.prisma.appRolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return this.findById(id);
  }

  // ─── Helpers internos ──────────────────────────────────────────────────

  private async resolveSlug(
    candidate: string | undefined,
    name: string,
  ): Promise<string> {
    const base = candidate ? slugifyRoleName(candidate) : slugifyRoleName(name);
    if (!base) throw new BadRequestException('No se pudo generar un slug válido');

    const collision = await this.prisma.appRole.findFirst({
      where: { slug: base },
      select: { id: true },
    });
    if (!collision) return base;

    // Buscar variante incremental
    for (let i = 2; i < 50; i += 1) {
      const next = `${base}_${i}`;
      const found = await this.prisma.appRole.findFirst({
        where: { slug: next },
        select: { id: true },
      });
      if (!found) return next;
    }
    throw new ConflictException('No se pudo generar un slug único');
  }

  private async resolvePermissionIds(
    keys: string[] | undefined,
  ): Promise<string[]> {
    if (!keys || keys.length === 0) return [];
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true },
    });
    const found = new Set(permissions.map((p) => p.key));
    const missing = keys.filter((k) => !found.has(k));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Permisos no encontrados: ${missing.join(', ')}`,
      );
    }
    return permissions.map((p) => p.id);
  }

  private translateUniqueSlug(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Ya existe un rol con este slug');
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private toResponse(role: RoleAggregate): RoleResponseDto {
    return {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      active: role.active,
      isOfficial: OFFICIAL_SLUGS.has(role.slug),
      permissionKeys: role.permissions.map((p) => p.permission.key).sort(),
      usersCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
