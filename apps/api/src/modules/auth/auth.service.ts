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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHelper: PasswordHelper,
    private readonly tokenHelper: TokenHelper,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwordHelper.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: Role.USER,
        },
      });

      this.logger.log(`User registered: ${user.id}`);

      const tokens = await this.issueAndPersistTokens(user);

      return {
        user: this.toAuthUser(user),
        tokens,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

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

    const tokens = await this.issueAndPersistTokens(user);

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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Refresh token is no longer valid');
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.toAuthUser(user);
  }

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

  private toAuthUser(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
