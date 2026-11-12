export enum TipoMovimientoStock {
  COMPRA = 'COMPRA',
  VENTA = 'VENTA',
  AJUSTE_ENTRADA = 'AJUSTE_ENTRADA',
  AJUSTE_SALIDA = 'AJUSTE_SALIDA',
  /** Entrada en la sucursal destino de una transferencia (fase 5). */
  TRANSFERENCIA_ENTRADA = 'TRANSFERENCIA_ENTRADA',
  /** Salida de la sucursal origen de una transferencia (fase 5). */
  TRANSFERENCIA_SALIDA = 'TRANSFERENCIA_SALIDA',
}

/** Tipos que incrementan el stock; el resto descuenta. */
export const TIPOS_MOVIMIENTO_ENTRADA: readonly TipoMovimientoStock[] = [
  TipoMovimientoStock.COMPRA,
  TipoMovimientoStock.AJUSTE_ENTRADA,
  TipoMovimientoStock.TRANSFERENCIA_ENTRADA,
];
