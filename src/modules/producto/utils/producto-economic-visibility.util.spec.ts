import { describe, expect, it } from 'vitest';
import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';
import { ProductoDTO } from '../dto/producto.dto.js';
import {
  applyNestedProductoEconomicVisibility,
  applyProductoEconomicVisibility,
} from './producto-economic-visibility.util.js';

function buildProducto(): ProductoDTO {
  return {
    id: 1,
    nombre: 'Agua',
    codigo: 'A1',
    codigoBarras: '779',
    precioCosto: 100,
    precioVenta: 200,
    minimoStock: 5,
    stockCantidad: 10,
  } as ProductoDTO;
}

describe('producto-economic-visibility', () => {
  it('ADMIN conserva precioCosto', () => {
    const dto = buildProducto();
    applyProductoEconomicVisibility(dto, UsuarioRole.ADMIN);
    expect(dto.precioCosto).toBe(100);
  });

  it('sin rol conserva precioCosto (rutas admin-only)', () => {
    const dto = buildProducto();
    applyProductoEconomicVisibility(dto);
    expect(dto.precioCosto).toBe(100);
  });

  it('EMPLEADO omite precioCosto', () => {
    const dto = buildProducto();
    applyProductoEconomicVisibility(dto, UsuarioRole.EMPLEADO);
    expect(dto.precioCosto).toBeUndefined();
    expect(dto.precioVenta).toBe(200);
  });

  it('aplica la regla a producto anidado', () => {
    const nested = buildProducto();
    applyNestedProductoEconomicVisibility(nested, UsuarioRole.EMPLEADO);
    expect(nested.precioCosto).toBeUndefined();
  });
});
