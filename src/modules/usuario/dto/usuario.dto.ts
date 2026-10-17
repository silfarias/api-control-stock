import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';

export class UsuarioDTO extends CommonDTO {
  @ApiProperty({
    description: 'Nombre del usuario',
    type: String,
    example: 'Ana Pérez',
  })
  @Expose()
  nombre: string;

  @ApiProperty({
    description: 'Email del usuario',
    type: String,
    example: 'ana@empresa.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'Rol del usuario',
    enum: UsuarioRole,
    enumName: 'UsuarioRole',
    example: UsuarioRole.EMPLEADO,
  })
  @Expose()
  role: UsuarioRole;
}
