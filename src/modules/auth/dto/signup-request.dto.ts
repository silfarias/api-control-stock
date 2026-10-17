import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { pass_regex } from '../../../common/interfaces/regex/pass_regex.js';

export class SignupRequestDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    type: String,
    example: 'Ana Pérez',
    maxLength: 120,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({
    description: 'Email del usuario',
    type: String,
    example: 'ana@empresa.com',
  })
  @IsNotEmpty()
  @IsEmail()
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
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(15)
  @Matches(pass_regex, {
    message:
      'La contraseña debe tener 8-15 caracteres, incluir mayúscula, minúscula, número y un carácter especial ($@$!%*?&)',
  })
  password: string;
}
