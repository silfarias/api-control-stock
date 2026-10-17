import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { ProductoDTO } from '../../producto/dto/producto.dto.js';

export class StockDTO extends CommonDTO {
  @ApiProperty({ description: 'Cantidad disponible en stock', type: Number, example: 20 })
  @Expose()
  cantidad: number;

  @ApiProperty({ description: 'Producto asociado', type: () => ProductoDTO })
  @Type(() => ProductoDTO)
  @Expose()
  producto: ProductoDTO;
}
