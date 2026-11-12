import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { EstadoCompra } from '../../../common/enums/estado-compra.enum.js';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Proveedor } from '../../proveedor/entities/proveedor.entity.js';
import { Sucursal } from '../../sucursal/entities/sucursal.entity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import type { ItemCompra } from './item-compra.entity.js';

@Entity('compra')
export class Compra extends BaseEntity {
  @ManyToOne(() => Proveedor, { nullable: false })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  /**
   * Sucursal que recibe la mercadería al confirmar. Se fija al crear y no cambia
   * (la compra solo se modifica desde su propia sucursal).
   */
  @ManyToOne(() => Sucursal, { nullable: false })
  @JoinColumn({
    name: 'sucursal_id',
    foreignKeyConstraintName: 'FK_compra_sucursal',
  })
  sucursal: Sucursal;

  /**
   * Número de comprobante visible (1, 2, 3…). Independiente del id técnico.
   * La numeración es GLOBAL (no se reinicia por sucursal).
   * Nullable solo para poder agregar la columna sobre compras ya existentes;
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
    type: 'enum',
    enum: EstadoCompra,
    default: EstadoCompra.BORRADOR,
  })
  estado: EstadoCompra;

  // String target evita ciclo ESM con item-compra.entity
  @OneToMany('ItemCompra', 'compra', {
    cascade: true,
    eager: false,
  })
  items: ItemCompra[];

  static fromId(id: number): Compra {
    const compra = new Compra();
    compra.id = id;
    return compra;
  }
}
