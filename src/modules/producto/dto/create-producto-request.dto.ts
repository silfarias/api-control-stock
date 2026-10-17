import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateProductoStockRequestDto } from './create-producto-stock-request.dto.js';

export class CreateProductoRequestDto {
  @ApiProperty({
    description: 'Nombre del producto',
    type: String,
    example: 'Agua mineral 500ml',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción opcional del producto',
    type: String,
    example: 'Botella de agua mineral sin gas',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({
    description: 'Código interno (único)',
    type: String,
    example: 'AGUA-500',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  codigo: string;

  @ApiProperty({
    description: 'Código de barras (único)',
    type: String,
    example: '7790001001234',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  codigoBarras: string;

  @ApiProperty({
    description: 'ID de la categoría',
    type: Number,
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  categoriaId: number;

  @ApiProperty({
    description: 'Precio de costo',
    type: Number,
    example: 150.5,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioCosto: number;

  @ApiProperty({
    description: 'Precio de venta',
    type: Number,
    example: 250,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioVenta: number;

  @ApiProperty({
    description: 'Stock mínimo',
    type: Number,
    example: 10,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimoStock: number;

  @ApiPropertyOptional({
    description:
      'Stock inicial opcional. Si se omite, el producto queda con stock 0.',
    type: CreateProductoStockRequestDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProductoStockRequestDto)
  stock?: CreateProductoStockRequestDto;
}
