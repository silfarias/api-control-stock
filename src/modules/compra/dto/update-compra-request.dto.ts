import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateItemCompraRequestDto } from './create-item-compra-request.dto.js';

export class UpdateCompraRequestDto {
  @ApiPropertyOptional({ description: 'ID del proveedor', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  proveedorId?: number;

  @ApiPropertyOptional({
    description: 'Reemplaza todos los ítems de la compra (solo BORRADOR)',
    type: [CreateItemCompraRequestDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemCompraRequestDto)
  items?: CreateItemCompraRequestDto[];
}
