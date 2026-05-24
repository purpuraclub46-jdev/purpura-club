import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerConfig } from './swagger.config';

export function setupSwagger(app: INestApplication): string | null {
  const configService = app.get(ConfigService);
  const swaggerConfig = configService.get<SwaggerConfig>('swagger');

  if (!swaggerConfig?.enabled) {
    return null;
  }

  const documentConfig = new DocumentBuilder()
    .setTitle(swaggerConfig.title)
    .setDescription(swaggerConfig.description)
    .setVersion(swaggerConfig.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .addServer('/')
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig, {
    deepScanRoutes: true,
  });

  SwaggerModule.setup(swaggerConfig.path, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
    },
  });

  return swaggerConfig.path;
}
