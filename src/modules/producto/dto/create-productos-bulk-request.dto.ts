import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateProductoRequestDto } from './create-producto-request.dto.js';

export class CreateProductosBulkRequestDto {
  @ApiProperty({
    description: 'Lista de productos a crear (con stock opcional por ítem)',
    type: [CreateProductoRequestDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateProductoRequestDto)
  productos: CreateProductoRequestDto[];
}
