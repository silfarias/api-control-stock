import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Producto } from '../../producto/entities/producto.entity.js';
import { Sucursal } from '../../sucursal/entities/sucursal.entity.js';

/**
 * Stock de un producto en una sucursal. Una única fila por (producto, sucursal).
 * El catálogo de productos es global; el stock es por sucursal.
 */
@Entity('stock')
@Unique('uq_stock_producto_sucursal', ['producto', 'sucursal'])
export class Stock extends BaseEntity {
  @ManyToOne(() => Producto, (producto) => producto.stocks, {
    nullable: false,
  })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @ManyToOne(() => Sucursal, { nullable: false })
  @JoinColumn({
    name: 'sucursal_id',
    foreignKeyConstraintName: 'FK_stock_sucursal',
  })
  sucursal: Sucursal;

  @Column({ type: 'int', default: 0 })
  cantidad: number;

  static fromId(id: number): Stock {
    const stock = new Stock();
    stock.id = id;
    return stock;
  }
}
