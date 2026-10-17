import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';
import { pass_regex } from '../../../common/interfaces/regex/pass_regex.js';

export class UpdateUsuarioRequestDto {
  @ApiPropertyOptional({
    description: 'Nombre del usuario',
    type: String,
    example: 'Ana Pérez',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Email del usuario (único)',
    type: String,
    example: 'ana@empresa.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @ApiPropertyOptional({
    description:
      'Nueva contraseña (8-15 chars, mayúscula, minúscula, número y carácter especial $ @ ! % * ? &)',
    type: String,
    example: 'Clave$2026',
    minLength: 8,
    maxLength: 15,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(15)
  @Matches(pass_regex, {
    message:
      'La contraseña debe tener 8-15 caracteres, incluir mayúscula, minúscula, número y un carácter especial ($@$!%*?&)',
  })
  password?: string;

  @ApiPropertyOptional({
    description: 'Rol del usuario',
    enum: UsuarioRole,
    enumName: 'UsuarioRole',
    example: UsuarioRole.ADMIN,
  })
  @IsOptional()
  @IsEnum(UsuarioRole)
  role?: UsuarioRole;
}
