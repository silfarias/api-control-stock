import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';

export class SearchProductoRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number, example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por nombre (parcial)',
    type: String,
    example: 'Agua',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por código interno',
    type: String,
    example: 'AGUA-500',
  })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por código de barras',
    type: String,
    example: '7790001001234',
  })
  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de categoría',
    type: Number,
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  categoriaId?: number;
}
