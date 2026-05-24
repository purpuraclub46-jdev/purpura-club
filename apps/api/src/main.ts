import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';
import { setupSwagger } from './config/swagger.setup';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    abortOnError: false,
  });

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app');

  if (!appConfig) {
    throw new Error('Application configuration is missing');
  }

  app.setGlobalPrefix(appConfig.apiPrefix);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiVersion.replace(/^v/i, ''),
  });

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.enableCors({
    origin:
      appConfig.corsOrigins.length === 1 && appConfig.corsOrigins[0] === '*'
        ? true
        : appConfig.corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.enableShutdownHooks();

  const swaggerPath = setupSwagger(app);

  await app.listen(appConfig.port, '0.0.0.0');

  const url = await app.getUrl();
  logger.log(`Application running on ${url}/${appConfig.apiPrefix}`);
  if (swaggerPath) {
    logger.log(`Swagger docs available at ${url}/${swaggerPath}`);
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      logger.log('Application shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      void shutdown(signal);
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error.stack);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason instanceof Error ? reason.stack : String(reason));
  });
}

void bootstrap();
