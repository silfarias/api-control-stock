import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { EstadoTransferencia } from '../../../common/enums/estado-transferencia.enum.js';
import { SucursalDTO } from '../../sucursal/dto/sucursal.dto.js';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';
import { ItemTransferenciaDTO } from './item-transferencia.dto.js';

export class TransferenciaDTO extends CommonDTO {
  @ApiProperty({
    description:
      'Número de comprobante correlativo GLOBAL. Es el identificador visible; el id sigue siendo la clave técnica.',
    type: Number,
    example: 3,
  })
  @Expose()
  numero: number;

  @ApiProperty({
    description: 'Estado de la transferencia',
    enum: EstadoTransferencia,
    enumName: 'EstadoTransferencia',
  })
  @Expose()
  estado: EstadoTransferencia;

  @ApiProperty({ description: 'Sucursal de origen', type: () => SucursalDTO })
  @Type(() => SucursalDTO)
  @Expose()
  sucursalOrigen: SucursalDTO;

  @ApiProperty({ description: 'Sucursal de destino', type: () => SucursalDTO })
  @Type(() => SucursalDTO)
  @Expose()
  sucursalDestino: SucursalDTO;

  @ApiProperty({
    description: 'Usuario que registró la transferencia',
    type: () => UsuarioDTO,
  })
  @Type(() => UsuarioDTO)
  @Expose()
  usuario: UsuarioDTO;

  @ApiPropertyOptional({ description: 'Observación', type: String, nullable: true })
  @Expose()
  observacion?: string | null;

  @ApiProperty({ description: 'Ítems', type: [ItemTransferenciaDTO] })
  @Type(() => ItemTransferenciaDTO)
  @Expose()
  items: ItemTransferenciaDTO[];
}
