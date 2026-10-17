import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';

export class SignupResponseDto {
  @ApiProperty({
    description: 'Token JWT de acceso',
    type: String,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  access_token: string;

  @ApiProperty({
    description: 'Token de refresco para renovar el access token',
    type: String,
  })
  @Expose()
  refresh_token: string;

  @ApiProperty({
    description: 'Tiempo de expiración del access token (ej: 1d)',
    type: String,
    example: '1d',
  })
  @Expose()
  expires_in: string;

  @ApiProperty({ description: 'Información del usuario registrado', type: UsuarioDTO })
  @Expose()
  @Type(() => UsuarioDTO)
  usuario: UsuarioDTO;

  @ApiProperty({
    description: 'Mensaje de confirmación',
    type: String,
    example: 'Usuario registrado y autenticado exitosamente',
  })
  @Expose()
  message: string;
}
