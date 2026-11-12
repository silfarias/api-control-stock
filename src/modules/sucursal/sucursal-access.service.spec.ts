import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { SucursalAccessService } from './sucursal-access.service.js';

const admin: RequestUser = {
  id: 1,
  sub: 1,
  email: 'admin@test.com',
  role: UsuarioRole.ADMIN,
  sid: 's1',
};

const empleado: RequestUser = {
  id: 2,
  sub: 2,
  email: 'emp@test.com',
  role: UsuarioRole.EMPLEADO,
  sid: 's2',
};

function errorCode(fn: () => Promise<unknown>) {
  return fn().then(
    () => null,
    (e: { getResponse: () => { code: string } }) => ({
      error: e,
      code: e.getResponse().code,
    }),
  );
}

describe('SucursalAccessService', () => {
  const errorHandler = new ErrorHandlerService();
  let sucursales: Record<number, { id: number; activo: boolean; deletedAt?: Date }>;
  let asignaciones: { usuarioId: number; sucursal: { id: number; deletedAt?: Date } }[];
  let service: SucursalAccessService;

  beforeEach(() => {
    sucursales = {
      1: { id: 1, activo: true },
      2: { id: 2, activo: true },
      3: { id: 3, activo: false },
    };
    asignaciones = [{ usuarioId: 2, sucursal: { id: 1 } }];

    const sucursalRepository = {
      findOne: vi.fn(async ({ where }: { where: { id: number } }) => sucursales[where.id] ?? null),
    };
    const usuarioSucursalRepository = {
      count: vi.fn(
        async ({ where }: { where: { usuario: { id: number }; sucursal: { id: number } } }) =>
          asignaciones.filter(
            (a) => a.usuarioId === where.usuario.id && a.sucursal.id === where.sucursal.id,
          ).length,
      ),
      find: vi.fn(async ({ where }: { where: { usuario: { id: number } } }) =>
        asignaciones.filter((a) => a.usuarioId === where.usuario.id),
      ),
    };

    service = new SucursalAccessService(
      sucursalRepository as any,
      usuarioSucursalRepository as any,
      errorHandler,
    );
  });

  describe('assertActiva', () => {
    it('devuelve la sucursal si está activa', async () => {
      await expect(service.assertActiva(1)).resolves.toMatchObject({ id: 1 });
    });

    it('404 si no existe', async () => {
      const result = await errorCode(() => service.assertActiva(99));
      expect(result?.error).toBeInstanceOf(NotFoundException);
      expect(result?.code).toBe(ERRORS.SUCURSAL.NOT_FOUND.CODE);
    });

    it('400 si está inactiva', async () => {
      const result = await errorCode(() => service.assertActiva(3));
      expect(result?.error).toBeInstanceOf(BadRequestException);
      expect(result?.code).toBe(ERRORS.SUCURSAL.INACTIVA.CODE);
    });
  });

  describe('assertUsuarioPuedeOperar', () => {
    it('ADMIN puede operar en cualquier sucursal activa sin asignación', async () => {
      await expect(service.assertUsuarioPuedeOperar(admin, 2)).resolves.toBeUndefined();
    });

    it('EMPLEADO puede operar en una sucursal asignada', async () => {
      await expect(service.assertUsuarioPuedeOperar(empleado, 1)).resolves.toBeUndefined();
    });

    it('EMPLEADO recibe 403 en una sucursal no asignada', async () => {
      const result = await errorCode(() => service.assertUsuarioPuedeOperar(empleado, 2));
      expect(result?.error).toBeInstanceOf(ForbiddenException);
      expect(result?.code).toBe(ERRORS.SUCURSAL.ACCESO_DENEGADO.CODE);
    });

    it('ADMIN no puede operar en una sucursal inactiva', async () => {
      const result = await errorCode(() => service.assertUsuarioPuedeOperar(admin, 3));
      expect(result?.code).toBe(ERRORS.SUCURSAL.INACTIVA.CODE);
    });
  });

  describe('listSucursalIdsForUser', () => {
    it('ADMIN devuelve null (todas)', async () => {
      await expect(service.listSucursalIdsForUser(admin)).resolves.toBeNull();
    });

    it('EMPLEADO devuelve solo sus sucursales asignadas', async () => {
      await expect(service.listSucursalIdsForUser(empleado)).resolves.toEqual([1]);
    });

    it('EMPLEADO ignora asignaciones a sucursales eliminadas', async () => {
      asignaciones.push({ usuarioId: 2, sucursal: { id: 2, deletedAt: new Date() } });
      await expect(service.listSucursalIdsForUser(empleado)).resolves.toEqual([1]);
    });

    it('EMPLEADO sin asignaciones devuelve []', async () => {
      asignaciones = [];
      await expect(service.listSucursalIdsForUser(empleado)).resolves.toEqual([]);
    });
  });

  describe('resolveOptionalOperativeSucursalId', () => {
    it('sin header retorna undefined', async () => {
      for (const value of [undefined, null, '', '   ']) {
        await expect(
          service.resolveOptionalOperativeSucursalId(empleado, value),
        ).resolves.toBeUndefined();
      }
    });

    it('con header válido valida acceso igual que el requerido', async () => {
      await expect(
        service.resolveOptionalOperativeSucursalId(empleado, '1'),
      ).resolves.toBe(1);
      const result = await errorCode(() =>
        service.resolveOptionalOperativeSucursalId(empleado, '2'),
      );
      expect(result?.code).toBe(ERRORS.SUCURSAL.ACCESO_DENEGADO.CODE);
    });

    it('con header inválido → HEADER_INVALIDO', async () => {
      const result = await errorCode(() =>
        service.resolveOptionalOperativeSucursalId(admin, 'abc'),
      );
      expect(result?.code).toBe(ERRORS.SUCURSAL.HEADER_INVALIDO.CODE);
    });
  });

  describe('assertMismaSucursal', () => {
    it('no lanza si coinciden', () => {
      expect(() => service.assertMismaSucursal(2, 2)).not.toThrow();
    });

    it('400 RECURSO_OTRA_SUCURSAL si difieren', () => {
      try {
        service.assertMismaSucursal(1, 2);
        expect.unreachable();
      } catch (e: any) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.getResponse().code).toBe(ERRORS.SUCURSAL.RECURSO_OTRA_SUCURSAL.CODE);
      }
    });
  });

  describe('resolveOperativeSucursalId', () => {
    it('ADMIN con header válido retorna el id', async () => {
      await expect(service.resolveOperativeSucursalId(admin, '2')).resolves.toBe(2);
    });

    it('EMPLEADO con header de sucursal asignada retorna el id', async () => {
      await expect(service.resolveOperativeSucursalId(empleado, '1')).resolves.toBe(1);
    });

    it('EMPLEADO con sucursal no asignada recibe 403', async () => {
      const result = await errorCode(() => service.resolveOperativeSucursalId(empleado, '2'));
      expect(result?.code).toBe(ERRORS.SUCURSAL.ACCESO_DENEGADO.CODE);
    });

    it('header ausente → HEADER_REQUERIDO', async () => {
      for (const value of [undefined, null, '', '   ']) {
        const result = await errorCode(() => service.resolveOperativeSucursalId(admin, value));
        expect(result?.error).toBeInstanceOf(BadRequestException);
        expect(result?.code).toBe(ERRORS.SUCURSAL.HEADER_REQUERIDO.CODE);
      }
    });

    it('header no numérico, cero, negativo o repetido → HEADER_INVALIDO', async () => {
      for (const value of ['abc', '0', '-1', '1.5', '1e3', ['1', '2']]) {
        const result = await errorCode(() => service.resolveOperativeSucursalId(admin, value));
        expect(result?.code).toBe(ERRORS.SUCURSAL.HEADER_INVALIDO.CODE);
      }
    });

    it('sucursal inexistente → NOT_FOUND', async () => {
      const result = await errorCode(() => service.resolveOperativeSucursalId(admin, '99'));
      expect(result?.error).toBeInstanceOf(NotFoundException);
      expect(result?.code).toBe(ERRORS.SUCURSAL.NOT_FOUND.CODE);
    });
  });
});
