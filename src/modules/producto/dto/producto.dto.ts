import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { CategoriaDTO } from '../../categoria/dto/categoria.dto.js';

export class ProductoDTO extends CommonDTO {
  @ApiProperty({ description: 'Nombre del producto', type: String, example: 'Agua mineral 500ml' })
  @Expose()
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción del producto',
    type: String,
    example: 'Botella de agua mineral sin gas',
  })
  @Expose()
  descripcion?: string;

  @ApiProperty({ description: 'Código interno del producto', type: String, example: 'AGUA-500' })
  @Expose()
  codigo: string;

  @ApiProperty({
    description: 'Código de barras',
    type: String,
    example: '7790001001234',
  })
  @Expose()
  codigoBarras: string;

  @ApiProperty({ description: 'Precio de costo', type: Number, example: 150.5 })
  @Expose()
  precioCosto: number;

  @ApiProperty({ description: 'Precio de venta', type: Number, example: 250 })
  @Expose()
  precioVenta: number;

  @ApiProperty({ description: 'Stock mínimo permitido', type: Number, example: 10 })
  @Expose()
  minimoStock: number;

  @ApiProperty({ description: 'Categoría del producto', type: () => CategoriaDTO })
  @Type(() => CategoriaDTO)
  @Expose()
  categoria: CategoriaDTO;
}
