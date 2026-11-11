import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { UpdateUsuarioRequestDto } from './dto/update-usuario-request.dto.js';
import { UsuarioService } from './usuario.service.js';

describe('UsuarioService.update permisos', () => {
  const errorHandler = new ErrorHandlerService();
  const usuarioMapper = {
    updateDTO2Entity: vi.fn(async (_u: unknown, _r: unknown) => _u),
    entity2DTO: vi.fn(async (u: any) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      role: u.role,
    })),
  };
  const authSessionService = { revokeAllForUser: vi.fn() };
  const getEntity = {};
  let saveMock: ReturnType<typeof vi.fn>;
  let service: UsuarioService;

  const empleado: RequestUser = {
    id: 2,
    sub: 2,
    email: 'cajero@test.com',
    role: UsuarioRole.EMPLEADO,
    sid: 's1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    saveMock = vi.fn(async (u: unknown) => u);

    const usuarioRepository = {
      manager: {
        transaction: vi.fn(async (fn: any) => {
          const manager = {
            getRepository: () => ({
              createQueryBuilder: () => ({
                setLock: () => ({
                  where: () => ({
                    getOne: async () => ({
                      id: 2,
                      nombre: 'Cajero',
                      email: 'cajero@test.com',
                      role: UsuarioRole.EMPLEADO,
                      password: 'hash',
                    }),
                  }),
                }),
              }),
              save: saveMock,
            }),
          };
          return fn(manager);
        }),
      },
    };

    service = new UsuarioService(
      usuarioMapper as any,
      usuarioRepository as any,
      getEntity as any,
      errorHandler,
      authSessionService as any,
    );
  });

  it('EMPLEADO puede actualizar su propio perfil', async () => {
    const request = {
      nombre: 'Nuevo nombre',
    } as UpdateUsuarioRequestDto;

    const result = await service.update(2, request, empleado);
    expect(result.nombre).toBeDefined();
    expect(usuarioMapper.updateDTO2Entity).toHaveBeenCalled();
  });

  it('EMPLEADO no puede modificar otro usuario', async () => {
    await expect(
      service.update(99, { nombre: 'X' } as UpdateUsuarioRequestDto, empleado),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('EMPLEADO no puede cambiar su rol', async () => {
    await expect(
      service.update(
        2,
        { role: UsuarioRole.ADMIN } as UpdateUsuarioRequestDto,
        empleado,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
