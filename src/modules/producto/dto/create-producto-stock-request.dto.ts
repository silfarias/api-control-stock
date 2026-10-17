import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateProductoStockRequestDto {
  @ApiProperty({
    description: 'Cantidad inicial de stock del producto',
    type: Number,
    minimum: 0,
    example: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad: number;
}
