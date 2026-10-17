import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/models/baseentity.js';

@Entity('proveedor')
export class Proveedor extends BaseEntity {
  @Column({ type: 'varchar', length: 180 })
  nombre: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  cuit?: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono?: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  direccion?: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  static fromId(id: number): Proveedor {
    const proveedor = new Proveedor();
    proveedor.id = id;
    return proveedor;
  }
}
