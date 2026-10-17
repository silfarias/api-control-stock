import { INestApplication, Logger } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';

/**
 * Swagger habilitado si:
 * - SWAGGER_ENABLED=true, o
 * - SWAGGER_ENABLED no está definido y NODE_ENV !== 'production'
 *
 * En producción queda deshabilitado salvo override explícito.
 */
export function shouldEnableSwagger(): boolean {
  const flag = process.env.SWAGGER_ENABLED?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function setupSwagger(app: INestApplication): void {
  if (!shouldEnableSwagger()) {
    Logger.log(
      'Swagger deshabilitado (producción o SWAGGER_ENABLED=false)',
      'Swagger',
    );
    return;
  }

  const port = process.env.PORT || '3000';
  const local = {
    url: `http://localhost:${port}/`,
  };
  const production = {
    url: process.env.SWAGGER_SERVER_URL?.trim() || '',
  };

  const config = new DocumentBuilder()
    .setTitle('Documentación de la API de Control de Stock')
    .setDescription('API de Control de Stock')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'authorization',
      },
      'authorization',
    )
    .build();

  const options: SwaggerCustomOptions = {
    swaggerOptions: {
      docExpansion: 'none',
      persistAuthorization: true,
      displayRequestDuration: true,
      tagsSorter: 'alpha',
    },
  };

  config.servers = [local, production].filter((s) => s.url.length > 0);
  if (config.servers.length === 0) {
    config.servers = [local];
  }

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, options);
  Logger.log(`Swagger disponible en /api`, 'Swagger');
}
