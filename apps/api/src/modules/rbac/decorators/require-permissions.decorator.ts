import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'rbac:permissions';

export type PermissionRequirementMode = 'all' | 'any';

export interface PermissionRequirement {
  keys: string[];
  mode: PermissionRequirementMode;
}

/**
 * Exige que el usuario autenticado tenga TODOS los permisos indicados.
 * SUPER_ADMIN pasa siempre. Sin parámetros, no aplica restricción.
 */
export const RequirePermissions = (
  ...keys: string[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, { keys, mode: 'all' });

/**
 * Exige que el usuario tenga AL MENOS UNO de los permisos indicados.
 */
export const RequireAnyPermission = (
  ...keys: string[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, { keys, mode: 'any' });
