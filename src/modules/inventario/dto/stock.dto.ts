import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { ProductoDTO } from '../../producto/dto/producto.dto.js';
import { SucursalDTO } from '../../sucursal/dto/sucursal.dto.js';

export class StockDTO extends CommonDTO {
  @ApiProperty({ description: 'Cantidad disponible en stock', type: Number, example: 20 })
  @Expose()
  cantidad: number;

  @ApiProperty({
    description:
      'Producto asociado. `precioCosto` solo viene para ADMIN.',
    type: () => ProductoDTO,
  })
  @Type(() => ProductoDTO)
  @Expose()
  producto: ProductoDTO;

  @ApiProperty({ description: 'Sucursal a la que pertenece este stock', type: () => SucursalDTO })
  @Type(() => SucursalDTO)
  @Expose()
  sucursal: SucursalDTO;
}
