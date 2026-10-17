import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { getAccessTokenSecret } from '../../config/auth-secrets.js';
import { UsuarioRole } from '../enums/usuario-role.enum.js';
import { JwtPayload, RequestUser } from '../interfaces/jwt.interface.js';

/**
 * Guard que valida el access token y popula `request.user` (id, email, role).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Token de autorización no encontrado o formato inválido',
      );
    }

    const token = authHeader.substring(7);

    try {
      const apiSecret = getAccessTokenSecret();
      const decoded = jwt.verify(token, apiSecret);

      if (typeof decoded === 'string') {
        throw new UnauthorizedException('Formato de token inválido');
      }

      const payload = decoded as JwtPayload & jwt.JwtPayload;

      if (payload.sub == null) {
        throw new UnauthorizedException('Token inválido: falta sub');
      }

      if (
        !payload.role ||
        !Object.values(UsuarioRole).includes(payload.role as UsuarioRole)
      ) {
        throw new UnauthorizedException(
          'Token inválido: falta role o el valor no es válido. Volvé a iniciar sesión.',
        );
      }

      const user: RequestUser = {
        id: Number(payload.sub),
        sub: Number(payload.sub),
        email: payload.email,
        role: payload.role as UsuarioRole,
        iat: payload.iat,
        exp: payload.exp,
      };

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expirado');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(`Token inválido: ${error.message}`);
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new UnauthorizedException(`Error al procesar el token: ${message}`);
    }
  }
}
