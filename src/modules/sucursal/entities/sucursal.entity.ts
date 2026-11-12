import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/models/baseentity.js';

@Entity('sucursal')
export class Sucursal extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  /** Índice nombrado igual que en la migración `Multisucursal`. */
  @Index('uq_sucursal_codigo', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  codigo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion?: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  static fromId(id: number): Sucursal {
    const sucursal = new Sucursal();
    sucursal.id = id;
    return sucursal;
  }
}
