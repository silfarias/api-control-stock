import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Orígenes por defecto para el front Vite en desarrollo local. */
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

/**
 * Lista de orígenes permitidos desde CORS_ORIGINS (separados por coma).
 * Sin variable: en desarrollo usa Vite local; en producción no refleja orígenes
 * (hay que definir CORS_ORIGINS explícitamente).
 */
export function resolveCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  if (process.env.NODE_ENV !== 'production') {
    return [...DEFAULT_DEV_ORIGINS];
  }

  // Producción sin allowlist: no abrir a cualquier origen.
  return [];
}

/** Construye opciones CORS en runtime (después de cargar .env). */
export function buildCorsOptions(): CorsOptions {
  return {
    origin: resolveCorsOrigins(),
    methods:
      process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: process.env.CORS_CREDENTIALS
      ? process.env.CORS_CREDENTIALS === 'true'
      : true,
  };
}
