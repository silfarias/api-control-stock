import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { TipoMovimientoCaja } from '../../../common/enums/tipo-movimiento-caja.enum.js';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';

export class MovimientoCajaDTO extends CommonDTO {
  @ApiProperty({
    description: 'Tipo de movimiento de caja',
    enum: TipoMovimientoCaja,
    enumName: 'TipoMovimientoCaja',
  })
  @Expose()
  tipo: TipoMovimientoCaja;

  @ApiProperty({ description: 'Monto', type: Number, example: 1500 })
  @Expose()
  monto: number;

  @ApiPropertyOptional({ description: 'Descripción', type: String })
  @Expose()
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'ID de referencia (ej. id de venta)',
    type: Number,
  })
  @Expose()
  referenciaId?: number;

  @ApiProperty({ description: 'Usuario que registró el movimiento', type: () => UsuarioDTO })
  @Type(() => UsuarioDTO)
  @Expose()
  usuario: UsuarioDTO;
}
