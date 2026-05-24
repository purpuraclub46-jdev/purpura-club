import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AUTH_CONFIG_KEY, AuthConfig } from '../../../config/auth.config';

@Injectable()
export class PasswordHelper {
  private readonly saltRounds: number;

  constructor(configService: ConfigService) {
    const authConfig = configService.get<AuthConfig>(AUTH_CONFIG_KEY);

    if (!authConfig) {
      throw new Error('Auth configuration is missing');
    }

    this.saltRounds = authConfig.bcryptSaltRounds;
  }

  hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.saltRounds);
  }

  compare(plainText: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashed);
  }
}
