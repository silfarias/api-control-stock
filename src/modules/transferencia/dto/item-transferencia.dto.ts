import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { ProductoDTO } from '../../producto/dto/producto.dto.js';

export class ItemTransferenciaDTO extends CommonDTO {
  @ApiProperty({ description: 'Cantidad transferida', type: Number, example: 5 })
  @Expose()
  cantidad: number;

  @ApiProperty({ description: 'Producto', type: () => ProductoDTO })
  @Type(() => ProductoDTO)
  @Expose()
  producto: ProductoDTO;
}
