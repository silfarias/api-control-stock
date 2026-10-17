import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { EstadoCaja } from '../../../common/enums/estado-caja.enum.js';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import type { MovimientoCaja } from './movimiento-caja.entity.js';

@Entity('caja')
export class Caja extends BaseEntity {
  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

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
