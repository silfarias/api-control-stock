import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  getAccessTokenSecret,
  getRefreshTokenSecret,
} from '../../../config/auth-secrets.js';
import { ERRORS } from '../../../common/errors/errors-codes.js';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';
import { AuthSession } from '../entities/auth-session.entity.js';
import { AuthSessionRepository } from '../repository/auth-session.repository.js';
import {
  expiresAtFromDuration,
  hashRefreshToken,
  newSessionId,
  toDate,
} from '../utils/token-crypto.js';

export type SessionMeta = {
  userAgent?: string | null;
  ip?: string | null;
};

export type IssuedTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: string;
  sessionId: string;
};

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly jwtService: JwtService,
  ) {}

  getAccessTokenExpiresIn(): string {
    return process.env.ACCESS_TOKEN_EXPIRES_IN?.trim() || '15m';
  }

  getRefreshTokenExpiresIn(): string {
    return process.env.ACCESS_TOKEN_REFRESH_EXPIRES_IN?.trim() || '30d';
  }

  /**
   * Login / seed: crea sesión nueva e emite access + refresh.
   */
  async issueNewSession(
    usuario: UsuarioDTO,
    meta: SessionMeta = {},
  ): Promise<IssuedTokens> {
    const sessionId = newSessionId();
    const tokens = this.signTokenPair(usuario, sessionId);
    const session = this.authSessionRepository.create({
      id: sessionId,
      usuarioId: usuario.id,
      refreshTokenHash: hashRefreshToken(tokens.refresh_token),
      expiresAt: expiresAtFromDuration(this.getRefreshTokenExpiresIn()),
      revokedAt: null,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ip: meta.ip?.slice(0, 64) ?? null,
    });
    await this.authSessionRepository.save(session);
    return { ...tokens, sessionId };
  }

  /**
   * Rotación atómica del refresh (SELECT … FOR UPDATE).
   *
   * Política ante hash distinto (token ya rotado / concurrente / robado):
   * solo 401. No se revoca esta sesión ni las demás.
   *
   * Motivo: un refresh concurrente o una respuesta perdida no debe
   * cerrar otros dispositivos ni invalidar el par que ya ganó la carrera.
   * Seguridad: el refresh anterior nunca emite un par nuevo (exige hash actual).
   */
  async rotateSession(
    refreshToken: string,
    usuario: UsuarioDTO,
    sessionId: string,
  ): Promise<IssuedTokens> {
    const presentedHash = hashRefreshToken(refreshToken);

    return this.authSessionRepository.manager.transaction(async (manager) => {
      const session = await this.authSessionRepository.findByIdForUpdate(
        manager,
        sessionId,
      );

      if (!session || session.usuarioId !== usuario.id) {
        throw new UnauthorizedException({
          code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
          message: 'Refresh token inválido o expirado',
        });
      }

      if (session.revokedAt) {
        throw new UnauthorizedException({
          code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
          message: 'Sesión revocada. Volvé a iniciar sesión.',
        });
      }

      if (toDate(session.expiresAt).getTime() <= Date.now()) {
        session.revokedAt = new Date();
        await manager.getRepository(AuthSession).save(session);
        throw new UnauthorizedException({
          code: ERRORS.AUTHENTICATION.TOKEN_EXPIRED.CODE,
          message: 'Refresh token expirado',
        });
      }

      if (session.refreshTokenHash !== presentedHash) {
        throw new UnauthorizedException({
          code: ERRORS.AUTHENTICATION.TOKEN_INVALID.CODE,
          message: 'Refresh token inválido o ya utilizado',
        });
      }

      const tokens = this.signTokenPair(usuario, sessionId);
      session.refreshTokenHash = hashRefreshToken(tokens.refresh_token);
      session.expiresAt = expiresAtFromDuration(this.getRefreshTokenExpiresIn());
      await manager.getRepository(AuthSession).save(session);

      return { ...tokens, sessionId };
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.authSessionRepository.revokeById(sessionId);
  }

  async revokeAllForUser(usuarioId: number): Promise<void> {
    await this.authSessionRepository.revokeAllForUser(usuarioId);
  }

  async assertSessionActive(
    sessionId: string,
    usuarioId: number,
  ): Promise<void> {
    const session = await this.authSessionRepository.findActiveById(sessionId);
    if (!session || session.usuarioId !== usuarioId) {
      throw new UnauthorizedException({
        code: ERRORS.AUTHENTICATION.UNAUTHORIZED.CODE,
        message: 'Sesión inválida o revocada',
      });
    }
  }

  private signTokenPair(
    usuario: UsuarioDTO,
    sessionId: string,
  ): Omit<IssuedTokens, 'sessionId'> {
    const access_token = this.jwtService.sign(
      {
        sub: usuario.id,
        email: usuario.email,
        role: usuario.role,
        sid: sessionId,
        typ: 'access',
      },
      {
        secret: getAccessTokenSecret(),
        expiresIn: this.getAccessTokenExpiresIn() as any,
        algorithm: 'HS256',
      },
    );

    const refresh_token = this.jwtService.sign(
      {
        sub: usuario.id,
        sid: sessionId,
        typ: 'refresh',
      },
      {
        secret: getRefreshTokenSecret(),
        expiresIn: this.getRefreshTokenExpiresIn() as any,
        algorithm: 'HS256',
      },
    );

    return {
      access_token,
      refresh_token,
      expires_in: this.getAccessTokenExpiresIn(),
    };
  }
}
