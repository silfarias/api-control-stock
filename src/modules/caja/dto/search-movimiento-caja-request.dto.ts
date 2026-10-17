import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';
import { TipoMovimientoCaja } from '../../../common/enums/tipo-movimiento-caja.enum.js';

export class SearchMovimientoCajaRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({ description: 'Filtrar por caja', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  cajaId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo',
    enum: TipoMovimientoCaja,
    enumName: 'TipoMovimientoCaja',
  })
  @IsOptional()
  @IsEnum(TipoMovimientoCaja)
  tipo?: TipoMovimientoCaja;
}
