import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';

export class SucursalDTO extends CommonDTO {
  @ApiProperty({ description: 'Nombre de la sucursal', type: String, example: 'Casa Central' })
  @Expose()
  nombre: string;

  @ApiProperty({ description: 'Código único de la sucursal', type: String, example: 'CASA-CENTRAL' })
  @Expose()
  codigo: string;

  @ApiPropertyOptional({ description: 'Dirección', type: String })
  @Expose()
  direccion?: string;

  @ApiPropertyOptional({ description: 'Teléfono', type: String })
  @Expose()
  telefono?: string;

  @ApiProperty({ description: 'Indica si la sucursal está activa', type: Boolean })
  @Expose()
  activo: boolean;
}
