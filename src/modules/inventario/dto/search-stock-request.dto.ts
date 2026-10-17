import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';

export class SearchStockRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de stock', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({ description: 'Filtrar por ID de producto', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  productoId?: number;
}
