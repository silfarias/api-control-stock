import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';

export class SearchCategoriaRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number, example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por nombre (parcial, case-insensitive)',
    type: String,
    example: 'Bebidas',
  })
  @IsOptional()
  @IsString()
  nombre?: string;
}
