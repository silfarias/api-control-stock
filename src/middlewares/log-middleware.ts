import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { sanitizeForLog } from '../common/utils/sanitize-log.util.js';

/**
 * Logging HTTP sanitizado (sin passwords, tokens ni Authorization).
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
      let body: unknown = {};
      try {
        if (req.body && typeof req.body === 'object') {
          body = sanitizeForLog(structuredClone(req.body));
        }
      } catch {
        body = '[unserializable]';
      }

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${responseTime}ms | ip=${ip} host=${hostname} requestId=${requestId} body=${JSON.stringify(body)}`,
      );
    });

    next();
  }
}
