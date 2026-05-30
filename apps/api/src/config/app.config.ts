import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  apiVersion: string;
  corsOrigins: string[];
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  /**
   * Feature flag FASE 1 / D5 — controla el auto-link User ↔ Customer
   * por DNI en `CustomersService.create()`. Si está en false, el admin
   * debe vincular manualmente vía `POST /customers/:id/link-user`.
   * Permite desactivar sin redeploy en caso de incidente operativo.
   * Default: true.
   */
  customerAutoLinkByDni: boolean;
}

export const APP_CONFIG_KEY = 'app';

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export default registerAs(APP_CONFIG_KEY, (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const corsOrigins = (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    nodeEnv,
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    apiVersion: process.env.API_VERSION ?? 'v1',
    corsOrigins,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
    customerAutoLinkByDni: parseBool(
      process.env.CUSTOMER_AUTO_LINK_BY_DNI,
      true,
    ),
  };
});
