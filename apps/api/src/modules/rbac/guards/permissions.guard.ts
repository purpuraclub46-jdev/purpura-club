import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  PermissionRequirement,
  REQUIRE_PERMISSIONS_KEY,
} from '../decorators/require-permissions.decorator';
import { RbacService } from '../rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<
      PermissionRequirement | undefined
    >(REQUIRE_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requirement || requirement.keys.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Autenticación requerida');
    }

    const auth = await this.rbacService.resolveAuthorization(user.id);
    if (!auth) {
      throw new ForbiddenException('Usuario no encontrado');
    }
    if (!auth.active) {
      throw new ForbiddenException('La cuenta está desactivada');
    }

    const ok =
      requirement.mode === 'any'
        ? this.rbacService.hasAnyPermission(auth, requirement.keys)
        : this.rbacService.hasAllPermissions(auth, requirement.keys);

    if (!ok) {
      throw new ForbiddenException(
        'No tienes los permisos necesarios para realizar esta acción',
      );
    }

    return true;
  }
}
