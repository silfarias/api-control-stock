import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';

export class SeedAdminResponseDto {
  @ApiProperty({
    description: 'Indica si el admin se creó en esta ejecución',
    example: true,
  })
  @Expose()
  created: boolean;

  @ApiProperty({
    description: 'Mensaje de resultado',
    example: 'Usuario admin creado correctamente',
  })
  @Expose()
  message: string;

  @ApiProperty({ description: 'Usuario admin', type: UsuarioDTO })
  @Expose()
  @Type(() => UsuarioDTO)
  usuario: UsuarioDTO;

  @ApiProperty({ description: 'Token JWT de acceso', type: String })
  @Expose()
  access_token: string;

  @ApiProperty({ description: 'Token de refresco', type: String })
  @Expose()
  refresh_token: string;

  @ApiProperty({ description: 'Expiración del access token', example: '1d' })
  @Expose()
  expires_in: string;
}
