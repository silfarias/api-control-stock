import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';
import { EstadoVenta } from '../../../common/enums/estado-venta.enum.js';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';
import { IsCalendarDate } from '../../../common/validators/is-calendar-date.validator.js';

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

  @ApiPropertyOptional({
    description:
      'Día calendario YYYY-MM-DD en la zona horaria comercial de la DB (DB_TIMEZONE, típ. America/Argentina/Buenos_Aires / -03:00). Filtra created_date con rango [00:00:00, día siguiente 00:00:00).',
    example: '2026-11-11',
  })
  @IsOptional()
  @IsCalendarDate()
  fecha?: string;
}
