import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  directUrl?: string;
}

export const DATABASE_CONFIG_KEY = 'database';

export default registerAs(DATABASE_CONFIG_KEY, (): DatabaseConfig => ({
  url: process.env.DATABASE_URL as string,
  directUrl: process.env.DIRECT_URL,
}));
