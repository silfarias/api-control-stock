import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';
import { EstadoTransferencia } from '../../../common/enums/estado-transferencia.enum.js';

export class SearchTransferenciaRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por sucursal de origen',
    type: Number,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  sucursalOrigenId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por sucursal de destino',
    type: Number,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  sucursalDestinoId?: number;

  @ApiPropertyOptional({
    description: 'Transferencias donde la sucursal es origen O destino',
    type: Number,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  sucursalId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por usuario', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  usuarioId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: EstadoTransferencia,
    enumName: 'EstadoTransferencia',
  })
  @IsOptional()
  @IsEnum(EstadoTransferencia)
  estado?: EstadoTransferencia;
}
