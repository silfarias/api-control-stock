import { UsuarioRole } from '../enums/usuario-role.enum.js';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UsuarioRole;
  /** Id de sesión (auth_session.id). */
  sid: string;
  /** 'access' | 'refresh' — evita usar un token en el flujo incorrecto. */
  typ: 'access' | 'refresh';
}

/** Usuario autenticado adjunto a `request.user` por JwtAuthGuard. */
export interface RequestUser {
  id: number;
  sub: number;
  email: string;
  role: UsuarioRole;
  sid: string;
  iat?: number;
  exp?: number;
}
