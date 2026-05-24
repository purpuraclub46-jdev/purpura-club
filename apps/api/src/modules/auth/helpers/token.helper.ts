import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AUTH_CONFIG_KEY, AuthConfig } from '../../../config/auth.config';
import { AuthTokens } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

interface IssueTokensInput {
  userId: string;
  email: string;
  role: JwtPayload['role'];
}

@Injectable()
export class TokenHelper {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    const config = configService.get<AuthConfig>(AUTH_CONFIG_KEY);

    if (!config) {
      throw new Error('Auth configuration is missing');
    }

    this.authConfig = config;
  }

  async issueTokens(input: IssueTokensInput): Promise<AuthTokens> {
    const basePayload: JwtPayload = {
      sub: input.userId,
      email: input.email,
      role: input.role,
      type: 'access',
    };

    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessSignOptions: JwtSignOptions = {
      secret: this.authConfig.accessTokenSecret,
      expiresIn: this.authConfig.accessTokenExpiresIn as unknown as number,
      issuer: this.authConfig.issuer,
      audience: this.authConfig.audience,
      jwtid: accessJti,
    };

    const refreshSignOptions: JwtSignOptions = {
      secret: this.authConfig.refreshTokenSecret,
      expiresIn: this.authConfig.refreshTokenExpiresIn as unknown as number,
      issuer: this.authConfig.issuer,
      audience: this.authConfig.audience,
      jwtid: refreshJti,
    };

    const accessToken = await this.jwtService.signAsync(
      { ...basePayload, type: 'access' },
      accessSignOptions,
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...basePayload, type: 'refresh' },
      refreshSignOptions,
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpirySeconds(this.authConfig.accessTokenExpiresIn),
    };
  }

  verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.authConfig.refreshTokenSecret,
      issuer: this.authConfig.issuer,
      audience: this.authConfig.audience,
    });
  }

  hashRefreshToken(token: string): Promise<string> {
    return bcrypt.hash(token, this.authConfig.bcryptSaltRounds);
  }

  compareRefreshToken(token: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(token, hashed);
  }

  getRefreshTokenMaxAgeMs(): number {
    return this.parseExpirySeconds(this.authConfig.refreshTokenExpiresIn) * 1000;
  }

  private parseExpirySeconds(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    }

    const match = /^(\d+)\s*([smhdw])?$/i.exec(value.trim());

    if (!match) {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
      return 0;
    }

    const amount = parseInt(match[1], 10);
    const unit = (match[2] ?? 's').toLowerCase();

    switch (unit) {
      case 's':
        return amount;
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 60 * 60;
      case 'd':
        return amount * 60 * 60 * 24;
      case 'w':
        return amount * 60 * 60 * 24 * 7;
      default:
        return amount;
    }
  }
}
