import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';
import { ProductoDTO } from '../dto/producto.dto.js';

/**
 * Oculta información económica de producto según el rol del viewer.
 * ADMIN conserva `precioCosto`; EMPLEADO lo omite en la respuesta.
 */
export function applyProductoEconomicVisibility(
  dto: ProductoDTO,
  role?: UsuarioRole,
): ProductoDTO {
  if (role === UsuarioRole.EMPLEADO) {
    delete (dto as { precioCosto?: number }).precioCosto;
  }
  return dto;
}

/** Aplica la misma regla a un producto anidado (stock, movimiento, ítem de venta). */
export function applyNestedProductoEconomicVisibility(
  producto: ProductoDTO | null | undefined,
  role?: UsuarioRole,
): void {
  if (producto) {
    applyProductoEconomicVisibility(producto, role);
  }
}
