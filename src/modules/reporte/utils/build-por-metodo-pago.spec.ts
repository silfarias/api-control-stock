import { describe, expect, it } from 'vitest';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';
import { buildPorMetodoPago } from './build-por-metodo-pago.js';

describe('buildPorMetodoPago', () => {
  it('incluye todos los métodos del enum aunque no haya ventas', () => {
    const result = buildPorMetodoPago([], [], 0);

    expect(result).toHaveLength(Object.values(MetodoPago).length);
    expect(result.every((item) => item.cantidadVentas === 0)).toBe(true);
    expect(result.every((item) => item.porcentajeIngresos === 0)).toBe(true);
    expect(result.map((item) => item.metodoPago)).toEqual(
      Object.values(MetodoPago),
    );
  });

  it('agrega ingresos, unidades y porcentajes por método', () => {
    const result = buildPorMetodoPago(
      [
        { metodoPago: MetodoPago.EFECTIVO, total: 100 },
        { metodoPago: MetodoPago.EFECTIVO, total: 50 },
        { metodoPago: MetodoPago.TRANSFERENCIA, total: 50 },
      ],
      [
        { metodoPago: MetodoPago.EFECTIVO, unidadesVendidas: 3 },
        { metodoPago: MetodoPago.TRANSFERENCIA, unidadesVendidas: 1 },
      ],
      200,
    );

    const efectivo = result.find((r) => r.metodoPago === MetodoPago.EFECTIVO)!;
    const transferencia = result.find(
      (r) => r.metodoPago === MetodoPago.TRANSFERENCIA,
    )!;
    const debito = result.find(
      (r) => r.metodoPago === MetodoPago.TARJETA_DEBITO,
    )!;

    expect(efectivo).toMatchObject({
      cantidadVentas: 2,
      totalIngresos: 150,
      unidadesVendidas: 3,
      porcentajeIngresos: 75,
    });
    expect(transferencia).toMatchObject({
      cantidadVentas: 1,
      totalIngresos: 50,
      unidadesVendidas: 1,
      porcentajeIngresos: 25,
    });
    expect(debito).toMatchObject({
      cantidadVentas: 0,
      totalIngresos: 0,
      unidadesVendidas: 0,
      porcentajeIngresos: 0,
    });
  });
});
