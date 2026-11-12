import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateItemTransferenciaRequestDto {
  @ApiProperty({ description: 'ID del producto', type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId: number;

  @ApiProperty({
    description: 'Cantidad a transferir (mayor a 0)',
    type: Number,
    example: 5,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;
}
