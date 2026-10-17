import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class AbrirCajaRequestDto {
  @ApiProperty({
    description: 'Monto inicial en caja',
    type: Number,
    example: 20000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoApertura: number;
}
