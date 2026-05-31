import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JWT_STRATEGY_NAME } from '../strategies/jwt.strategy';

/**
 * Guard JWT opcional (F2.7-B).
 *
 * Permite que un endpoint público parsee el token Bearer cuando está presente
 * (hidratando `req.user`) sin rechazar la request si NO viene token. Útil para
 * endpoints como `GET /raffles/:slug` que son públicos pero quieren resolver
 * beneficios del visitante autenticado (p.ej. precio socio).
 *
 * Reglas:
 *   - Sin Authorization header → `req.user` queda `null`.
 *   - Con Authorization válido → `req.user` se hidrata con el shape estándar.
 *   - Con Authorization inválido / expirado → `req.user` queda `null`
 *     (no lanza UnauthorizedException). El handler trata al usuario como
 *     anónimo. El frontend debe manejar el refresh del token aparte.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
  ): TUser | null {
    if (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.debug(`Optional JWT parse failed: ${message}`);
    }
    if (!user) return null;
    return user;
  }
}
