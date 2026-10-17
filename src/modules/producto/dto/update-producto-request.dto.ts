import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductoRequestDto {
  @ApiPropertyOptional({
    description: 'Nombre del producto',
    type: String,
    example: 'Agua mineral 500ml',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Descripción del producto',
    type: String,
    example: 'Botella de agua mineral sin gas',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Código interno (único)',
    type: String,
    example: 'AGUA-500',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  codigo?: string;

  @ApiPropertyOptional({
    description: 'Código de barras (único)',
    type: String,
    example: '7790001001234',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  codigoBarras?: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría',
    type: Number,
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  categoriaId?: number;

  @ApiPropertyOptional({
    description: 'Precio de costo',
    type: Number,
    example: 150.5,
    minimum: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioCosto?: number;

  @ApiPropertyOptional({
    description: 'Precio de venta',
    type: Number,
    example: 250,
    minimum: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioVenta?: number;

  @ApiPropertyOptional({
    description: 'Stock mínimo',
    type: Number,
    example: 10,
    minimum: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimoStock?: number;
}
