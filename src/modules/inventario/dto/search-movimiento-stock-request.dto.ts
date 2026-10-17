import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';
import { TipoMovimientoStock } from '../../../common/enums/tipo-movimiento-stock.enum.js';

export class SearchMovimientoStockRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de movimiento', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({ description: 'Filtrar por ID de producto', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  productoId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de movimiento',
    enum: TipoMovimientoStock,
    enumName: 'TipoMovimientoStock',
  })
  @IsOptional()
  @IsEnum(TipoMovimientoStock)
  tipo?: TipoMovimientoStock;

  @ApiPropertyOptional({ description: 'Filtrar por ID de usuario', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  usuarioId?: number;
}
