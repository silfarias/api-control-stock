import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSucursalRequestDto {
  @ApiProperty({ description: 'Nombre de la sucursal', type: String, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({
    description: 'Código único de la sucursal (se normaliza a mayúsculas)',
    type: String,
    maxLength: 40,
    example: 'SUC-NORTE',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo: string;

  @ApiPropertyOptional({ description: 'Dirección', type: String })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @ApiPropertyOptional({ description: 'Teléfono', type: String })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional({ description: 'Activo', type: Boolean, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
