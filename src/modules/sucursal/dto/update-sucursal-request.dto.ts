import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSucursalRequestDto {
  @ApiPropertyOptional({ description: 'Nombre de la sucursal', type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Código único de la sucursal (se normaliza a mayúsculas)',
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  codigo?: string;

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

  @ApiPropertyOptional({ description: 'Activo', type: Boolean })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
