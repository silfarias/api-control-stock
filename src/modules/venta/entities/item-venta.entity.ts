import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Producto } from '../../producto/entities/producto.entity.js';
import { Venta } from './venta.entity.js';

@Entity('item_venta')
export class ItemVenta extends BaseEntity {
  @ManyToOne(() => Venta, (venta) => venta.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'venta_id' })
  venta: Venta;

  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({
    name: 'precio_unitario',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  precioUnitario: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  subtotal: number;

  static fromId(id: number): ItemVenta {
    const item = new ItemVenta();
    item.id = id;
    return item;
  }
}
