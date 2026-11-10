import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { getAccessTokenSecret } from '../../config/auth-secrets.js';
import { AuthSession } from '../../modules/auth/entities/auth-session.entity.js';
import { Usuario } from '../../modules/usuario/entities/usuario.entity.js';
import { UsuarioRole } from '../enums/usuario-role.enum.js';
import { ERRORS } from '../errors/errors-codes.js';
import { JwtPayload, RequestUser } from '../interfaces/jwt.interface.js';

const JWT_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

/**
 * Valida access token HS256, tip=access, sesión activa y usuario existente.
 * Logout / change-password revocan la sesión → el access deja de servir de inmediato.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.UNAUTHORIZED.CODE,
        message: 'Token de autorización no encontrado o formato inválido',
      });
    }

    const token = authHeader.substring(7);
    let payload: JwtPayload & jwt.JwtPayload;

    try {
      const decoded = jwt.verify(token, getAccessTokenSecret(), {
        algorithms: JWT_ALGORITHMS,
      });

      if (typeof decoded === 'string') {
        throw new UnauthorizedException({
          code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
          message: 'Formato de token inválido',
        });
      }

      payload = decoded as JwtPayload & jwt.JwtPayload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      const name = error instanceof Error ? error.name : '';
      if (name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          code: ERRORS.AUTHENTICATION.TOKEN_EXPIRED.CODE,
          message: ERRORS.AUTHENTICATION.TOKEN_EXPIRED.MESSAGE,
        });
      }

      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
        message: ERRORS.AUTHENTICATION.TOKEN_INVALID.MESSAGE,
      });
    }

    if (payload.typ !== 'access') {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
        message: 'Token inválido para este endpoint',
      });
    }

    if (payload.sub == null || !payload.sid) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
        message: 'Token inválido: faltan claims de sesión. Volvé a iniciar sesión.',
      });
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId < 1) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
        message: ERRORS.AUTHENTICATION.TOKEN_INVALID.MESSAGE,
      });
    }

    const usuario = await this.dataSource.getRepository(Usuario).findOne({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!usuario) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.UNAUTHORIZED.CODE,
        message: 'Usuario no autorizado o inexistente',
      });
    }

    if (!Object.values(UsuarioRole).includes(usuario.role)) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
        message: 'Rol de usuario inválido. Volvé a iniciar sesión.',
      });
    }

    const session = await this.dataSource
      .getRepository(AuthSession)
      .createQueryBuilder('session')
      .select(['session.id', 'session.usuarioId'])
      .where('session.id = :sid', { sid: payload.sid })
      .andWhere('session.usuario_id = :userId', { userId })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.expires_at > :now', { now: new Date() })
      .getOne();

    if (!session) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.UNAUTHORIZED.CODE,
        message: 'Sesión inválida o revocada',
      });
    }

    const user: RequestUser = {
      id: usuario.id,
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      sid: payload.sid,
      iat: payload.iat,
      exp: payload.exp,
    };

    request.user = user;
    return true;
  }
}
