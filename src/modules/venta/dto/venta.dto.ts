import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { EstadoVenta } from '../../../common/enums/estado-venta.enum.js';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';
import { ItemVentaDTO } from './item-venta.dto.js';

export class VentaDTO extends CommonDTO {
  @ApiProperty({ description: 'Total de la venta', type: Number, example: 750 })
  @Expose()
  total: number;

  @ApiProperty({
    description: 'Método de pago',
    enum: MetodoPago,
    enumName: 'MetodoPago',
  })
  @Expose()
  metodoPago: MetodoPago;

  @ApiProperty({
    description: 'Estado de la venta',
    enum: EstadoVenta,
    enumName: 'EstadoVenta',
  })
  @Expose()
  estado: EstadoVenta;

  @ApiProperty({ description: 'Usuario que registró la venta', type: () => UsuarioDTO })
  @Type(() => UsuarioDTO)
  @Expose()
  usuario: UsuarioDTO;

  @ApiProperty({ description: 'Ítems de la venta', type: [ItemVentaDTO] })
  @Type(() => ItemVentaDTO)
  @Expose()
  items: ItemVentaDTO[];
}
