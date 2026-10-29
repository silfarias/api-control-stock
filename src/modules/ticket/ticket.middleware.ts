import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const ALLOWED = [
  'paperMm',
  'comercio',
  'direccion',
  'telefono',
  'cuit',
  'mensaje',
] as const;

/**
 * Deja solo los campos editables y recorta textos.
 * id, fechas y claves desconocidas no llegan al validador.
 */
@Injectable()
export class TicketBodyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      next();
      return;
    }

    const source = req.body as Record<string, unknown>;
    const clean: Record<string, unknown> = {};

    for (const key of ALLOWED) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const value = source[key];
      clean[key] = typeof value === 'string' ? value.trim() : value;
    }

    req.body = clean;
    next();
  }
}
