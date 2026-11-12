import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { EstadoTransferencia } from '../../../common/enums/estado-transferencia.enum.js';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Sucursal } from '../../sucursal/entities/sucursal.entity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import type { ItemTransferencia } from './item-transferencia.entity.js';

/**
 * Traslado de stock entre dos sucursales. Mientras está en BORRADOR no afecta stock;
 * al confirmarse genera TRANSFERENCIA_SALIDA en el origen y TRANSFERENCIA_ENTRADA en el destino.
 */
@Entity('transferencia')
export class Transferencia extends BaseEntity {
  /**
   * Número de comprobante visible. GLOBAL (un único contador `transferencia_numeracion`).
   * Nullable para ser consistente con el esquema de la migración Multisucursal.
   */
  @Column({
    type: 'int',
    unsigned: true,
    unique: true,
    nullable: true,
  })
  numero: number | null;

  @Column({
    type: 'enum',
    enum: EstadoTransferencia,
    default: EstadoTransferencia.BORRADOR,
  })
  estado: EstadoTransferencia;

  @ManyToOne(() => Sucursal, { nullable: false })
  @JoinColumn({
    name: 'sucursal_origen_id',
    foreignKeyConstraintName: 'FK_transferencia_sucursal_origen',
  })
  sucursalOrigen: Sucursal;

  @ManyToOne(() => Sucursal, { nullable: false })
  @JoinColumn({
    name: 'sucursal_destino_id',
    foreignKeyConstraintName: 'FK_transferencia_sucursal_destino',
  })
  sucursalDestino: Sucursal;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'FK_transferencia_usuario',
  })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observacion: string | null;

  // String target evita ciclo ESM con item-transferencia.entity
  @OneToMany('ItemTransferencia', 'transferencia', {
    cascade: true,
    eager: false,
  })
  items: ItemTransferencia[];

  static fromId(id: number): Transferencia {
    const transferencia = new Transferencia();
    transferencia.id = id;
    return transferencia;
  }
}
