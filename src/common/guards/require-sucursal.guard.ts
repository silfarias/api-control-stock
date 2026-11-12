import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SucursalAccessService } from '../../modules/sucursal/sucursal-access.service.js';
import { ERRORS } from '../errors/errors-codes.js';
import { RequestUser } from '../interfaces/jwt.interface.js';

/** Nombre del header (Node lo normaliza a minúsculas). */
export const SUCURSAL_HEADER = 'x-sucursal-id';

/**
 * Exige el header `x-sucursal-id`, valida que la sucursal exista/esté activa y que el usuario
 * pueda operar en ella, y deja el id resuelto en `request.sucursalId`.
 * Debe usarse DESPUÉS de JwtAuthGuard: `@UseGuards(JwtAuthGuard, RequireSucursalGuard)`.
 * Leer el valor con `@OperativeSucursalId()`.
 */
@Injectable()
export class RequireSucursalGuard implements CanActivate {
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

    request.sucursalId = await this.sucursalAccess.resolveOperativeSucursalId(
      user,
      request.headers?.[SUCURSAL_HEADER],
    );
    return true;
  }
}
