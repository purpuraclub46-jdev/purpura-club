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
}

export const APP_CONFIG_KEY = 'app';

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
  };
});
