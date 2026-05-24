import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JWT_STRATEGY_NAME } from '../strategies/jwt.strategy';

@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
    info: unknown,
  ): TUser {
    if (err || !user) {
      const message =
        info instanceof Error
          ? info.message
          : err instanceof Error
            ? err.message
            : 'Unauthorized';

      this.logger.debug(`JWT auth failed: ${message}`);
      throw err instanceof Error ? err : new UnauthorizedException(message);
    }

    return user;
  }
}
