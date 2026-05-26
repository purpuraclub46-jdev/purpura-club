import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OFFICIAL_ROLE_DEFINITIONS,
  PERMISSIONS,
} from './rbac.constants';

/**
 * Siembra/sincroniza el catálogo de permisos y los roles oficiales en cada
 * arranque del API. Idempotente — todo se hace vía upsert por clave natural.
 *
 *  - PERMISSIONS:   se upsert por `key`.
 *  - ROLES:         se upsert por `slug` (active=true).
 *  - ROLE↔PERMISO:  para los roles oficiales se sincroniza la matriz.
 *                   Los roles personalizados NO se tocan.
 */
@Injectable()
export class RbacBootstrap implements OnModuleInit {
  private readonly logger = new Logger(RbacBootstrap.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.syncPermissionCatalog();
      await this.syncOfficialRoles();
      this.logger.log('Catálogo RBAC sincronizado correctamente');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bootstrap RBAC falló: ${msg}`);
    }
  }

  private async syncPermissionCatalog(): Promise<void> {
    for (const p of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: p.key },
        create: {
          key: p.key,
          name: p.name,
          description: p.description,
          module: p.module,
        },
        update: {
          name: p.name,
          description: p.description,
          module: p.module,
        },
      });
    }
  }

  private async syncOfficialRoles(): Promise<void> {
    const allPermissions = await this.prisma.permission.findMany({
      select: { id: true, key: true },
    });
    const permissionIdByKey = new Map(allPermissions.map((p) => [p.key, p.id]));

    for (const def of OFFICIAL_ROLE_DEFINITIONS) {
      const role = await this.prisma.appRole.upsert({
        where: { slug: def.slug },
        create: {
          slug: def.slug,
          name: def.name,
          description: def.description,
          active: true,
        },
        update: {
          name: def.name,
          description: def.description,
          active: true,
        },
      });

      const targetPermissionIds =
        def.permissions === 'ALL'
          ? allPermissions.map((p) => p.id)
          : def.permissions
              .map((key) => permissionIdByKey.get(key))
              .filter((id): id is string => Boolean(id));

      // Sincronización completa de permisos del rol oficial.
      const existingLinks = await this.prisma.appRolePermission.findMany({
        where: { roleId: role.id },
        select: { permissionId: true },
      });
      const existingIds = new Set(existingLinks.map((l) => l.permissionId));
      const targetIds = new Set(targetPermissionIds);

      const toAdd = [...targetIds].filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !targetIds.has(id));

      if (toAdd.length > 0) {
        await this.prisma.appRolePermission.createMany({
          data: toAdd.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
      if (toRemove.length > 0) {
        await this.prisma.appRolePermission.deleteMany({
          where: { roleId: role.id, permissionId: { in: toRemove } },
        });
      }
    }
  }
}
