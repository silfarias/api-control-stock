import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';

export class SearchCategoriaRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por nombre (parcial, case-insensitive)',
    type: String,
  })
  @IsOptional()
  @IsString()
  nombre?: string;
}
