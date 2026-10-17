import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Producto } from '../../producto/entities/producto.entity.js';
import { Compra } from './compra.entity.js';

@Entity('item_compra')
export class ItemCompra extends BaseEntity {
  @ManyToOne(() => Compra, (compra) => compra.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'compra_id' })
  compra: Compra;

  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({
    name: 'costo_unitario',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  costoUnitario: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  subtotal: number;

  static fromId(id: number): ItemCompra {
    const item = new ItemCompra();
    item.id = id;
    return item;
  }
}
