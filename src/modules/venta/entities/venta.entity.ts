import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { EstadoVenta } from '../../../common/enums/estado-venta.enum.js';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import type { ItemVenta } from './item-venta.entity.js';

@Entity('venta')
export class Venta extends BaseEntity {
  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  /**
   * Número de comprobante visible (1, 2, 3…). Independiente del id técnico.
   * Nullable solo para poder agregar la columna sobre ventas ya existentes;
   * el alta siempre lo asigna y el arranque rellena los nulos con el id.
   */
  @Column({
    type: 'int',
    unsigned: true,
    unique: true,
    nullable: true,
  })
  numero: number | null;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  total: number;

  @Column({
    name: 'metodo_pago',
    type: 'enum',
    enum: MetodoPago,
  })
  metodoPago: MetodoPago;

  @Column({
    type: 'enum',
    enum: EstadoVenta,
    default: EstadoVenta.CONFIRMADA,
  })
  estado: EstadoVenta;

  // String target evita ciclo ESM con item-venta.entity
  @OneToMany('ItemVenta', 'venta', {
    cascade: true,
    eager: false,
  })
  items: ItemVenta[];

  static fromId(id: number): Venta {
    const venta = new Venta();
    venta.id = id;
    return venta;
  }
}
