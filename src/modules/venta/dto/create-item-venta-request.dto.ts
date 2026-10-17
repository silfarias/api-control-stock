import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateItemVentaRequestDto {
  @ApiProperty({ description: 'ID del producto', type: Number, example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId: number;

  @ApiProperty({
    description: 'Cantidad a vender',
    type: Number,
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;
}
