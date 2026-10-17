import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateItemCompraRequestDto {
  @ApiProperty({ description: 'ID del producto', type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId: number;

  @ApiProperty({ description: 'Cantidad', type: Number, example: 20, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({
    description: 'Costo unitario de compra',
    type: Number,
    example: 150.5,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoUnitario: number;
}
