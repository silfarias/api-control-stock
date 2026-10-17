import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';
import { ReporteVentasMetodoPagoItemDto } from '../dto/reporte-ventas-metodo-pago-item.dto.js';

export type VentaMetodoAgg = {
  metodoPago: string;
  total: number;
};

export type UnidadesMetodoAgg = {
  metodoPago: string;
  unidadesVendidas: number;
};

/**
 * Arma el breakdown por método de pago incluyendo todos los valores del enum.
 * porcentajeIngresos: 0–100 sobre totalIngresos (2 decimales); 0 si total es 0.
 */
export function buildPorMetodoPago(
  ventas: VentaMetodoAgg[],
  unidades: UnidadesMetodoAgg[],
  totalIngresos: number,
): ReporteVentasMetodoPagoItemDto[] {
  const ingresos = new Map<string, { cantidadVentas: number; totalIngresos: number }>();
  const unidadesMap = new Map<string, number>();

  for (const row of ventas) {
    const key = row.metodoPago;
    const actual = ingresos.get(key) ?? { cantidadVentas: 0, totalIngresos: 0 };
    actual.cantidadVentas += 1;
    actual.totalIngresos += Number(row.total || 0);
    ingresos.set(key, actual);
  }

  for (const row of unidades) {
    unidadesMap.set(
      row.metodoPago,
      (unidadesMap.get(row.metodoPago) ?? 0) + Number(row.unidadesVendidas || 0),
    );
  }

  return Object.values(MetodoPago).map((metodoPago) => {
    const data = ingresos.get(metodoPago) ?? {
      cantidadVentas: 0,
      totalIngresos: 0,
    };
    const totalMetodo = Number(data.totalIngresos.toFixed(2));
    const porcentajeIngresos =
      totalIngresos > 0
        ? Number(((totalMetodo / totalIngresos) * 100).toFixed(2))
        : 0;

    return {
      metodoPago,
      cantidadVentas: data.cantidadVentas,
      totalIngresos: totalMetodo,
      unidadesVendidas: unidadesMap.get(metodoPago) ?? 0,
      porcentajeIngresos,
    };
  });
}
