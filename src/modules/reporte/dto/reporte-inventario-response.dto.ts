import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ReporteInventarioItemDto {
  @ApiProperty({ example: 12 })
  @Expose()
  productoId: number;

  @ApiProperty({ example: 'Coca Cola 2L' })
  @Expose()
  nombre: string;

  @ApiProperty({ example: 'COCA-2L' })
  @Expose()
  codigo: string;

  @ApiProperty({ example: 40 })
  @Expose()
  cantidad: number;

  @ApiProperty({ example: 150.5 })
  @Expose()
  precioCosto: number;

  @ApiProperty({ example: 250 })
  @Expose()
  precioVenta: number;

  @ApiProperty({ description: 'cantidad * precioCosto', example: 6020 })
  @Expose()
  valorCosto: number;

  @ApiProperty({ description: 'cantidad * precioVenta', example: 10000 })
  @Expose()
  valorVenta: number;
}

export class ReporteInventarioResponseDto {
  @ApiProperty({ description: 'Cantidad de productos con stock', example: 25 })
  @Expose()
  cantidadProductos: number;

  @ApiProperty({ description: 'Unidades totales en stock', example: 1200 })
  @Expose()
  unidadesTotales: number;

  @ApiProperty({ description: 'Valor aprox. a costo', example: 185000 })
  @Expose()
  valorTotalCosto: number;

  @ApiProperty({ description: 'Valor aprox. a precio de venta', example: 310000 })
  @Expose()
  valorTotalVenta: number;

  @ApiProperty({ type: [ReporteInventarioItemDto] })
  @Type(() => ReporteInventarioItemDto)
  @Expose()
  items: ReporteInventarioItemDto[];
}
