import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRefreshTokenSecret } from '../../config/auth-secrets.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { CreateUsuarioRequestDto } from '../usuario/dto/create-usuario-request.dto.js';
import { UsuarioDTO } from '../usuario/dto/usuario.dto.js';
import { UsuarioService } from '../usuario/usuario.service.js';
import { ChangePasswordRequestDto } from './dto/change-password-request.dto.js';
import { ChangePasswordResponseDto } from './dto/change-password-response.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { SeedAdminResponseDto } from './dto/seed-admin-response.dto.js';
import { SignupRequestDto } from './dto/signup-request.dto.js';
import { SignupResponseDto } from './dto/signup-response.dto.js';
import {
  AuthSessionService,
  SessionMeta,
} from './services/auth-session.service.js';

type RefreshJwtPayload = {
  sub: number | string;
  sid?: string;
  typ?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly jwtService: JwtService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async validateUser(email: string, password: string): Promise<UsuarioDTO> {
    return this.usuarioService.login(email, password);
  }

  async login(
    usuario: UsuarioDTO,
    meta: SessionMeta = {},
  ): Promise<LoginResponseDto> {
    const tokens = await this.authSessionService.issueNewSession(usuario, meta);
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      usuario,
    };
  }

  async refreshTokens(refreshToken: string): Promise<LoginResponseDto> {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException({
        code: ERRORS.VALIDATION.INVALID_INPUT.CODE,
        message: 'Refresh token es requerido',
      });
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: getRefreshTokenSecret(),
        algorithms: ['HS256'],
      }) as RefreshJwtPayload;

      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException({
          code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
          message: 'Refresh token inválido',
        });
      }

      const userId =
        typeof payload.sub === 'string'
          ? parseInt(payload.sub, 10)
          : payload.sub;

      if (!Number.isInteger(userId) || userId < 1 || !payload.sid) {
        throw new UnauthorizedException({
          code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
          message: 'Refresh token inválido',
        });
      }

      const usuario = await this.usuarioService.findOne(userId);
      const tokens = await this.authSessionService.rotateSession(
        refreshToken,
        usuario,
        payload.sid,
      );

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        usuario,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      if (err instanceof NotFoundException) {
        throw new UnauthorizedException({
          code: ERRORS.AUTHENTICATION.UNAUTHORIZED.CODE,
          message: 'Usuario no autorizado o inexistente',
        });
      }
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
        message: 'Refresh token inválido o expirado',
      });
    }
  }

  async signup(signupDto: SignupRequestDto): Promise<SignupResponseDto> {
    const createDto: CreateUsuarioRequestDto = {
      nombre: signupDto.nombre,
      email: signupDto.email,
      password: signupDto.password,
      role: UsuarioRole.EMPLEADO,
    };

    const usuario = await this.usuarioService.create(createDto);
    const tokens = await this.authSessionService.issueNewSession(usuario);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      usuario,
      message: 'Usuario registrado y autenticado exitosamente',
    };
  }

  /**
   * Crea el usuario ADMIN inicial (idempotente).
   * Solo en no-producción y con SEED_ADMIN_ENABLED=true.
   */
  async seedAdmin(): Promise<SeedAdminResponseDto> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException({
        code: ERRORS.AUTHORIZATION.FORBIDDEN.CODE,
        message: 'Seed admin no está disponible en producción',
      });
    }

    if (process.env.SEED_ADMIN_ENABLED !== 'true') {
      throw new ForbiddenException({
        code: ERRORS.AUTHORIZATION.FORBIDDEN.CODE,
        message:
          'Seed admin deshabilitado. Seteá SEED_ADMIN_ENABLED=true en .env',
      });
    }

    const nombre = process.env.SEED_ADMIN_NOMBRE?.trim();
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD?.trim();

    if (!nombre || !email || !password) {
      throw new ForbiddenException({
        code: ERRORS.AUTHORIZATION.FORBIDDEN.CODE,
        message:
          'Seed admin incompleto. Definí SEED_ADMIN_NOMBRE, SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env',
      });
    }

    const existente = await this.usuarioService.findByEmail(email);
    if (existente) {
      const tokens = await this.authSessionService.issueNewSession(existente);
      return {
        created: false,
        message: 'El usuario admin ya existía',
        usuario: existente,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
      };
    }

    const createDto: CreateUsuarioRequestDto = {
      nombre,
      email,
      password,
      role: UsuarioRole.ADMIN,
    };

    const usuario = await this.usuarioService.create(createDto);
    const tokens = await this.authSessionService.issueNewSession(usuario);

    return {
      created: true,
      message: 'Usuario admin creado correctamente',
      usuario,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    };
  }

  async getCurrentUser(userId: number): Promise<UsuarioDTO> {
    return this.usuarioService.findOne(userId);
  }

  /**
   * Cambia password y revoca TODAS las sesiones del usuario
   * (incluida la actual). El access vigente deja de servir en el próximo request
   * porque el guard valida sesión activa.
   */
  async changePassword(
    changePasswordDto: ChangePasswordRequestDto,
    userId: number,
  ): Promise<ChangePasswordResponseDto> {
    // UsuarioService.changePassword ya revoca todas las sesiones.
    const usuario = await this.usuarioService.changePassword(
      userId,
      changePasswordDto.password,
    );
    return {
      message:
        'Contraseña cambiada exitosamente. Volvé a iniciar sesión.',
      usuario,
    };
  }

  /**
   * Revoca la sesión del access token actual.
   * El access token deja de ser aceptado de inmediato (guard chequea sesión).
   */
  async logout(userId: number, sessionId?: string): Promise<{ message: string }> {
    if (sessionId) {
      await this.authSessionService.revokeSession(sessionId);
    } else {
      await this.authSessionService.revokeAllForUser(userId);
    }
    return { message: 'Sesión cerrada exitosamente' };
  }
}
