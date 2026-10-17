import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { EstadoCompra } from '../../../common/enums/estado-compra.enum.js';
import { ProveedorDTO } from '../../proveedor/dto/proveedor.dto.js';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';
import { ItemCompraDTO } from './item-compra.dto.js';

export class CompraDTO extends CommonDTO {
  @ApiProperty({ description: 'Total de la compra', type: Number, example: 3010 })
  @Expose()
  total: number;

  @ApiProperty({
    description: 'Estado de la compra',
    enum: EstadoCompra,
    enumName: 'EstadoCompra',
  })
  @Expose()
  estado: EstadoCompra;

  @ApiProperty({ description: 'Proveedor', type: () => ProveedorDTO })
  @Type(() => ProveedorDTO)
  @Expose()
  proveedor: ProveedorDTO;

  @ApiProperty({ description: 'Usuario que registró la compra', type: () => UsuarioDTO })
  @Type(() => UsuarioDTO)
  @Expose()
  usuario: UsuarioDTO;

  @ApiProperty({ description: 'Ítems de la compra', type: [ItemCompraDTO] })
  @Type(() => ItemCompraDTO)
  @Expose()
  items: ItemCompraDTO[];
}
