import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';

export class ReporteVentasMetodoPagoItemDto {
  @ApiProperty({ enum: MetodoPago, enumName: 'MetodoPago' })
  @Expose()
  metodoPago: MetodoPago;

  @ApiProperty({ description: 'Cantidad de ventas con este método', example: 20 })
  @Expose()
  cantidadVentas: number;

  @ApiProperty({ description: 'Suma de totales con este método', example: 500000 })
  @Expose()
  totalIngresos: number;

  @ApiProperty({ description: 'Unidades vendidas con este método', example: 150 })
  @Expose()
  unidadesVendidas: number;

  @ApiProperty({
    description: 'Porcentaje de ingresos sobre el total del período (0–100)',
    example: 40,
  })
  @Expose()
  porcentajeIngresos: number;
}
