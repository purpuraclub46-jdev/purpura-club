import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordHelper } from './helpers/password.helper';
import { TokenHelper } from './helpers/token.helper';
import { AuthTokens } from './interfaces/authenticated-user.interface';

interface UserWithRbac extends User {
  inventoryLocation: { id: string; name: string; slug: string } | null;
  roles: {
    role: {
      id: string;
      slug: string;
      name: string;
      active: boolean;
      permissions: { permission: { key: string } }[];
    };
  }[];
  customPermissions: {
    allowed: boolean;
    permission: { key: string };
  }[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHelper: PasswordHelper,
    private readonly tokenHelper: TokenHelper,
  ) {}

  /**
   * Registro atómico User + Customer (FASE 1 — CRÍTICO #1).
   *
   * Garantía: todo usuario registrado tiene Customer asociado en la misma
   * transacción. Si el DNI provisto coincide con un Customer walk-in
   * pre-existente (POS) sin cuenta, se enlaza en lugar de duplicar.
   *
   * Política de dedupe aprobada en FASE 0.5:
   *   - Auto-match SOLO por DNI (estricto, sin falsos positivos).
   *   - NO auto-match por email ni teléfono (familias / errores tipográficos).
   *   - NO retroactivar membership/raffles/beneficios a compras POS pasadas.
   *
   * Failure modes:
   *   - email duplicado en User → 409
   *   - DNI duplicado en User → 409
   *   - DNI ya pertenece a un Customer YA linkeado a otro User → 409
   *     (la persona ya tiene cuenta, debe iniciar sesión, no registrarse)
   *   - Cualquier fallo dentro de la TX → rollback completo (no queda User huérfano)
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // ─── Pre-flight checks ──────────────────────────────────────────────
    // Lecturas idempotentes fuera de TX para dar errores claros antes de
    // hashear la password (que es la operación más cara).
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingByEmail) {
      throw new ConflictException('An account with this email already exists');
    }

    if (dto.dni) {
      const existingUserByDni = await this.prisma.user.findUnique({
        where: { dni: dto.dni },
        select: { id: true },
      });
      if (existingUserByDni) {
        throw new ConflictException(
          'This DNI already belongs to another account',
        );
      }

      // Anti-typo: si el DNI pertenece a un Customer YA linkeado a otro
      // User, el cliente probablemente ya tiene cuenta y olvidó. Devolver
      // 409 con copy específico (storefront lo puede traducir a "¿olvidaste
      // tu contraseña?").
      const linkedCustomerWithDni = await this.prisma.customer.findUnique({
        where: { dni: dto.dni },
        select: { id: true, userId: true },
      });
      if (linkedCustomerWithDni && linkedCustomerWithDni.userId) {
        throw new ConflictException(
          'This DNI already belongs to another account',
        );
      }
    }

    const passwordHash = await this.passwordHelper.hash(dto.password);

    try {
      const createdUserId = await this.prisma.$transaction(async (tx) => {
        // 1. Crear User
        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            dni: dto.dni ?? null,
            role: Role.USER,
          },
          select: { id: true },
        });

        // 2. Buscar Customer huérfano por DNI (solo si DNI provisto).
        //    Político: SOLO match por DNI. Email/phone no se usan para dedupe.
        let orphanCustomer: {
          id: string;
          email: string | null;
          phone: string | null;
        } | null = null;

        if (dto.dni) {
          orphanCustomer = await tx.customer.findFirst({
            where: { dni: dto.dni, userId: null },
            select: { id: true, email: true, phone: true },
          });
        }

        // 3a. Vincular Customer huérfano si existe
        if (orphanCustomer) {
          await tx.customer.update({
            where: { id: orphanCustomer.id },
            data: {
              userId: user.id,
              // Preservar email/phone del walk-in si fueron capturados en POS
              // (datos verificados por cajero). Solo rellenar si eran null.
              email: orphanCustomer.email ?? dto.email,
              phone: orphanCustomer.phone ?? dto.phone ?? null,
            },
          });
          this.logger.log(
            `[auth.register] Linked orphan customer ${orphanCustomer.id} ` +
              `to new user ${user.id} via DNI dedupe`,
          );
        } else {
          // 3b. Crear Customer nuevo vinculado al User
          await tx.customer.create({
            data: {
              userId: user.id,
              firstName: dto.firstName,
              lastName: dto.lastName,
              fullName: `${dto.firstName} ${dto.lastName}`.trim(),
              email: dto.email,
              phone: dto.phone ?? null,
              dni: dto.dni ?? null,
              // documentType default DNI (schema default). Cliente puede
              // cambiarlo a CE/PASSPORT/RUC desde su perfil después.
              active: true,
              isMember: false,
            },
          });
          this.logger.log(
            `[auth.register] Created new customer for user ${user.id}`,
          );
        }

        return user.id;
      });

      // Lecturas y side-effects fuera de TX (post-commit).
      const enriched = await this.loadWithRbac(dto.email);
      this.logger.log(`User registered: ${enriched.id}`);

      const tokens = await this.issueAndPersistTokens(enriched);

      return {
        user: this.toAuthUser(enriched),
        tokens,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Constraint violation race. Mapear según target.
        const target = (error.meta?.target as string[] | undefined) ?? [];
        if (target.includes('email')) {
          throw new ConflictException(
            'An account with this email already exists',
          );
        }
        if (target.includes('dni')) {
          throw new ConflictException(
            'This DNI already belongs to another account',
          );
        }
        if (target.includes('userId')) {
          // Customer.userId @unique violado — race condition extrema.
          // Nunca debería ocurrir porque el User es recién creado en esta TX.
          throw new ConflictException(
            'A duplicate customer link was detected',
          );
        }
        throw new ConflictException('A duplicate entry conflict occurred');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.loadWithRbacOrNull(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await this.passwordHelper.compare(
      dto.password,
      user.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.active) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    const tokens = await this.issueAndPersistTokens(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.id}`);

    return {
      user: this.toAuthUser(user),
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload;
    try {
      payload = await this.tokenHelper.verifyRefreshToken(refreshToken);
    } catch (error) {
      this.logger.debug(
        `Refresh token verification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.loadWithRbacByIdOrNull(payload.sub);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    if (!user.active) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    const tokenMatches = await this.tokenHelper.compareRefreshToken(
      refreshToken,
      user.refreshToken,
    );

    if (!tokenMatches) {
      this.logger.warn(
        `Refresh token reuse detected for user ${user.id} — invalidating session`,
      );
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const tokens = await this.issueAndPersistTokens(user);

    return {
      user: this.toAuthUser(user),
      tokens,
    };
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
      this.logger.log(`User logged out: ${userId}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return;
      }
      throw error;
    }
  }

  async getProfile(userId: string): Promise<AuthUserDto> {
    const user = await this.loadWithRbacByIdOrNull(userId);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.toAuthUser(user);
  }

  // ─── Internal helpers ──────────────────────────────────────────────────

  private async issueAndPersistTokens(user: User): Promise<AuthTokens> {
    const tokens = await this.tokenHelper.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const hashedRefresh = await this.tokenHelper.hashRefreshToken(
      tokens.refreshToken,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefresh },
    });

    return tokens;
  }

  private rbacSelect() {
    return {
      inventoryLocation: { select: { id: true, name: true, slug: true } },
      roles: {
        where: { role: { active: true } },
        select: {
          role: {
            select: {
              id: true,
              slug: true,
              name: true,
              active: true,
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
        },
      },
      customPermissions: {
        select: {
          allowed: true,
          permission: { select: { key: true } },
        },
      },
    } satisfies Prisma.UserInclude;
  }

  private async loadWithRbac(email: string): Promise<UserWithRbac> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: this.rbacSelect(),
    });
    if (!user) throw new UnauthorizedException('User no longer exists');
    return user;
  }

  private loadWithRbacOrNull(email: string): Promise<UserWithRbac | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: this.rbacSelect(),
    });
  }

  private loadWithRbacByIdOrNull(id: string): Promise<UserWithRbac | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: this.rbacSelect(),
    });
  }

  private toAuthUser(user: UserWithRbac): AuthUserDto {
    const isSuperAdmin =
      user.role === Role.SUPER_ADMIN ||
      user.roles.some((ur) => ur.role.slug === 'super_admin');

    const perms = new Set<string>();
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) {
        perms.add(rp.permission.key);
      }
    }
    for (const cp of user.customPermissions) {
      if (cp.allowed) perms.add(cp.permission.key);
      else perms.delete(cp.permission.key);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active,
      location: user.inventoryLocation
        ? {
            id: user.inventoryLocation.id,
            name: user.inventoryLocation.name,
            slug: user.inventoryLocation.slug,
          }
        : null,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        slug: ur.role.slug,
        name: ur.role.name,
      })),
      permissions: isSuperAdmin ? ['*'] : [...perms],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
