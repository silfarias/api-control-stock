import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ReporteProductoTopItemDto {
  @ApiProperty({ example: 12 })
  @Expose()
  productoId: number;

  @ApiProperty({ example: 'Coca Cola 2L' })
  @Expose()
  nombre: string;

  @ApiProperty({ example: 'COCA-2L' })
  @Expose()
  codigo: string;

  @ApiProperty({ description: 'Unidades vendidas', example: 85 })
  @Expose()
  cantidadVendida: number;

  @ApiProperty({ description: 'Monto total vendido', example: 42500 })
  @Expose()
  totalVendido: number;
}
