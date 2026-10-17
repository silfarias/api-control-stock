import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ReporteVentasMetodoPagoItemDto } from './reporte-ventas-metodo-pago-item.dto.js';

export class ReporteVentasResponseDto {
  @ApiProperty({ description: 'Cantidad de ventas confirmadas', example: 42 })
  @Expose()
  cantidadVentas: number;

  @ApiProperty({ description: 'Total de ingresos (suma de totales)', example: 125000.5 })
  @Expose()
  totalIngresos: number;

  @ApiProperty({ description: 'Cantidad total de unidades vendidas', example: 310 })
  @Expose()
  unidadesVendidas: number;

  @ApiProperty({ description: 'Ticket promedio', example: 2976.2 })
  @Expose()
  ticketPromedio: number;

  @ApiProperty({
    description:
      'Desglose por método de pago (todos los valores del enum; 0 si no hubo ventas)',
    type: [ReporteVentasMetodoPagoItemDto],
  })
  @Type(() => ReporteVentasMetodoPagoItemDto)
  @Expose()
  porMetodoPago: ReporteVentasMetodoPagoItemDto[];
}
