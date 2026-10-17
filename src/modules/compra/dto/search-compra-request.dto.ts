import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';
import { EstadoCompra } from '../../../common/enums/estado-compra.enum.js';

export class SearchCompraRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({ description: 'Filtrar por proveedor', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  proveedorId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por usuario', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  usuarioId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: EstadoCompra,
    enumName: 'EstadoCompra',
  })
  @IsOptional()
  @IsEnum(EstadoCompra)
  estado?: EstadoCompra;
}
