import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AUTH_CONFIG_KEY, AuthConfig } from '../../config/auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PasswordHelper } from './helpers/password.helper';
import { TokenHelper } from './helpers/token.helper';
import { JWT_STRATEGY_NAME, JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({
      defaultStrategy: JWT_STRATEGY_NAME,
      session: false,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const authConfig = configService.get<AuthConfig>(AUTH_CONFIG_KEY);

        if (!authConfig) {
          throw new Error('Auth configuration is missing');
        }

        return {
          secret: authConfig.accessTokenSecret,
          signOptions: {
            expiresIn: authConfig.accessTokenExpiresIn as unknown as number,
            issuer: authConfig.issuer,
            audience: authConfig.audience,
          },
          verifyOptions: {
            issuer: authConfig.issuer,
            audience: authConfig.audience,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHelper,
    TokenHelper,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, PasswordHelper, TokenHelper, JwtModule, PassportModule],
})
export class AuthModule {}
