import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role as AccessLevel } from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PasswordHelper } from '../auth/helpers/password.helper';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OFFICIAL_ROLES,
  ROLE_SLUG_TO_LEGACY,
  type OfficialRoleSlug,
} from '../rbac/rbac.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';

const USER_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  dni: true,
  role: true,
  active: true,
  lastLoginAt: true,
  inventoryLocationId: true,
  createdAt: true,
  updatedAt: true,
  inventoryLocation: { select: { id: true, name: true, slug: true } },
  roles: {
    select: {
      role: {
        select: { id: true, slug: true, name: true, active: true },
      },
    },
  },
  customPermissions: {
    select: {
      allowed: true,
      permission: { select: { key: true } },
    },
  },
});

type UserAggregate = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHelper: PasswordHelper,
  ) {}

  // ─── Read ──────────────────────────────────────────────────────────────

  async findMany(query: UserQueryDto): Promise<Paginated<UserResponseDto>> {
    const where: Prisma.UserWhereInput = {};

    if (typeof query.active === 'boolean') where.active = query.active;
    if (query.inventoryLocationId) {
      where.inventoryLocationId = query.inventoryLocationId;
    }
    if (query.roleSlug) {
      where.roles = { some: { role: { slug: query.roleSlug } } };
    }
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { dni: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
        select: USER_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => this.toResponse(u)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toResponse(user);
  }

  // ─── Mutations ─────────────────────────────────────────────────────────

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.ensureEmailAvailable(dto.email);
    if (dto.dni) await this.ensureDniAvailable(dto.dni);
    const roleIds = await this.resolveRoleIds(dto.roleIds);

    if (
      dto.inventoryLocationId !== undefined &&
      dto.inventoryLocationId !== null
    ) {
      await this.ensureLocationExists(dto.inventoryLocationId);
    }

    const passwordHash = await this.passwordHelper.hash(dto.password);
    const accessLevel = await this.deriveAccessLevel(roleIds);

    try {
      const created = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dni: dto.dni ?? null,
          inventoryLocationId: dto.inventoryLocationId ?? null,
          active: dto.active ?? true,
          role: accessLevel,
          roles: {
            create: roleIds.map((roleId) => ({ roleId })),
          },
        },
        select: USER_SELECT,
      });

      this.logger.log(`Usuario creado ${created.id} (${created.email})`);
      return this.toResponse(created);
    } catch (error) {
      throw this.translateUniqueConflict(error);
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, dni: true },
    });
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    if (dto.email !== undefined && dto.email !== existing.email) {
      await this.ensureEmailAvailable(dto.email, id);
    }
    if (dto.dni !== undefined && dto.dni !== existing.dni && dto.dni) {
      await this.ensureDniAvailable(dto.dni, id);
    }
    if (
      dto.inventoryLocationId !== undefined &&
      dto.inventoryLocationId !== null
    ) {
      await this.ensureLocationExists(dto.inventoryLocationId);
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.dni !== undefined) data.dni = dto.dni;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.inventoryLocationId !== undefined) {
      data.inventoryLocation =
        dto.inventoryLocationId === null
          ? { disconnect: true }
          : { connect: { id: dto.inventoryLocationId } };
    }

    try {
      // Reasignación de roles (reemplazo total)
      if (dto.roleIds !== undefined) {
        const roleIds = await this.resolveRoleIds(dto.roleIds);
        await this.prisma.userRole.deleteMany({ where: { userId: id } });
        if (roleIds.length > 0) {
          await this.prisma.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: id, roleId })),
            skipDuplicates: true,
          });
        }
        data.role = await this.deriveAccessLevel(roleIds);
      }

      const updated = await this.prisma.user.update({
        where: { id },
        data,
        select: USER_SELECT,
      });

      this.logger.log(`Usuario actualizado ${updated.id}`);
      return this.toResponse(updated);
    } catch (error) {
      throw this.translateUniqueConflict(error);
    }
  }

  async setActive(
    id: string,
    active: boolean,
    actingUserId: string,
  ): Promise<UserResponseDto> {
    if (id === actingUserId && !active) {
      throw new BadRequestException(
        'No puedes desactivar tu propia cuenta desde el panel',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { active, ...(active ? {} : { refreshToken: null }) },
      select: USER_SELECT,
    });
    this.logger.log(
      `Usuario ${id} ${active ? 'activado' : 'desactivado'} por ${actingUserId}`,
    );
    return this.toResponse(updated);
  }

  async resetPassword(
    id: string,
    newPassword: string,
    actingUserId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Solo SUPER_ADMIN puede resetear contraseña de otro SUPER_ADMIN.
    // Esto se valida con el nivel de acceso legacy + verificación adicional.
    if (user.role === AccessLevel.SUPER_ADMIN && id !== actingUserId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: actingUserId },
        select: { role: true },
      });
      if (!actor || actor.role !== AccessLevel.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Solo un SUPER_ADMIN puede resetear la contraseña de otro SUPER_ADMIN',
        );
      }
    }

    const passwordHash = await this.passwordHelper.hash(newPassword);
    // Reset también invalida la sesión actual del usuario.
    await this.prisma.user.update({
      where: { id },
      data: { password: passwordHash, refreshToken: null },
    });
    this.logger.log(`Contraseña reseteada para usuario ${id} por ${actingUserId}`);
  }

  async remove(id: string, actingUserId: string): Promise<void> {
    if (id === actingUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }
    try {
      await this.prisma.user.delete({ where: { id } });
      this.logger.log(`Usuario ${id} eliminado por ${actingUserId}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Usuario no encontrado');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: el usuario tiene registros asociados (ventas, movimientos, etc.)',
        );
      }
      throw error;
    }
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private async ensureEmailAvailable(
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { email, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este email');
    }
  }

  private async ensureDniAvailable(
    dni: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { dni, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este DNI');
    }
  }

  private async ensureLocationExists(locationId: string): Promise<void> {
    const exists = await this.prisma.inventoryLocation.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!exists) {
      throw new BadRequestException('La ubicación asignada no existe');
    }
  }

  private async resolveRoleIds(roleIds: string[] | undefined): Promise<string[]> {
    if (!roleIds || roleIds.length === 0) return [];
    const roles = await this.prisma.appRole.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    const found = new Set(roles.map((r) => r.id));
    const missing = roleIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Roles no encontrados: ${missing.join(', ')}`,
      );
    }
    return roles.map((r) => r.id);
  }

  /**
   * Determina el nivel de acceso legacy (`User.role` enum) basado en los roles
   * dinámicos asignados. Toma el "más alto" disponible.
   *  - super_admin              → SUPER_ADMIN
   *  - admin_sucursal/...       → ADMIN
   *  - sin roles o desconocidos → USER
   */
  private async deriveAccessLevel(roleIds: string[]): Promise<AccessLevel> {
    if (roleIds.length === 0) return AccessLevel.USER;
    const roles = await this.prisma.appRole.findMany({
      where: { id: { in: roleIds } },
      select: { slug: true },
    });
    let level: AccessLevel = AccessLevel.USER;
    const officialSlugs = new Set<OfficialRoleSlug>(Object.values(OFFICIAL_ROLES));
    for (const r of roles) {
      if (r.slug === OFFICIAL_ROLES.SUPER_ADMIN) {
        return AccessLevel.SUPER_ADMIN;
      }
      if (officialSlugs.has(r.slug as OfficialRoleSlug)) {
        const mapped = ROLE_SLUG_TO_LEGACY[r.slug as OfficialRoleSlug];
        if (mapped === 'ADMIN') level = AccessLevel.ADMIN;
      } else {
        // Rol personalizado: asumimos ADMIN como nivel mínimo de panel admin.
        if (level === AccessLevel.USER) level = AccessLevel.ADMIN;
      }
    }
    return level;
  }

  private translateUniqueConflict(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('dni')) {
        return new ConflictException('Ya existe una cuenta con este DNI');
      }
      return new ConflictException('Ya existe una cuenta con este email');
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private toResponse(user: UserAggregate): UserResponseDto {
    const inherited = new Set<string>();
    // Las claves heredadas requieren consultar los permisos de cada rol —
    // pero `userSelect()` no las incluye para evitar payloads pesados en list.
    // En esta respuesta se exponen únicamente los overrides aplicados; el
    // catálogo efectivo se obtiene en `/auth/me` resuelto por `RbacService`.
    for (const cp of user.customPermissions) {
      if (cp.allowed) inherited.add(cp.permission.key);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      dni: user.dni,
      accessLevel: user.role,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
      location: user.inventoryLocation
        ? {
            id: user.inventoryLocation.id,
            name: user.inventoryLocation.name,
            slug: user.inventoryLocation.slug,
          }
        : null,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        slug: ur.role.slug,
        name: ur.role.name,
      })),
      permissions: [...inherited],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
