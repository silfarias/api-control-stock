import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { MetodoPago } from '../../../common/enums/metodo-pago.enum.js';
import { CreateItemVentaRequestDto } from './create-item-venta-request.dto.js';

export class CreateVentaRequestDto {
  @ApiProperty({
    description: 'Método de pago',
    enum: MetodoPago,
    enumName: 'MetodoPago',
    example: MetodoPago.EFECTIVO,
  })
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @ApiProperty({
    description:
      'Ítems a vender. Solo productoId y cantidad; el backend calcula precios y totales.',
    type: [CreateItemVentaRequestDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemVentaRequestDto)
  items: CreateItemVentaRequestDto[];
}
