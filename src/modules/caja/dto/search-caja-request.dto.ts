import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';
import { EstadoCaja } from '../../../common/enums/estado-caja.enum.js';

export class SearchCajaRequestDto extends BaseSearchDto {
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
    enum: EstadoCaja,
    enumName: 'EstadoCaja',
  })
  @IsOptional()
  @IsEnum(EstadoCaja)
  estado?: EstadoCaja;
}
