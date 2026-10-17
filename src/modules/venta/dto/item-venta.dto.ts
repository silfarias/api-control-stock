import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { ProductoDTO } from '../../producto/dto/producto.dto.js';

export class ItemVentaDTO extends CommonDTO {
  @ApiProperty({ description: 'Cantidad vendida', type: Number, example: 2 })
  @Expose()
  cantidad: number;

  @ApiProperty({
    description: 'Precio unitario al momento de la venta',
    type: Number,
    example: 250,
  })
  @Expose()
  precioUnitario: number;

  @ApiProperty({ description: 'Subtotal', type: Number, example: 500 })
  @Expose()
  subtotal: number;

  @ApiProperty({ description: 'Producto', type: () => ProductoDTO })
  @Type(() => ProductoDTO)
  @Expose()
  producto: ProductoDTO;
}
