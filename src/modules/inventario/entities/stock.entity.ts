import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Producto } from '../../producto/entities/producto.entity.js';

@Entity('stock')
export class Stock extends BaseEntity {
  @OneToOne(() => Producto, { nullable: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'int', default: 0 })
  cantidad: number;

  static fromId(id: number): Stock {
    const stock = new Stock();
    stock.id = id;
    return stock;
  }
}
