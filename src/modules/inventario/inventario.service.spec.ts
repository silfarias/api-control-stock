import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TipoMovimientoStock } from '../../common/enums/tipo-movimiento-stock.enum.js';
import { TipoReferenciaMovimiento } from '../../common/enums/tipo-referencia-movimiento.enum.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { InventarioService } from './inventario.service.js';

type StockFake = { id: number; cantidad: number };

/**
 * Arma un EntityManager falso. `stocks` simula qué filas existen por clave "producto:sucursal".
 * Registra los parámetros del lock para verificar que se bloquea por (producto, sucursal).
 */
function buildManager(stocks: Record<string, StockFake>) {
  const lockCalls: { where: string; params: Record<string, number> }[] = [];
  const insertCalls: unknown[][] = [];
  const movimientos: any[] = [];

  const stockRepo = {
    createQueryBuilder: vi.fn(() => {
      const qb: any = {
        setLock: vi.fn(() => qb),
        where: vi.fn((where: string, params: Record<string, number>) => {
          lockCalls.push({ where, params });
          qb.params = params;
          return qb;
        }),
        getOne: vi.fn(async () => {
          const p = qb.params;
          return stocks[`${p.productoId}:${p.sucursalId}`] ?? null;
        }),
        // Camino de INSERT IGNORE (asegurarFilasStock)
        insert: vi.fn(() => qb),
        into: vi.fn(() => qb),
        values: vi.fn((rows: any[]) => {
          insertCalls.push(rows);
          for (const row of rows) {
            const key = `${row.producto.id}:${row.sucursal.id}`;
            stocks[key] ??= { id: 900 + Object.keys(stocks).length, cantidad: 0 };
          }
          return qb;
        }),
        orIgnore: vi.fn(() => qb),
        execute: vi.fn(async () => ({})),
      };
      return qb;
    }),
    save: vi.fn(async (s: StockFake) => s),
    findOneOrFail: vi.fn(async ({ where }: { where: { id: number } }) => ({
      ...Object.values(stocks).find((s) => s.id === where.id),
    })),
  };

  const movimientoRepo = {
    create: vi.fn((data: any) => ({ ...data })),
    save: vi.fn(async (m: any) => {
      movimientos.push(m);
      return { ...m, id: 77 };
    }),
    findOneOrFail: vi.fn(async ({ where }: { where: { id: number } }) => ({
      ...movimientos[0],
      id: where.id,
    })),
  };

  const manager: any = {
    getRepository: vi.fn((entity: { name: string }) =>
      entity.name === 'Stock' ? stockRepo : movimientoRepo,
    ),
  };

  return { manager, stockRepo, movimientoRepo, lockCalls, insertCalls, movimientos };
}

describe('InventarioService.aplicarMovimiento (multisucursal)', () => {
  const errorHandler = new ErrorHandlerService();
  let service: InventarioService;

  beforeEach(() => {
    service = new InventarioService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      errorHandler,
    );
  });

  const base = {
    productoId: 5,
    sucursalId: 2,
    cantidad: 3,
    tipoReferencia: TipoReferenciaMovimiento.OTRO,
    motivo: 'test',
    usuarioId: 1,
  };

  it('bloquea la fila de stock por (producto, sucursal)', async () => {
    const { manager, lockCalls } = buildManager({
      '5:2': { id: 10, cantidad: 8 },
    });

    await service.aplicarMovimiento(
      { ...base, tipo: TipoMovimientoStock.AJUSTE_ENTRADA },
      manager,
    );

    expect(lockCalls).toHaveLength(1);
    expect(lockCalls[0].where).toContain('stock.producto_id = :productoId');
    expect(lockCalls[0].where).toContain('stock.sucursal_id = :sucursalId');
    expect(lockCalls[0].params).toEqual({ productoId: 5, sucursalId: 2 });
  });

  it('entrada suma y registra el movimiento con la sucursal', async () => {
    const stock = { id: 10, cantidad: 8 };
    const { manager, movimientos, stockRepo } = buildManager({ '5:2': stock });

    await service.aplicarMovimiento(
      { ...base, tipo: TipoMovimientoStock.COMPRA },
      manager,
    );

    expect(stock.cantidad).toBe(11);
    expect(stockRepo.save).toHaveBeenCalledWith(stock);
    expect(movimientos[0]).toMatchObject({
      tipo: TipoMovimientoStock.COMPRA,
      stockAnterior: 8,
      stockNuevo: 11,
      sucursal: { id: 2 },
      producto: { id: 5 },
    });
  });

  it('TRANSFERENCIA_ENTRADA suma y TRANSFERENCIA_SALIDA resta', async () => {
    const stock = { id: 10, cantidad: 10 };
    const { manager } = buildManager({ '5:2': stock });

    await service.aplicarMovimiento(
      { ...base, tipo: TipoMovimientoStock.TRANSFERENCIA_ENTRADA },
      manager,
    );
    expect(stock.cantidad).toBe(13);

    await service.aplicarMovimiento(
      { ...base, cantidad: 4, tipo: TipoMovimientoStock.TRANSFERENCIA_SALIDA },
      manager,
    );
    expect(stock.cantidad).toBe(9);
  });

  it('salida con stock insuficiente en ESA sucursal falla aunque otra tenga stock', async () => {
    const otraSucursal = { id: 11, cantidad: 100 };
    const { manager, stockRepo } = buildManager({
      '5:2': { id: 10, cantidad: 1 },
      '5:3': otraSucursal,
    });

    await expect(
      service.aplicarMovimiento(
        { ...base, tipo: TipoMovimientoStock.VENTA },
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stockRepo.save).not.toHaveBeenCalled();
    expect(otraSucursal.cantidad).toBe(100);
  });

  it('crea la fila faltante (INSERT IGNORE) y vuelve a bloquear', async () => {
    const stocks: Record<string, StockFake> = {};
    const { manager, insertCalls, lockCalls } = buildManager(stocks);

    const { stock } = await service.aplicarMovimiento(
      { ...base, tipo: TipoMovimientoStock.AJUSTE_ENTRADA },
      manager,
    );

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toHaveLength(1);
    expect((insertCalls[0][0] as any).sucursal.id).toBe(2);
    expect(lockCalls).toHaveLength(2);
    expect(stocks['5:2'].cantidad).toBe(3);
    expect(stock.cantidad).toBe(3);
  });

  it('salida sobre una fila inexistente (queda en 0) falla por stock insuficiente', async () => {
    const { manager } = buildManager({});
    await expect(
      service.aplicarMovimiento(
        { ...base, tipo: TipoMovimientoStock.VENTA },
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('si la fila no aparece tras el INSERT IGNORE responde 404', async () => {
    const { manager, stockRepo } = buildManager({});
    // El INSERT IGNORE "no hace nada": la fila nunca existe.
    stockRepo.createQueryBuilder.mockImplementation((() => {
      const qb: any = {
        setLock: () => qb,
        where: () => qb,
        getOne: async () => null,
        insert: () => qb,
        into: () => qb,
        values: () => qb,
        orIgnore: () => qb,
        execute: async () => ({}),
      };
      return qb;
    }) as any);

    await expect(
      service.aplicarMovimiento(
        { ...base, tipo: TipoMovimientoStock.AJUSTE_ENTRADA },
        manager,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
