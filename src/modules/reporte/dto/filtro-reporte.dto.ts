import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FiltroReporteDto {
  @ApiPropertyOptional({
    description: 'Fecha desde (ISO: YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({
    description: 'Fecha hasta (ISO: YYYY-MM-DD)',
    example: '2026-10-31',
  })
  @IsOptional()
  @IsDateString()
  hasta?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  categoriaId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por producto', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  productoId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por usuario (vendedor)', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  usuarioId?: number;

  @ApiPropertyOptional({
    description: 'Límite de resultados (top productos)',
    type: Number,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 10;
}
