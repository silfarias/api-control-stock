import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { UsuarioRole } from '../enums/usuario-role.enum.js';
import { ERRORS } from '../errors/errors-codes.js';
import { RequestUser } from '../interfaces/jwt.interface.js';

/**
 * Valida que `request.user.role` esté entre los roles declarados con `@Roles(...)`.
 * Debe usarse después de JwtAuthGuard:
 * `@Roles(UsuarioRole.ADMIN)`
 * `@UseGuards(JwtAuthGuard, RolesGuard)`
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UsuarioRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user?.id) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.UNAUTHORIZED.CODE,
        message: ERRORS.AUTHENTICATION.UNAUTHORIZED.MESSAGE,
      });
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        code: ERRORS.AUTHORIZATION.INSUFFICIENT_PERMISSIONS.CODE,
        message: ERRORS.AUTHORIZATION.INSUFFICIENT_PERMISSIONS.MESSAGE,
        details: `Se requiere uno de: ${requiredRoles.join(', ')}`,
      });
    }

    return true;
  }
}
