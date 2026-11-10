import 'dotenv/config';

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { AppModule } from './app.module.js';
import { validateRequiredAuthEnv } from './config/validate-env.js';
import { buildCorsOptions } from './core/config/cors.js';
import { isProductionEnv } from './common/utils/sanitize-log.util.js';
import { HttpExceptionFilter } from './exceptions/http.exception.js';
import { setupSwagger } from './swagger.js';

/** Límite de body JSON/urlencoded. Suficiente para bulk de productos; override con BODY_LIMIT. */
const DEFAULT_BODY_LIMIT = '1mb';

function applyTrustProxy(app: NestExpressApplication): void {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) return;
  if (raw === 'true') {
    app.set('trust proxy', 1);
    return;
  }
  if (raw === 'false') return;
  const asNumber = Number(raw);
  app.set('trust proxy', Number.isFinite(asNumber) ? asNumber : raw);
}

async function bootstrap() {
  validateRequiredAuthEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // SIGTERM/SIGINT (systemd): cierra HTTP y liberan conexiones TypeORM/MySQL.
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const bodyLimit =
    configService.get<string>('BODY_LIMIT')?.trim() || DEFAULT_BODY_LIMIT;

  applyTrustProxy(app);
  app.enableCors(buildCorsOptions());
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
  app.use(
    helmet({
      // API JSON: no necesitamos CSP de documentos HTML.
      contentSecurityPolicy: false,
    }),
  );
  app.use(morgan(isProductionEnv() ? 'combined' : 'dev'));
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

  const port = Number(configService.get('PORT')) || 3000;
  // Producción detrás de Nginx: HOST=127.0.0.1 (API no pública). Desarrollo: 0.0.0.0.
  const host = configService.get<string>('HOST')?.trim() || '0.0.0.0';
  await app.listen(port, host);
  Logger.log(`API escuchando en http://${host}:${port}`, 'Bootstrap');
}

bootstrap();
