import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Categoria } from '../../categoria/entities/categoria.entity.js';

@Entity('producto')
export class Producto extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descripcion?: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  codigo: string;

  @Column({ name: 'codigo_barras', type: 'varchar', length: 80, unique: true })
  codigoBarras: string;

  @ManyToOne(() => Categoria, { nullable: false, eager: false })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria;

  @Column({
    name: 'precio_costo',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  precioCosto: number;

  @Column({
    name: 'precio_venta',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  precioVenta: number;

  @Column({ name: 'minimo_stock', type: 'int', default: 0 })
  minimoStock: number;

  static fromId(id: number): Producto {
    const producto = new Producto();
    producto.id = id;
    return producto;
  }
}
