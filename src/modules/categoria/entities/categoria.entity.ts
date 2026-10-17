import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/models/baseentity.js';

@Entity('categoria')
export class Categoria extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descripcion?: string;

  static fromId(id: number): Categoria {
    const categoria = new Categoria();
    categoria.id = id;
    return categoria;
  }
}
