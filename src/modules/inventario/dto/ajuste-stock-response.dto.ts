import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { MovimientoStockDTO } from './movimiento-stock.dto.js';
import { StockDTO } from './stock.dto.js';

export class AjusteStockResponseDto {
  @ApiProperty({ description: 'Stock actualizado', type: () => StockDTO })
  @Type(() => StockDTO)
  @Expose()
  stock: StockDTO;

  @ApiProperty({
    description: 'Movimiento registrado (inmutable)',
    type: () => MovimientoStockDTO,
  })
  @Type(() => MovimientoStockDTO)
  @Expose()
  movimiento: MovimientoStockDTO;
}
