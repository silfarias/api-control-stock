import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ReporteStockBajoItemDto {
  @ApiProperty({ example: 7 })
  @Expose()
  productoId: number;

  @ApiProperty({ example: 'Agua mineral 500ml' })
  @Expose()
  nombre: string;

  @ApiProperty({ example: 'AGUA-500' })
  @Expose()
  codigo: string;

  @ApiProperty({ example: 3 })
  @Expose()
  cantidad: number;

  @ApiProperty({ example: 10 })
  @Expose()
  minimoStock: number;

  @ApiProperty({ example: 1 })
  @Expose()
  categoriaId: number;

  @ApiProperty({ example: 'Bebidas' })
  @Expose()
  categoriaNombre: string;
}
