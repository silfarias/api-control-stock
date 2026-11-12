import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstadoTransferencia } from '../../common/enums/estado-transferencia.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { Transferencia } from './entities/transferencia.entity.js';
import { TransferenciaService } from './transferencia.service.js';

const actor = { id: 9, role: 'ADMIN' } as unknown as RequestUser;

function buildTransferencia(
  estado = EstadoTransferencia.BORRADOR,
): Record<string, any> {
  return {
    id: 10,
    numero: 4,
    estado,
    sucursalOrigen: { id: 1, nombre: 'Casa Central' },
    sucursalDestino: { id: 2, nombre: 'Sucursal Norte' },
    items: [
      { id: 1, cantidad: 3, producto: { id: 100 } },
      { id: 2, cantidad: 7, producto: { id: 50 } },
    ],
  };
}

function build(transferencia: Record<string, any>) {
  // Repositorio de Transferencia dentro de la transacción (lock + relaciones + update).
  const txRepo = {
    createQueryBuilder: vi.fn(() => {
      const qb: any = {
        setLock: vi.fn(() => qb),
        where: vi.fn(() => qb),
        getOne: vi.fn(async () => ({ ...transferencia })),
      };
      return qb;
    }),
    findOne: vi.fn(async () => transferencia),
    update: vi.fn(async (_id: number, patch: Record<string, any>) => {
      Object.assign(transferencia, patch);
    }),
  };
  const manager: any = {
    getRepository: vi.fn((entity: unknown) =>
      entity === Transferencia ? txRepo : {},
    ),
  };

  const repository: any = {
    manager: { transaction: vi.fn(async (cb: any) => cb(manager)) },
    findByIdWithRelations: vi.fn(async () => transferencia),
    allocateNumero: vi.fn(async () => 5),
    syncNumeracion: vi.fn(),
    update: vi.fn(),
    softRemove: vi.fn(),
  };
  const mapper: any = {
    entity2DTO: vi.fn(async (t: unknown) => t),
    createDTO2Entity: vi.fn(),
    buildItems: vi.fn(),
  };
  const inventario: any = {
    registrarSalidaPorTransferencia: vi.fn(async () => ({})),
    registrarEntradaPorTransferencia: vi.fn(async () => ({})),
  };
  const sucursalAccess: any = { assertActiva: vi.fn(async () => ({})) };
  const getEntity: any = { findById: vi.fn(async () => ({})) };

  const service = new TransferenciaService(
    repository,
    mapper,
    inventario,
    sucursalAccess,
    getEntity,
    new ErrorHandlerService(),
  );
  return { service, repository, inventario, sucursalAccess, manager, txRepo };
}

