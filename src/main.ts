import 'dotenv/config';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppModule } from './app.module.js';
import { validateRequiredAuthEnv } from './config/validate-env.js';
import { buildCorsOptions } from './core/config/cors.js';
import { HttpExceptionFilter } from './exceptions/http.exception.js';
import { setupSwagger } from './swagger.js';

/** Límite de body JSON/urlencoded. Suficiente para bulk de productos; override con BODY_LIMIT. */
const DEFAULT_BODY_LIMIT = '1mb';

async function bootstrap() {
  validateRequiredAuthEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const bodyLimit =
    configService.get<string>('BODY_LIMIT')?.trim() || DEFAULT_BODY_LIMIT;

  app.enableCors(buildCorsOptions());
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
  app.use(helmet());
  app.use(morgan('dev'));
  setupGlobalPipes(app);
  app.useGlobalFilters(new HttpExceptionFilter());

  function setupGlobalPipes(app: INestApplication) {
    app.useGlobalPipes(
      new ValidationPipe({
        transformOptions: {
          enableImplicitConversion: true,
        },
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
  }

  setupSwagger(app);

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
}

bootstrap();
