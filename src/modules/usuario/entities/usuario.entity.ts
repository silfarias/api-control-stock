import { Column, Entity } from 'typeorm';
import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';
import { BaseEntity } from '../../../common/models/baseentity.js';

@Entity('usuario')
export class Usuario extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: UsuarioRole,
    default: UsuarioRole.EMPLEADO,
  })
  role: UsuarioRole;

  static fromId(id: number): Usuario {
    const usuario = new Usuario();
    usuario.id = id;
    return usuario;
  }
}
