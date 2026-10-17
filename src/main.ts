import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';

import { HttpExceptionFilter } from './exceptions/http.exception.js';
import { AppModule } from './app.module.js';
import { CORS } from './core/config/cors.js';
import { setupSwagger } from './swagger.js';
import { validateRequiredAuthEnv } from './config/validate-env.js';


async function bootstrap() {
  validateRequiredAuthEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  app.enableCors(CORS);
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ extended: true, limit: '200mb' }));
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