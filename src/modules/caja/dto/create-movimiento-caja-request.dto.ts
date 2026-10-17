import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoMovimientoCaja } from '../../../common/enums/tipo-movimiento-caja.enum.js';

export class CreateMovimientoCajaRequestDto {
  @ApiProperty({
    description: 'Tipo de movimiento manual (ingreso o egreso)',
    enum: [TipoMovimientoCaja.INGRESO, TipoMovimientoCaja.EGRESO],
    example: TipoMovimientoCaja.EGRESO,
  })
  @IsIn([TipoMovimientoCaja.INGRESO, TipoMovimientoCaja.EGRESO], {
    message: 'tipo debe ser INGRESO o EGRESO',
  })
  tipo: TipoMovimientoCaja.INGRESO | TipoMovimientoCaja.EGRESO;

  @ApiProperty({ description: 'Monto', type: Number, example: 10000, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;

  @ApiProperty({
    description: 'Motivo / descripción del movimiento',
    type: String,
    example: 'Retiro para proveedor',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  descripcion: string;

  @ApiPropertyOptional({ description: 'ID de referencia externa', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  referenciaId?: number;
}
