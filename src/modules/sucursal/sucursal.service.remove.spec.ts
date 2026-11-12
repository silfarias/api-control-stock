import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { SucursalService } from './sucursal.service.js';

type Conteos = Partial<
  Record<
    'Venta' | 'Compra' | 'Caja' | 'MovimientoStock' | 'Stock',
    number
  >
>;

function buildService(
  sucursal: { id: number; codigo: string; activo: boolean } | null,
  conteos: Conteos = {},
) {
  const sucursalRepo = {
    findOne: vi.fn(async () => sucursal),
    save: vi.fn(async (s: unknown) => s),
    softRemove: vi.fn(async (s: unknown) => s),
  };
  const countCalls: Record<string, any> = {};
  const manager: any = {
    getRepository: vi.fn((entity: { name: string }) => {
      if (entity.name === 'Sucursal') return sucursalRepo;
      return {
        count: vi.fn(async (options: unknown) => {
          countCalls[entity.name] = options;
          return conteos[entity.name as keyof Conteos] ?? 0;
        }),
      };
    }),
  };
  const repository: any = {
    manager: { transaction: vi.fn(async (fn: any) => fn(manager)) },
  };

  const service = new SucursalService(
    {} as any,
    repository,
    {} as any,
    {} as any,
    new ErrorHandlerService(),
  );
  return { service, sucursalRepo, countCalls };
}

describe('SucursalService.remove', () => {
  let sucursal: { id: number; codigo: string; activo: boolean };

  beforeEach(() => {
    sucursal = { id: 2, codigo: 'NORTE', activo: true };
  });

  it('elimina (soft delete + activo=false) una sucursal sin historial ni stock', async () => {
    const { service, sucursalRepo } = buildService(sucursal);

    await expect(service.remove(2)).resolves.toBeTypeOf('string');

    expect(sucursal.activo).toBe(false);
    expect(sucursalRepo.softRemove).toHaveBeenCalledWith(sucursal);
  });

  it('404 si no existe', async () => {
    const { service } = buildService(null);
    await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('no permite eliminar CASA-CENTRAL', async () => {
    const { service, sucursalRepo } = buildService({
      id: 1,
      codigo: 'CASA-CENTRAL',
      activo: true,
    });
    await expect(service.remove(1)).rejects.toBeInstanceOf(BadRequestException);
    expect(sucursalRepo.softRemove).not.toHaveBeenCalled();
  });

  it.each(['Venta', 'Compra', 'Caja', 'MovimientoStock', 'Stock'] as const)(
    'no permite eliminar si tiene %s asociado (NO_ELIMINABLE)',
    async (entidad) => {
      const { service, sucursalRepo } = buildService(sucursal, {
        [entidad]: 3,
      });

      const error: any = await service.remove(2).catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse().code).toBe(ERRORS.SUCURSAL.NO_ELIMINABLE.CODE);
      expect(sucursalRepo.softRemove).not.toHaveBeenCalled();
      expect(sucursal.activo).toBe(true);
    },
  );

  it('cuenta también registros soft-deleted', async () => {
    const { service, countCalls } = buildService(sucursal);
    await service.remove(2);
    for (const entidad of ['Venta', 'Compra', 'Caja', 'MovimientoStock', 'Stock']) {
      expect(countCalls[entidad].withDeleted).toBe(true);
      expect(countCalls[entidad].where.sucursal).toEqual({ id: 2 });
    }
  });
});
