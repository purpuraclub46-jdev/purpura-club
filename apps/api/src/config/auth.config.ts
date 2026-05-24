import { registerAs } from '@nestjs/config';

export type SameSiteOption = 'lax' | 'strict' | 'none';

export interface AuthCookieConfig {
  name: string;
  secure: boolean;
  domain?: string;
  path: string;
  sameSite: SameSiteOption;
}

export interface AuthConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  issuer: string;
  audience: string;
  bcryptSaltRounds: number;
  refreshCookie: AuthCookieConfig;
}

export const AUTH_CONFIG_KEY = 'auth';

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const parseSameSite = (value: string | undefined): SameSiteOption => {
  const normalized = (value ?? 'lax').trim().toLowerCase();
  if (normalized === 'strict' || normalized === 'none') {
    return normalized;
  }
  return 'lax';
};

export default registerAs(AUTH_CONFIG_KEY, (): AuthConfig => {
  const accessTokenSecret = process.env.JWT_ACCESS_SECRET;
  const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessTokenSecret || !refreshTokenSecret) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables are required',
    );
  }

  return {
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    issuer: process.env.JWT_ISSUER ?? 'purpura-club',
    audience: process.env.JWT_AUDIENCE ?? 'purpura-club-clients',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
    refreshCookie: {
      name: process.env.REFRESH_COOKIE_NAME ?? 'purpura_refresh_token',
      secure: parseBoolean(process.env.REFRESH_COOKIE_SECURE, true),
      domain: process.env.REFRESH_COOKIE_DOMAIN || undefined,
      path: process.env.REFRESH_COOKIE_PATH ?? '/api',
      sameSite: parseSameSite(process.env.REFRESH_COOKIE_SAMESITE),
    },
  };
});
