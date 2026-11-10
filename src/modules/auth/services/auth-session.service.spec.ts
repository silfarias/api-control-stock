import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';
import { hashRefreshToken } from '../utils/token-crypto.js';
import { AuthSessionService } from './auth-session.service.js';

function buildUsuario(): UsuarioDTO {
  return {
    id: 1,
    nombre: 'Test',
    email: 'test@example.com',
    role: UsuarioRole.ADMIN,
  } as UsuarioDTO;
}

describe('AuthSessionService.rotateSession', () => {
  const jwtService = {
    sign: vi.fn((payload: { typ: string }) => `signed-${payload.typ}`),
  };

  const sessionRepo = {
    manager: {
      transaction: vi.fn(),
    },
    findByIdForUpdate: vi.fn(),
  };

  let service: AuthSessionService;
  let saveMock: ReturnType<typeof vi.fn>;
  let executeRevokeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ACCESS_TOKEN_SECRET = 'access-secret-123456';
    process.env.ACCESS_TOKEN_REFRESH_SECRET = 'refresh-secret-123456';
    process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
    process.env.ACCESS_TOKEN_REFRESH_EXPIRES_IN = '30d';

    saveMock = vi.fn(async (s: unknown) => s);
    executeRevokeMock = vi.fn();

    service = new AuthSessionService(sessionRepo as any, jwtService as any);
  });

  function mockTx(session: Record<string, unknown> | null) {
    sessionRepo.manager.transaction.mockImplementation(async (fn: any) => {
      const manager = {
        getRepository: () => ({
          save: saveMock,
          createQueryBuilder: () => ({
            update: () => ({
              set: () => ({
                where: () => ({
                  andWhere: () => ({ execute: executeRevokeMock }),
                }),
              }),
            }),
          }),
        }),
      };
      sessionRepo.findByIdForUpdate.mockResolvedValue(session);
      return fn(manager);
    });
  }

  it('rota el refresh cuando el hash coincide', async () => {
    const oldToken = 'old-refresh-token';
    const session = {
      id: 'sid-1',
      usuarioId: 1,
      refreshTokenHash: hashRefreshToken(oldToken),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };
    mockTx(session);

    const result = await service.rotateSession(
      oldToken,
      buildUsuario(),
      'sid-1',
    );

    expect(result.access_token).toBe('signed-access');
    expect(result.refresh_token).toBe('signed-refresh');
    expect(session.refreshTokenHash).toBe(hashRefreshToken('signed-refresh'));
    expect(executeRevokeMock).not.toHaveBeenCalled();
  });

  it('hash distinto → 401 y no revoca sesiones (concurrente / token viejo / robado)', async () => {
    const session = {
      id: 'sid-1',
      usuarioId: 1,
      refreshTokenHash: hashRefreshToken('current-token'),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };
    mockTx(session);

    await expect(
      service.rotateSession('stale-token', buildUsuario(), 'sid-1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(executeRevokeMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
    // La sesión ganadora de una carrera concurrente sigue intacta
    expect(session.refreshTokenHash).toBe(hashRefreshToken('current-token'));
    expect(session.revokedAt).toBeNull();
  });

  it('simula segundo refresh concurrente: el token ya rotado no emite otro par', async () => {
    const original = 'shared-refresh';
    const session = {
      id: 'sid-1',
      usuarioId: 1,
      refreshTokenHash: hashRefreshToken(original),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };
    mockTx(session);

    const first = await service.rotateSession(original, buildUsuario(), 'sid-1');
    expect(first.refresh_token).toBe('signed-refresh');

    // Segundo intento con el mismo token original (como en carrera o pestaña vieja)
    await expect(
      service.rotateSession(original, buildUsuario(), 'sid-1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(executeRevokeMock).not.toHaveBeenCalled();
    expect(session.revokedAt).toBeNull();
  });

  it('refresh de sesión inexistente → 401 sin revocación masiva', async () => {
    mockTx(null);

    await expect(
      service.rotateSession('any', buildUsuario(), 'missing'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(executeRevokeMock).not.toHaveBeenCalled();
  });
});
