import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    description: 'Email del usuario',
    type: String,
    example: 'ana@empresa.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña',
    type: String,
    example: 'Clave$2026',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
