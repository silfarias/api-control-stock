import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { EstadoVenta } from '../../../common/enums/estado-venta.enum.js';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Sucursal } from '../../sucursal/entities/sucursal.entity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import type { ItemVenta } from './item-venta.entity.js';

@Entity('venta')
export class Venta extends BaseEntity {
  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  /** Sucursal en la que se registró la venta (stock y caja se afectan en ella). */
  @ManyToOne(() => Sucursal, { nullable: false })
  @JoinColumn({
    name: 'sucursal_id',
    foreignKeyConstraintName: 'FK_venta_sucursal',
  })
  sucursal: Sucursal;

  /**
   * Snapshot del nombre de la sucursal al crear la venta: el comprobante no cambia
   * aunque luego se renombre o elimine la sucursal.
   */
  @Column({
    name: 'sucursal_nombre',
    type: 'varchar',
    length: 120,
    default: '',
  })
  sucursalNombre: string;

  /** Snapshot de la dirección de la sucursal al crear la venta. */
  @Column({
    name: 'sucursal_direccion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sucursalDireccion?: string | null;

  /** Snapshot del teléfono de la sucursal al crear la venta. */
  @Column({
    name: 'sucursal_telefono',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  sucursalTelefono?: string | null;

  /**
   * Número de comprobante visible (1, 2, 3…). Independiente del id técnico.
   * La numeración es GLOBAL (no se reinicia por sucursal).
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
