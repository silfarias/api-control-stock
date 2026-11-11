import { describe, expect, it } from 'vitest';
import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';
import { Producto } from '../entities/producto.entity.js';
import { ProductoMapper } from './producto.mapper.js';

describe('ProductoMapper.entity2DTO', () => {
  const mapper = new ProductoMapper();

  function buildProducto(): Producto {
    const producto = new Producto();
    producto.id = 1;
    producto.nombre = 'Agua';
    producto.codigo = 'A1';
    producto.codigoBarras = '779';
    producto.precioCosto = 150.5;
    producto.precioVenta = 250;
    producto.minimoStock = 10;
    producto.stock = { cantidad: 8 } as any;
    producto.categoria = { id: 3, nombre: 'Bebidas' } as any;
    return producto;
  }

  it('incluye precioCosto para ADMIN', async () => {
    const dto = await mapper.entity2DTO(buildProducto(), UsuarioRole.ADMIN);
    expect(dto.precioCosto).toBe(150.5);
    expect(dto.stockCantidad).toBe(8);
  });

  it('omite precioCosto para EMPLEADO', async () => {
    const dto = await mapper.entity2DTO(buildProducto(), UsuarioRole.EMPLEADO);
    expect(dto.precioCosto).toBeUndefined();
    expect(dto.precioVenta).toBe(250);
    expect(dto.codigo).toBe('A1');
  });
});
