import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ReporteVentasDiarioItemDto {
  @ApiProperty({ description: 'Fecha (YYYY-MM-DD)', example: '2026-10-16' })
  @Expose()
  fecha: string;

  @ApiProperty({ description: 'Cantidad de ventas del día', example: 8 })
  @Expose()
  cantidadVentas: number;

  @ApiProperty({ description: 'Total vendido del día', example: 15400 })
  @Expose()
  totalIngresos: number;
}
