import { ApiProperty } from '@nestjs/swagger';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Token de acceso JWT (corto plazo)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description:
      'Token de refresco para renovar el access token sin volver a iniciar sesión',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Tiempo de expiración del access token (ej: 1d, 1h)',
    example: '1d',
  })
  expires_in: string;

  @ApiProperty({
    description: 'Datos del usuario autenticado',
    type: UsuarioDTO,
  })
  usuario: UsuarioDTO;
}
