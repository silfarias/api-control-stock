import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoMovimientoStock } from '../../../common/enums/tipo-movimiento-stock.enum.js';

export class CreateAjusteStockRequestDto {
  @ApiProperty({ description: 'ID del producto', type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId: number;

  @ApiProperty({
    description: 'Tipo de ajuste (solo entrada o salida)',
    enum: [TipoMovimientoStock.AJUSTE_ENTRADA, TipoMovimientoStock.AJUSTE_SALIDA],
    example: TipoMovimientoStock.AJUSTE_ENTRADA,
  })
  @IsIn(
    [TipoMovimientoStock.AJUSTE_ENTRADA, TipoMovimientoStock.AJUSTE_SALIDA],
    { message: 'tipo debe ser AJUSTE_ENTRADA o AJUSTE_SALIDA' },
  )
  tipo: TipoMovimientoStock.AJUSTE_ENTRADA | TipoMovimientoStock.AJUSTE_SALIDA;

  @ApiProperty({
    description: 'Cantidad a ajustar (siempre positiva)',
    type: Number,
    example: 5,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({
    description: 'Motivo obligatorio del ajuste',
    type: String,
    example: 'Corrección por inventario físico',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo: string;

  @ApiPropertyOptional({
    description: 'Descripción adicional opcional',
    type: String,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
