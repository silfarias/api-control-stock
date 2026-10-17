import { UsuarioRole } from '../enums/usuario-role.enum.js';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UsuarioRole;
}

/** Usuario autenticado adjunto a `request.user` por JwtAuthGuard. */
export interface RequestUser {
  id: number;
  sub: number;
  email: string;
  role: UsuarioRole;
  iat?: number;
  exp?: number;
}
