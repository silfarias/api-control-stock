import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstadoCaja } from '../../common/enums/estado-caja.enum.js';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { CajaService } from './caja.service.js';
import { CerrarCajaRequestDto } from './dto/cerrar-caja-request.dto.js';

describe('CajaService.cerrar permisos', () => {
  const errorHandler = new ErrorHandlerService();
  const cajaMapper = {
    entity2DTO: vi.fn(async (caja: any) => ({
      id: caja.id,
      estado: caja.estado,
      usuario: caja.usuario,
      usuarioCierre: caja.usuarioCierre,
    })),
  };
  const movimientoCajaMapper = {};
  const movimientoCajaRepository = {
    sumarPorCaja: vi.fn(async () => ({
      ventas: 0,
      ingresos: 0,
      egresos: 0,
    })),
  };

  let saveMock: ReturnType<typeof vi.fn>;
  let findByIdWithUsuario: ReturnType<typeof vi.fn>;
  let service: CajaService;

  const empleado: RequestUser = {
    id: 2,
    sub: 2,
    email: 'emp@test.com',
    role: UsuarioRole.EMPLEADO,
    sid: 's2',
  };

  const admin: RequestUser = {
    id: 1,
    sub: 1,
    email: 'admin@test.com',
    role: UsuarioRole.ADMIN,
    sid: 's1',
  };

  function buildService(cajaAbierta: Record<string, unknown> | null) {
    saveMock = vi.fn(async (c: unknown) => c);
    findByIdWithUsuario = vi.fn(async () => ({
      ...cajaAbierta,
      estado: EstadoCaja.CERRADA,
      usuarioCierre: { id: empleado.id },
    }));

    const cajaRepository = {
      manager: {
        transaction: vi.fn(async (fn: any) => {
          const manager = {
            getRepository: () => ({
              createQueryBuilder: () => ({
                setLock: () => ({
                  leftJoinAndSelect: () => ({
                    where: () => ({
                      getOne: async () => cajaAbierta,
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
      findByIdWithUsuario,
      syncNumeracion: vi.fn(),
    };

    return new CajaService(
      cajaRepository as any,
      movimientoCajaRepository as any,
      cajaMapper as any,
      movimientoCajaMapper as any,
      errorHandler,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EMPLEADO puede cerrar su propia caja', async () => {
    service = buildService({
      id: 10,
      estado: EstadoCaja.ABIERTA,
      montoApertura: 1000,
      usuario: { id: 2 },
    });

    const result = await service.cerrar(
      10,
      { montoCierre: 1000 } as CerrarCajaRequestDto,
      empleado,
    );

    expect(result.montoCierre).toBe(1000);
    expect(saveMock).toHaveBeenCalled();
    const saved = saveMock.mock.calls[0][0];
    expect(saved.usuarioCierre.id).toBe(2);
    expect(saved.estado).toBe(EstadoCaja.CERRADA);
  });

  it('EMPLEADO no puede cerrar la caja de otro (403)', async () => {
    service = buildService({
      id: 10,
      estado: EstadoCaja.ABIERTA,
      montoApertura: 1000,
      usuario: { id: 99 },
    });

    await expect(
      service.cerrar(10, { montoCierre: 1000 } as CerrarCajaRequestDto, empleado),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('EMPLEADO no puede cerrar caja sin opener acreditado', async () => {
    service = buildService({
      id: 10,
      estado: EstadoCaja.ABIERTA,
      montoApertura: 1000,
      usuario: undefined,
    });

    await expect(
      service.cerrar(10, { montoCierre: 1000 } as CerrarCajaRequestDto, empleado),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ADMIN puede cerrar cualquier caja', async () => {
    service = buildService({
      id: 10,
      estado: EstadoCaja.ABIERTA,
      montoApertura: 1000,
      usuario: { id: 2 },
    });

    findByIdWithUsuario.mockResolvedValue({
      id: 10,
      estado: EstadoCaja.CERRADA,
      usuario: { id: 2 },
      usuarioCierre: { id: 1 },
    });

    const result = await service.cerrar(
      10,
      { montoCierre: 1500 } as CerrarCajaRequestDto,
      admin,
    );
    expect(result.montoCierre).toBe(1500);
    expect(saveMock.mock.calls[0][0].usuarioCierre.id).toBe(1);
  });
});
