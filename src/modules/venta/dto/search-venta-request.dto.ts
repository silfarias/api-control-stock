import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';
import { EstadoVenta } from '../../../common/enums/estado-venta.enum.js';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';

export class SearchVentaRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({ description: 'Filtrar por usuario', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  usuarioId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: EstadoVenta,
    enumName: 'EstadoVenta',
  })
  @IsOptional()
  @IsEnum(EstadoVenta)
  estado?: EstadoVenta;

  @ApiPropertyOptional({
    description: 'Filtrar por método de pago',
    enum: MetodoPago,
    enumName: 'MetodoPago',
  })
  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;
}
