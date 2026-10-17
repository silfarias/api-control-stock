import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class CerrarCajaRequestDto {
  @ApiProperty({
    description: 'Monto contado al cerrar la caja',
    type: Number,
    example: 90000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoCierre: number;
}
