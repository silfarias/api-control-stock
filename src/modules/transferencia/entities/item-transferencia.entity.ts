import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Producto } from '../../producto/entities/producto.entity.js';
import { Transferencia } from './transferencia.entity.js';

@Entity('item_transferencia')
export class ItemTransferencia extends BaseEntity {
  @ManyToOne(() => Transferencia, (transferencia) => transferencia.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'transferencia_id',
    foreignKeyConstraintName: 'FK_item_transferencia_transferencia',
  })
  transferencia: Transferencia;

  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({
    name: 'producto_id',
    foreignKeyConstraintName: 'FK_item_transferencia_producto',
  })
  producto: Producto;

  /** Unidades a trasladar (> 0). */
  @Column({ type: 'int' })
  cantidad: number;
}
