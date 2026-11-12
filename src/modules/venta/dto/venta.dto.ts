import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { EstadoVenta } from '../../../common/enums/estado-venta.enum.js';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';
import { SucursalDTO } from '../../sucursal/dto/sucursal.dto.js';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';
import { ItemVentaDTO } from './item-venta.dto.js';

export class VentaDTO extends CommonDTO {
  @ApiProperty({
    description:
      'Número de comprobante correlativo. Es el identificador visible de la venta; el id sigue siendo la clave técnica.',
    type: Number,
    example: 7,
  })
  @Expose()
  numero: number;

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

  @ApiProperty({
    description:
      'Sucursal en la que se registró la venta (datos vigentes). Para el comprobante usar los snapshots `sucursalNombre`, `sucursalDireccion` y `sucursalTelefono`.',
    type: () => SucursalDTO,
  })
  @Type(() => SucursalDTO)
  @Expose()
  sucursal: SucursalDTO;

  @ApiProperty({
    description:
      'Nombre de la sucursal al momento de la venta (snapshot inmutable).',
    type: String,
    example: 'Casa Central',
  })
  @Expose()
  sucursalNombre: string;

  @ApiPropertyOptional({
    description:
      'Dirección de la sucursal al momento de la venta (snapshot inmutable).',
    type: String,
    nullable: true,
  })
  @Expose()
  sucursalDireccion?: string | null;

  @ApiPropertyOptional({
    description:
      'Teléfono de la sucursal al momento de la venta (snapshot inmutable).',
    type: String,
    nullable: true,
  })
  @Expose()
  sucursalTelefono?: string | null;

  @ApiProperty({ description: 'Ítems de la venta', type: [ItemVentaDTO] })
  @Type(() => ItemVentaDTO)
  @Expose()
  items: ItemVentaDTO[];
}
