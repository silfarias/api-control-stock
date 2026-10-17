import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsuarioRole } from '../enums/usuario-role.enum.js';
import { ERRORS } from '../errors/errors-codes.js';
import { RequestUser } from '../interfaces/jwt.interface.js';

/**
 * Restringe el endpoint a usuarios con role ADMIN.
 * Debe usarse junto con JwtAuthGuard (antes en la cadena):
 * `@UseGuards(JwtAuthGuard, AdminGuard)`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user?.id) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.UNAUTHORIZED.CODE,
        message: ERRORS.AUTHENTICATION.UNAUTHORIZED.MESSAGE,
      });
    }

    if (user.role !== UsuarioRole.ADMIN) {
      throw new ForbiddenException({
        code: ERRORS.AUTHORIZATION.INSUFFICIENT_PERMISSIONS.CODE,
        message: ERRORS.AUTHORIZATION.INSUFFICIENT_PERMISSIONS.MESSAGE,
        details: 'Se requiere rol ADMIN',
      });
    }

    return true;
  }
}