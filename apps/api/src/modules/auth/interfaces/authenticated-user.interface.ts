import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  /** Nivel de acceso legacy (USER/ADMIN/SUPER_ADMIN) — fuente del RolesGuard. */
  role: Role;
  /** Sucursal/ubicación asignada. Null = sin restricción. */
  inventoryLocationId: string | null;
  /** Slugs de los roles dinámicos activos del usuario. */
  roleSlugs: string[];
  /** Claves de permisos efectivos (unión de roles + overrides personales). */
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AuthResult {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}
