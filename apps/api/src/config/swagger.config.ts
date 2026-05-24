import { registerAs } from '@nestjs/config';

export interface SwaggerConfig {
  enabled: boolean;
  path: string;
  title: string;
  description: string;
  version: string;
}

export const SWAGGER_CONFIG_KEY = 'swagger';

export default registerAs(SWAGGER_CONFIG_KEY, (): SwaggerConfig => ({
  enabled: process.env.NODE_ENV !== 'production',
  path: process.env.SWAGGER_PATH ?? 'docs',
  title: process.env.SWAGGER_TITLE ?? 'Purpura Club API',
  description:
    process.env.SWAGGER_DESCRIPTION ?? 'Purpura Club REST API documentation',
  version: process.env.SWAGGER_VERSION ?? '1.0.0',
}));
