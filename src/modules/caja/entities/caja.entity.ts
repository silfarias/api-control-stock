import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { EstadoCaja } from '../../../common/enums/estado-caja.enum.js';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Sucursal } from '../../sucursal/entities/sucursal.entity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import type { MovimientoCaja } from './movimiento-caja.entity.js';

@Entity('caja')
export class Caja extends BaseEntity {
  /** Sucursal a la que pertenece la caja. Solo puede haber UNA caja ABIERTA por sucursal. */
  @ManyToOne(() => Sucursal, { nullable: false })
  @JoinColumn({
    name: 'sucursal_id',
    foreignKeyConstraintName: 'FK_caja_sucursal',
  })
  sucursal: Sucursal;

  /**
   * Columna GENERADA (STORED) por la migración Multisucursal:
   * CASE WHEN estado = 'ABIERTA' THEN sucursal_id ELSE NULL END.
   * Con el UNIQUE uq_caja_abierta_por_sucursal garantiza a nivel DB una sola caja abierta
   * por sucursal (los NULL de cajas cerradas no colisionan). Solo lectura: nunca se escribe.
   */
  @Index('uq_caja_abierta_por_sucursal', { unique: true })
  @Column({
    name: 'abierta_lock',
    type: 'int',
    nullable: true,
    asExpression: "CASE WHEN estado = 'ABIERTA' THEN sucursal_id ELSE NULL END",
    generatedType: 'STORED',
    insert: false,
    update: false,
    select: false,
  })
  abiertaLock?: number | null;

  /** Usuario que abrió la caja (responsable de apertura). */
  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  /** Usuario que cerró la caja. Null mientras esté abierta o en cierres previos a esta columna. */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_cierre_id' })
  usuarioCierre?: Usuario | null;

  /**
   * Número de caja visible (1, 2, 3…). Independiente del id técnico.
   * La numeración es GLOBAL (no se reinicia por sucursal).
   * Nullable solo para poder agregar la columna sobre cajas ya existentes;
   * la apertura siempre lo asigna y el arranque rellena los nulos con el id.
   */
  @Column({
    type: 'int',
    unsigned: true,
    unique: true,
    nullable: true,
  })
  numero: number | null;

  @Column({
    name: 'monto_apertura',
    type: 'decimal',
    precision: 14,
    scale: 2,
  })
  montoApertura: number;

  @Column({
    name: 'monto_cierre',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  montoCierre?: number;

  @Column({
    name: 'monto_esperado',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  montoEsperado?: number;

  @Column({ name: 'abierta_en', type: 'datetime' })
  abiertaEn: Date;

  @Column({ name: 'cerrada_en', type: 'datetime', nullable: true })
  cerradaEn?: Date;

  @Column({
    type: 'enum',
    enum: EstadoCaja,
    default: EstadoCaja.ABIERTA,
  })
  estado: EstadoCaja;

  // String target evita ciclo ESM con movimiento-caja.entity
  @OneToMany('MovimientoCaja', 'caja')
  movimientos: MovimientoCaja[];

  static fromId(id: number): Caja {
    const caja = new Caja();
    caja.id = id;
    return caja;
  }
}
