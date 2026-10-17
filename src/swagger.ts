import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const local = {
    url: 'http://localhost:3000/',
  };
  const production = {
    url: '',
  };

  const config = new DocumentBuilder()
    .setTitle('Documentación de la API de Control de Stock')
    .setDescription('API de Control de Stock')
    .setVersion('1.0')

    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'authorization'
      },
      'authorization',
    ).build();

  const options: SwaggerCustomOptions = {
    swaggerOptions: {
      docExpansion: 'none',
      persistAuthorization: true, // Persistir el token de autorización
      displayRequestDuration: true,
      tagsSorter: 'alpha', // Ordenar tags alfabéticamente
    },
  };

  config.servers = [local, production];
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, options);
}