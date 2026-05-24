import {
  ExecutionContext,
  InternalServerErrorException,
  createParamDecorator,
} from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

type AuthenticatedUserKey = keyof AuthenticatedUser;

export const CurrentUser = createParamDecorator(
  <K extends AuthenticatedUserKey | undefined = undefined>(
    field: K,
    ctx: ExecutionContext,
  ): K extends AuthenticatedUserKey ? AuthenticatedUser[K] : AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new InternalServerErrorException(
        'CurrentUser decorator used on a route that is not protected by an auth guard',
      );
    }

    if (field) {
      return user[field] as never;
    }

    return user as never;
  },
);
