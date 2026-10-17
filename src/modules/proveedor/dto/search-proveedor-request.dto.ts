import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';

export class SearchProveedorRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({ description: 'Filtrar por nombre', type: String })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Filtrar por activo', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  activo?: boolean;
}
