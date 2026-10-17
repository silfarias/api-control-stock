import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { sanitizeForLog } from '../common/utils/sanitize-log.util.js';

/**
 * Middleware de logging HTTP.
 * Nota: la plantilla original dependía del módulo audit (RequestContext);
 * aquí se mantiene el logging sanitizado sin ese acoplamiento hasta que exista audit.
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('Logging');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip, hostname } = req;
    const reqTime = Date.now();

    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = requestId;

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - reqTime;
      const body = req.body
        ? sanitizeForLog(JSON.parse(JSON.stringify(req.body)))
        : {};

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${responseTime}ms | ip=${ip} host=${hostname} requestId=${requestId} body=${JSON.stringify(body)}`,
      );
    });

    next();
  }
}
