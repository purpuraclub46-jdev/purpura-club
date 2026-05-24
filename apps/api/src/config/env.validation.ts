import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  API_PREFIX: string = 'api';

  @IsString()
  @IsNotEmpty()
  API_VERSION: string = 'v1';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DIRECT_URL?: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS: string = '*';

  @IsOptional()
  @IsString()
  SWAGGER_PATH?: string = 'docs';

  @IsOptional()
  @IsString()
  SWAGGER_TITLE?: string = 'Purpura Club API';

  @IsOptional()
  @IsString()
  SWAGGER_DESCRIPTION?: string =
    'Purpura Club REST API documentation';

  @IsOptional()
  @IsString()
  SWAGGER_VERSION?: string = '1.0.0';

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_TTL?: number = 60;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT?: number = 100;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN?: string = '15m';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  JWT_ISSUER?: string = 'purpura-club';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  JWT_AUDIENCE?: string = 'purpura-club-clients';

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(15)
  BCRYPT_SALT_ROUNDS?: number = 12;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  REFRESH_COOKIE_NAME?: string = 'purpura_refresh_token';

  @IsOptional()
  @IsBoolean()
  REFRESH_COOKIE_SECURE?: boolean = true;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  REFRESH_COOKIE_DOMAIN?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  REFRESH_COOKIE_PATH?: string = '/api';

  @IsOptional()
  @IsString()
  @IsEnum(['lax', 'strict', 'none'])
  REFRESH_COOKIE_SAMESITE?: 'lax' | 'strict' | 'none' = 'lax';
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const formatted = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'invalid value';

        return `  - ${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `Environment variable validation failed:\n${formatted}`,
    );
  }

  return validated;
}