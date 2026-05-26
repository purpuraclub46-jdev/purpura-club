import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role as AccessLevel } from '@prisma/client';
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
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        inventoryLocationId: true,
        roles: {
          where: { role: { active: true } },
          select: {
            role: {
              select: {
                slug: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
        customPermissions: {
          select: { allowed: true, permission: { select: { key: true } } },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (!user.active) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    const roleSlugs = user.roles.map((ur) => ur.role.slug);
    const permKeys = new Set<string>();
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) {
        permKeys.add(rp.permission.key);
      }
    }
    for (const cp of user.customPermissions) {
      if (cp.allowed) permKeys.add(cp.permission.key);
      else permKeys.delete(cp.permission.key);
    }

    // SUPER_ADMIN tiene acceso total — la guarda de permisos lo trata aparte
    // y aquí no se necesita cargar todo el catálogo.
    const isSuperAdmin =
      user.role === AccessLevel.SUPER_ADMIN || roleSlugs.includes('super_admin');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      inventoryLocationId: user.inventoryLocationId,
      roleSlugs,
      permissions: isSuperAdmin ? ['*'] : [...permKeys],
    };
  }
}
