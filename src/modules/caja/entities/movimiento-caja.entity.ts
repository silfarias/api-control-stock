import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TipoMovimientoCaja } from '../../../common/enums/tipo-movimiento-caja.enum.js';
import { BaseEntity } from '../../../common/models/baseentity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import { Caja } from './caja.entity.js';

@Entity('movimiento_caja')
export class MovimientoCaja extends BaseEntity {
  @ManyToOne(() => Caja, (caja) => caja.movimientos, { nullable: false })
  @JoinColumn({ name: 'caja_id' })
  caja: Caja;

  @Column({ type: 'enum', enum: TipoMovimientoCaja })
  tipo: TipoMovimientoCaja;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descripcion?: string;

  @Column({ name: 'referencia_id', type: 'int', nullable: true })
  referenciaId?: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  static fromId(id: number): MovimientoCaja {
    const movimiento = new MovimientoCaja();
    movimiento.id = id;
    return movimiento;
  }
}
