import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';

export class ChangePasswordResponseDto {
  @ApiProperty({
    description: 'Mensaje de confirmación',
    type: String,
    example: 'Contraseña cambiada exitosamente',
  })
  @Expose()
  message: string;

  @ApiProperty({ description: 'Información del usuario', type: UsuarioDTO })
  @Expose()
  @Type(() => UsuarioDTO)
  usuario: UsuarioDTO;
}
