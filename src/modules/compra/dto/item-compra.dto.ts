import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { ProductoDTO } from '../../producto/dto/producto.dto.js';

export class ItemCompraDTO extends CommonDTO {
  @ApiProperty({ description: 'Cantidad comprada', type: Number, example: 20 })
  @Expose()
  cantidad: number;

  @ApiProperty({ description: 'Costo unitario', type: Number, example: 150.5 })
  @Expose()
  costoUnitario: number;

  @ApiProperty({ description: 'Subtotal (cantidad * costoUnitario)', type: Number })
  @Expose()
  subtotal: number;

  @ApiProperty({ description: 'Producto', type: () => ProductoDTO })
  @Type(() => ProductoDTO)
  @Expose()
  producto: ProductoDTO;
}
