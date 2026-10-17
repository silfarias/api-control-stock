import {
  HttpException,
  Logger,
  ExceptionFilter,
  ArgumentsHost,
  Catch,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  isProductionEnv,
  sanitizeForLog,
  sanitizeHeaders,
} from '../common/utils/sanitize-log.util.js';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = exception.getStatus();
    const isProd = isProductionEnv();

    this.logger.warn(
      `HTTP ${status} ${request.method} ${request.url} — ${exception.message}`,
    );

    if (!isProd) {
      this.logger.debug(
        `Detalle: params=${JSON.stringify(sanitizeForLog(request.params))} body=${JSON.stringify(sanitizeForLog(request.body))}`,
      );
      this.logger.debug(
        `Headers: ${JSON.stringify(sanitizeHeaders(request.headers as Record<string, unknown>))}`,
      );
      if (exception.stack) {
        this.logger.debug(`Stack: ${exception.stack}`);
      }
    }

    const errorDetails = exception.getResponse();
    response.status(status).json({ error: true, errorDetails });
  }
}
