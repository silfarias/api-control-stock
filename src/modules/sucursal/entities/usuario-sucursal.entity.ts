import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import { Sucursal } from './sucursal.entity.js';

/**
 * Asignación usuario ↔ sucursal (join entity).
 * Sin soft delete: al reemplazar asignaciones se borran físicamente las filas.
 * Nombres de constraints alineados con la migración `Multisucursal`.
 */
@Entity('usuario_sucursal')
@Unique('UQ_usuario_sucursal_usuario_sucursal', ['usuario', 'sucursal'])
export class UsuarioSucursal {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({
    name: 'usuario_id',
    foreignKeyConstraintName: 'FK_usuario_sucursal_usuario',
  })
  usuario: Usuario;

  @ManyToOne(() => Sucursal, { nullable: false })
  @JoinColumn({
    name: 'sucursal_id',
    foreignKeyConstraintName: 'FK_usuario_sucursal_sucursal',
  })
  sucursal: Sucursal;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
