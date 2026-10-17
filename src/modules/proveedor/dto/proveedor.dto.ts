import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';

export class ProveedorDTO extends CommonDTO {
  @ApiProperty({ description: 'Nombre del proveedor', type: String, example: 'Distribuidora Sur' })
  @Expose()
  nombre: string;

  @ApiPropertyOptional({ description: 'CUIT / identificación fiscal', type: String })
  @Expose()
  cuit?: string;

  @ApiPropertyOptional({ description: 'Teléfono', type: String })
  @Expose()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Email', type: String })
  @Expose()
  email?: string;

  @ApiPropertyOptional({ description: 'Dirección', type: String })
  @Expose()
  direccion?: string;

  @ApiProperty({ description: 'Indica si el proveedor está activo', type: Boolean })
  @Expose()
  activo: boolean;
}
