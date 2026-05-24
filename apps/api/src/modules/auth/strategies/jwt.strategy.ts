import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_CONFIG_KEY, AuthConfig } from '../../../config/auth.config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export const JWT_STRATEGY_NAME = 'jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const authConfig = configService.get<AuthConfig>(AUTH_CONFIG_KEY);

    if (!authConfig) {
      throw new Error('Auth configuration is missing');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.accessTokenSecret,
      issuer: authConfig.issuer,
      audience: authConfig.audience,
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
