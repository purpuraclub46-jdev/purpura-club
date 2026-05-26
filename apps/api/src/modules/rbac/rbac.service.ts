import { Injectable } from '@nestjs/common';
import { Role as AccessLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Estructura efectiva de autorización de un usuario después de resolver:
 *  - Permisos heredados de sus roles activos.
 *  - Overrides personales (`UserPermission.allowed`).
 *  - Nivel de acceso legacy (`User.role` enum).
 */
export interface EffectiveAuthorization {
  userId: string;
  /** Nivel de acceso legacy. Usado por el `RolesGuard` existente. */
  accessLevel: AccessLevel;
  /** Slug del rol dinámico principal (primero asignado). Null si no tiene. */
  roleSlugs: string[];
  /** Set de claves de permisos efectivamente otorgados. */
  permissions: string[];
  /** Sucursal/ubicación asignada (null = sin restricción). */
  inventoryLocationId: string | null;
  /** Si la cuenta está activa para operar. */
  active: boolean;
  /** Si tiene el rol SUPER_ADMIN o accessLevel SUPER_ADMIN: pase libre. */
  isSuperAdmin: boolean;
}

const SUPER_ADMIN_SLUG = 'super_admin';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve la autorización efectiva del usuario.
   * Une los permisos de todos sus roles ACTIVOS y aplica los overrides
   * personales (allow/deny).
   */
  async resolveAuthorization(
    userId: string,
  ): Promise<EffectiveAuthorization | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        active: true,
        inventoryLocationId: true,
        roles: {
          where: { role: { active: true } },
          select: {
            role: {
              select: {
                slug: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
        customPermissions: {
          select: {
            allowed: true,
            permission: { select: { key: true } },
          },
        },
      },
    });

    if (!user) return null;

    const roleSlugs = user.roles.map((ur) => ur.role.slug);
    const inheritedKeys = new Set<string>();
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) {
        inheritedKeys.add(rp.permission.key);
      }
    }

    for (const cp of user.customPermissions) {
      if (cp.allowed) inheritedKeys.add(cp.permission.key);
      else inheritedKeys.delete(cp.permission.key);
    }

    const isSuperAdmin =
      user.role === AccessLevel.SUPER_ADMIN ||
      roleSlugs.includes(SUPER_ADMIN_SLUG);

    return {
      userId: user.id,
      accessLevel: user.role,
      roleSlugs,
      permissions: [...inheritedKeys],
      inventoryLocationId: user.inventoryLocationId,
      active: user.active,
      isSuperAdmin,
    };
  }

  /**
   * Evalúa si la autorización efectiva contiene todos los permisos requeridos.
   * SUPER_ADMIN pasa siempre.
   */
  hasAllPermissions(
    auth: EffectiveAuthorization,
    required: readonly string[],
  ): boolean {
    if (required.length === 0) return true;
    if (auth.isSuperAdmin) return true;
    const perms = new Set(auth.permissions);
    return required.every((key) => perms.has(key));
  }

  /**
   * Evalúa si la autorización efectiva contiene al menos uno de los permisos.
   * SUPER_ADMIN pasa siempre.
   */
  hasAnyPermission(
    auth: EffectiveAuthorization,
    required: readonly string[],
  ): boolean {
    if (required.length === 0) return true;
    if (auth.isSuperAdmin) return true;
    const perms = new Set(auth.permissions);
    return required.some((key) => perms.has(key));
  }
}
