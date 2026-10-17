import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateItemCompraRequestDto } from './create-item-compra-request.dto.js';

export class CreateCompraRequestDto {
  @ApiProperty({ description: 'ID del proveedor', type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  proveedorId: number;

  @ApiProperty({
    description: 'Ítems de la compra',
    type: [CreateItemCompraRequestDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemCompraRequestDto)
  items: CreateItemCompraRequestDto[];
}
