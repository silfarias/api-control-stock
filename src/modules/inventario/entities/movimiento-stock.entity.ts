import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TipoMovimientoStock } from '../../../common/enums/tipo-movimiento-stock.enum.js';
import { TipoReferenciaMovimiento } from '../../../common/enums/tipo-referencia-movimiento.enum.js';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Producto } from '../../producto/entities/producto.entity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';

@Entity('movimiento_stock')
export class MovimientoStock extends BaseEntity {
  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({ name: 'producto_id' })
  producto: Producto;

  @Column({ type: 'enum', enum: TipoMovimientoStock })
  tipo: TipoMovimientoStock;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ name: 'stock_anterior', type: 'int' })
  stockAnterior: number;

  @Column({ name: 'stock_nuevo', type: 'int' })
  stockNuevo: number;

  @Column({
    name: 'tipo_referencia',
    type: 'enum',
    enum: TipoReferenciaMovimiento,
  })
  tipoReferencia: TipoReferenciaMovimiento;

  @Column({ name: 'referencia_id', type: 'int', nullable: true })
  referenciaId?: number;

  @Column({ type: 'varchar', length: 500 })
  motivo: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descripcion?: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  static fromId(id: number): MovimientoStock {
    const movimiento = new MovimientoStock();
    movimiento.id = id;
    return movimiento;
  }
}