describe('TransferenciaService', () => {
  let transferencia: Record<string, any>;

  beforeEach(() => {
    transferencia = buildTransferencia();
  });

  describe('confirmar', () => {
    it('genera salida en origen y entrada en destino por cada ítem y confirma', async () => {
      const { service, inventario, txRepo, manager } = build(transferencia);

      const result = await service.confirmar(10, actor);

      expect(inventario.registrarSalidaPorTransferencia).toHaveBeenCalledTimes(2);
      expect(inventario.registrarEntradaPorTransferencia).toHaveBeenCalledTimes(2);
      expect(inventario.registrarSalidaPorTransferencia).toHaveBeenCalledWith(
        expect.objectContaining({
          productoId: 100,
          sucursalId: 1,
          cantidad: 3,
          transferenciaId: 10,
          usuarioId: 9,
        }),
        manager,
      );
      expect(inventario.registrarEntradaPorTransferencia).toHaveBeenCalledWith(
        expect.objectContaining({
          productoId: 100,
          sucursalId: 2,
          cantidad: 3,
          transferenciaId: 10,
          usuarioId: 9,
        }),
        manager,
      );
      expect(inventario.registrarSalidaPorTransferencia).toHaveBeenCalledWith(
        expect.objectContaining({ productoId: 50, sucursalId: 1, cantidad: 7 }),
        manager,
      );
      expect(inventario.registrarEntradaPorTransferencia).toHaveBeenCalledWith(
        expect.objectContaining({ productoId: 50, sucursalId: 2, cantidad: 7 }),
        manager,
      );
      expect(txRepo.update).toHaveBeenCalledWith(10, {
        estado: EstadoTransferencia.CONFIRMADA,
      });
      expect(result).toMatchObject({ estado: EstadoTransferencia.CONFIRMADA });
    });

    it('rechaza confirmar dos veces (YA_CONFIRMADA) sin volver a mover stock', async () => {
      const { service, inventario } = build(transferencia);

      await service.confirmar(10, actor);
      inventario.registrarSalidaPorTransferencia.mockClear();
      inventario.registrarEntradaPorTransferencia.mockClear();

      const error = await service.confirmar(10, actor).catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: ERRORS.TRANSFERENCIA.YA_CONFIRMADA.CODE,
      });
      expect(inventario.registrarSalidaPorTransferencia).not.toHaveBeenCalled();
      expect(inventario.registrarEntradaPorTransferencia).not.toHaveBeenCalled();
    });

    it('rechaza confirmar una transferencia CANCELADA (ESTADO_INVALIDO)', async () => {
      transferencia = buildTransferencia(EstadoTransferencia.CANCELADA);
      const { service, inventario } = build(transferencia);

      const error = await service.confirmar(10, actor).catch((e) => e);

      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: ERRORS.TRANSFERENCIA.ESTADO_INVALIDO.CODE,
      });
      expect(inventario.registrarSalidaPorTransferencia).not.toHaveBeenCalled();
    });

    it('aborta (no confirma) si el stock del origen es insuficiente', async () => {
      const { service, inventario, txRepo } = build(transferencia);
      inventario.registrarSalidaPorTransferencia.mockRejectedValueOnce(
        new BadRequestException({
          code: ERRORS.INVENTARIO.STOCK_INSUFICIENTE.CODE,
        }),
      );

      const error = await service.confirmar(10, actor).catch((e) => e);

      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: ERRORS.INVENTARIO.STOCK_INSUFICIENTE.CODE,
      });
      expect(txRepo.update).not.toHaveBeenCalled();
      expect(transferencia.estado).toBe(EstadoTransferencia.BORRADOR);
    });

    it('rechaza confirmar sin ítems (SIN_ITEMS)', async () => {
      transferencia.items = [];
      const { service, inventario } = build(transferencia);

      const error = await service.confirmar(10, actor).catch((e) => e);

      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: ERRORS.TRANSFERENCIA.SIN_ITEMS.CODE,
      });
      expect(inventario.registrarSalidaPorTransferencia).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('rechaza origen = destino (MISMO_ORIGEN_DESTINO) antes de tocar la base', async () => {
      const { service, repository, sucursalAccess } = build(transferencia);

      const error = await service
        .create(
          {
            sucursalOrigenId: 1,
            sucursalDestinoId: 1,
            items: [{ productoId: 100, cantidad: 1 }],
          },
          actor,
        )
        .catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: ERRORS.TRANSFERENCIA.MISMO_ORIGEN_DESTINO.CODE,
      });
      expect(sucursalAccess.assertActiva).not.toHaveBeenCalled();
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });

    it('rechaza productos repetidos (PRODUCTO_DUPLICADO)', async () => {
      const { service, repository } = build(transferencia);

      const error = await service
        .create(
          {
            sucursalOrigenId: 1,
            sucursalDestinoId: 2,
            items: [
              { productoId: 100, cantidad: 1 },
              { productoId: 100, cantidad: 2 },
            ],
          },
          actor,
        )
        .catch((e) => e);

      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: ERRORS.TRANSFERENCIA.PRODUCTO_DUPLICADO.CODE,
      });
      expect(repository.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('update / cancelar / remove', () => {
    it('no permite modificar una transferencia confirmada', async () => {
      transferencia = buildTransferencia(EstadoTransferencia.CONFIRMADA);
      const { service } = build(transferencia);

      const error = await service
        .update(10, { observacion: 'x' })
        .catch((e) => e);

      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: ERRORS.TRANSFERENCIA.YA_CONFIRMADA.CODE,
      });
    });

    it('no permite eliminar una transferencia confirmada', async () => {
      transferencia = buildTransferencia(EstadoTransferencia.CONFIRMADA);
      const { service, repository } = build(transferencia);

      await expect(service.remove(10)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.softRemove).not.toHaveBeenCalled();
    });

    it('cancela solo un BORRADOR', async () => {
      const { service, repository } = build(transferencia);

      await service.cancelar(10);

      expect(repository.update).toHaveBeenCalledWith(10, {
        estado: EstadoTransferencia.CANCELADA,
      });
    });
  });
});
