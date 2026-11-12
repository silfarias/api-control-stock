import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SucursalAccessService } from '../../modules/sucursal/sucursal-access.service.js';
import { ERRORS } from '../errors/errors-codes.js';
import { RequestUser } from '../interfaces/jwt.interface.js';
import { SUCURSAL_HEADER } from './require-sucursal.guard.js';

/**
 * Variante tolerante de `RequireSucursalGuard`: el header `x-sucursal-id` es OPCIONAL.
 * - Sin header: `request.sucursalId` queda `undefined` (el endpoint responde sin contexto de sucursal).
 * - Con header: se valida igual que en `RequireSucursalGuard` (400/404/403 según corresponda).
 * Debe usarse DESPUÉS de JwtAuthGuard. Leer el valor con `@OperativeSucursalId()`.
 */
@Injectable()
export class OptionalSucursalGuard implements CanActivate {
  constructor(private readonly sucursalAccess: SucursalAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user?.id) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.UNAUTHORIZED.CODE,
        message: ERRORS.AUTHENTICATION.UNAUTHORIZED.MESSAGE,
      });
    }

    request.sucursalId =
      await this.sucursalAccess.resolveOptionalOperativeSucursalId(
        user,
        request.headers?.[SUCURSAL_HEADER],
      );
    return true;
  }
}
