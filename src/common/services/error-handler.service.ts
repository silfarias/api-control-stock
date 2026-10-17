import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { ERRORS } from '../errors/errors-codes.js';

/** Entrada del diccionario de errores (CODE y MESSAGE). */
type ErrorCatalog = typeof ERRORS;
type NestedValues<T> = T extends object ? T[keyof T] : never;
export type ErrorEntry = NestedValues<NestedValues<ErrorCatalog>>;

/** Detalles opcionales: objeto (se serializa a JSON) o string. */
export type ErrorDetails = object | string;

/** Cuerpo estándar de error que devuelve la API. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: string;
}

@Injectable()
export class ErrorHandlerService {
  /**
   * Formatea los detalles para el cuerpo del error.
   * - object -> JSON.stringify
   * - string -> tal cual
   */
  formatDetails(details?: ErrorDetails): string | undefined {
    if (details == null) return undefined;
    if (typeof details === 'string') return details;
    try {
      return JSON.stringify(details);
    } catch {
      // Fallback para objetos con referencias circulares.
      return String(details);
    }
  }

  /**
   * Construye el cuerpo estándar de error usado en toda la API.
   */
  buildErrorBody(entry: ErrorEntry, details?: ErrorDetails): ApiErrorBody {
    const body: ApiErrorBody = {
      code: entry.CODE,
      message: entry.MESSAGE,
    };
    const formatted = this.formatDetails(details);
    if (formatted != null) body.details = formatted;
    return body;
  }

  /**
   * Lanza la excepción HTTP apropiada según el código de error de catálogo.
   */
  private throwByEntry(entry: ErrorEntry, details?: ErrorDetails): never {
    const body = this.buildErrorBody(entry, details);
    switch (entry.CODE) {
      case ERRORS.DATABASE.DUPLICATE_RECORD.CODE:
        throw new ConflictException(body);
      case ERRORS.DATABASE.RECORD_NOT_FOUND.CODE:
        throw new NotFoundException(body);
      case ERRORS.AUTHENTICATION.UNAUTHORIZED.CODE:
      case ERRORS.AUTHENTICATION.INVALID_CREDENTIALS.CODE:
      case ERRORS.AUTHENTICATION.TOKEN_EXPIRED.CODE:
      case ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE:
      case ERRORS.AUTHENTICATION.ACCOUNT_DISABLED.CODE:
      case ERRORS.SESSION.SESSION_EXPIRED.CODE:
      case ERRORS.SESSION.INVALID_SESSION.CODE:
      case ERRORS.SESSION.SESSION_NOT_FOUND.CODE:
        throw new UnauthorizedException(body);
      case ERRORS.AUTHORIZATION.FORBIDDEN.CODE:
      case ERRORS.AUTHORIZATION.INSUFFICIENT_PERMISSIONS.CODE:
        throw new ForbiddenException(body);
      case ERRORS.SERVER.INTERNAL_ERROR.CODE:
      case ERRORS.SERVER.SERVICE_UNAVAILABLE.CODE:
        throw new InternalServerErrorException(body);
      default:
        throw new BadRequestException(body);
    }
  }

  // --- Métodos para lanzar excepciones HTTP con ERRORS ---

  throwNotFound(entry: ErrorEntry = ERRORS.DATABASE.RECORD_NOT_FOUND, details?: ErrorDetails): never {
    throw new NotFoundException(this.buildErrorBody(entry, details));
  }

  throwBadRequest(entry: ErrorEntry = ERRORS.VALIDATION.INVALID_INPUT, details?: ErrorDetails): never {
    throw new BadRequestException(this.buildErrorBody(entry, details));
  }

  throwUnauthorized(entry: ErrorEntry = ERRORS.AUTHENTICATION.UNAUTHORIZED, details?: ErrorDetails): never {
    throw new UnauthorizedException(this.buildErrorBody(entry, details));
  }

  throwForbidden(entry: ErrorEntry = ERRORS.AUTHORIZATION.FORBIDDEN, details?: ErrorDetails): never {
    throw new ForbiddenException(this.buildErrorBody(entry, details));
  }

  throwConflict(entry: ErrorEntry = ERRORS.DATABASE.DUPLICATE_RECORD, details?: ErrorDetails): never {
    throw new ConflictException(this.buildErrorBody(entry, details));
  }

  throwInternalError(entry: ErrorEntry = ERRORS.SERVER.INTERNAL_ERROR, details?: ErrorDetails): never {
    throw new InternalServerErrorException(this.buildErrorBody(entry, details));
  }

  /**
   * Indica si el error es una excepción HTTP de Nest (para reenviarla sin envolver).
   */
  isHttpException(error: unknown): error is HttpException {
    return error instanceof HttpException;
  }

  /**
   * Intenta inferir un error del diccionario a partir de errores conocidos (p. ej. TypeORM).
   * Retorna la entrada de error sugerida o null si no aplica.
   */
  inferErrorFromUnknown(error: unknown): { entry: ErrorEntry; details?: string } | null {
    if (this.isHttpException(error)) return null;

    const message = error instanceof Error ? error.message : String(error);

    // TypeORM QueryFailedError (Postgres / MySQL)
    const qfe = error as {
      code?: string | number;
      errno?: number;
      driverError?: { code?: string | number; errno?: number; detail?: string; sqlMessage?: string };
    };
    const dbCode = String(qfe.driverError?.code ?? qfe.code ?? '');
    const errno = qfe.driverError?.errno ?? qfe.errno;
    if (dbCode || errno) {
      // MySQL: ER_DUP_ENTRY (1062) | Postgres: 23505
      if (dbCode === 'ER_DUP_ENTRY' || dbCode === '23505' || errno === 1062) {
        return {
          entry: ERRORS.DATABASE.DUPLICATE_RECORD,
          details: qfe.driverError?.sqlMessage ?? qfe.driverError?.detail ?? message,
        };
      }
      // Postgres FK / invalid input
      if (dbCode === '23503') {
        return {
          entry: ERRORS.DATABASE.QUERY_FAILED,
          details: qfe.driverError?.detail ?? message,
        };
      }
      if (dbCode === '22P02' || dbCode === '23502') {
        return {
          entry: ERRORS.VALIDATION.INVALID_INPUT,
          details: qfe.driverError?.detail ?? message,
        };
      }
      return {
        entry: ERRORS.DATABASE.QUERY_FAILED,
        details: message,
      };
    }

    return null;
  }

  /**
   * Maneja un error capturado en un try/catch:
   * - Si ya es una excepción HTTP de Nest, la re-lanza.
   * - Si se puede inferir (p. ej. TypeORM duplicado), lanza la excepción adecuada.
   * - En caso contrario, lanza BadRequestException (o InternalServerError) con la entrada por defecto.
   *
   * @param error - Error capturado (unknown).
   * @param defaultEntry - Entrada del diccionario por defecto (ej: ERRORS.VALIDATION.INVALID_INPUT).
   * @param useInternalForUnknown - Si true, errores no reconocidos se mapean a INTERNAL_ERROR en lugar de INVALID_INPUT.
   */
  handleError(
    error: unknown,
    defaultEntry: ErrorEntry = ERRORS.VALIDATION.INVALID_INPUT,
    useInternalForUnknown = false,
  ): never {
    if (this.isHttpException(error)) throw error;

    const inferred = this.inferErrorFromUnknown(error);
    if (inferred) {
      this.throwByEntry(inferred.entry, inferred.details);
    }

    const details = error instanceof Error ? error.message : String(error);
    const entry = useInternalForUnknown ? ERRORS.SERVER.INTERNAL_ERROR : defaultEntry;
    this.throwByEntry(entry, details);
  }
}