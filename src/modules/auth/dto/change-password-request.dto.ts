import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsEqual } from '../../../common/decorators/is-equal.decorator.js';
import { pass_regex } from '../../../common/interfaces/regex/pass_regex.js';

export class ChangePasswordRequestDto {
  @ApiProperty({
    description:
      'Nueva contraseña (8-15 chars, mayúscula, minúscula, número y carácter especial)',
    type: String,
    example: 'Nueva$2026',
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

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    type: String,
    example: 'Nueva$2026',
  })
  @IsNotEmpty()
  @IsString()
  @IsEqual('password', {
    message: 'La contraseña y su confirmación deben ser iguales',
  })
  confirmarPassword: string;
}
