import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RbacBootstrap } from './rbac.bootstrap';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { RolesService } from './roles.service';

/**
 * Módulo RBAC: roles dinámicos + permisos + resolución de autorización.
 * Es @Global para que `RbacService` esté disponible en cualquier guard sin
 * imports repetitivos.
 */
@Global()
@Module({
  controllers: [RbacController],
  providers: [RbacBootstrap, RbacService, RolesService, PermissionsService],
  exports: [RbacService, RolesService, PermissionsService],
})
export class RbacModule {}
