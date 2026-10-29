import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';

export class SearchProductoRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por nombre (parcial)',
    type: String,
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por código interno (parcial, sin distinguir mayúsculas)',
    type: String,
  })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por código de barras (parcial: alcanza con un fragmento del número)',
    type: String,
  })
  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de categoría',
    type: Number,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  categoriaId?: number;
}
