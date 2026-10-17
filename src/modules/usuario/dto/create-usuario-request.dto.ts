import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';
import { pass_regex } from '../../../common/interfaces/regex/pass_regex.js';

export class CreateUsuarioRequestDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    type: String,
    example: 'Ana Pérez',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({
    description: 'Email del usuario (único)',
    type: String,
    example: 'ana@empresa.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(180)
  email: string;

  @ApiProperty({
    description:
      'Contraseña (8-15 chars, mayúscula, minúscula, número y carácter especial $ @ ! % * ? &)',
    type: String,
    example: 'Clave$2026',
    minLength: 8,
    maxLength: 15,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(15)
  @Matches(pass_regex, {
    message:
      'La contraseña debe tener 8-15 caracteres, incluir mayúscula, minúscula, número y un carácter especial ($@$!%*?&)',
  })
  password: string;

  @ApiProperty({
    description: 'Rol del usuario',
    enum: UsuarioRole,
    enumName: 'UsuarioRole',
    example: UsuarioRole.EMPLEADO,
  })
  @IsNotEmpty()
  @IsEnum(UsuarioRole)
  role: UsuarioRole;
}
