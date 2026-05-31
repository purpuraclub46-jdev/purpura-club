import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

type AuthenticatedUserKey = keyof AuthenticatedUser;

/**
 * Variante de `CurrentUser` para endpoints con `OptionalJwtAuthGuard`.
 *
 * - Si la request está autenticada, devuelve el usuario o el campo solicitado.
 * - Si no, devuelve `undefined` SIN lanzar excepción.
 *
 * Útil para endpoints públicos que enriquecen su respuesta cuando hay
 * un usuario autenticado (p.ej. `GET /raffles/:slug` resolviendo precio
 * socio si el visitante es miembro).
 */
export const OptionalCurrentUser = createParamDecorator(
  <K extends AuthenticatedUserKey | undefined = undefined>(
    field: K,
    ctx: ExecutionContext,
  ):
    | (K extends AuthenticatedUserKey
        ? AuthenticatedUser[K]
        : AuthenticatedUser)
    | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser | null }>();
    const user = request.user;
    if (!user) return undefined;
    if (field) {
      return user[field] as never;
    }
    return user as never;
  },
);
