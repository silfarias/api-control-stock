import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateProveedorRequestDto {
  @ApiPropertyOptional({ description: 'Nombre del proveedor', type: String })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  nombre?: string;

  @ApiPropertyOptional({ description: 'CUIT / identificación fiscal', type: String })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  cuit?: string;

  @ApiPropertyOptional({ description: 'Teléfono', type: String })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional({ description: 'Email', type: String })
  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @ApiPropertyOptional({ description: 'Dirección', type: String })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @ApiPropertyOptional({ description: 'Activo', type: Boolean })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
