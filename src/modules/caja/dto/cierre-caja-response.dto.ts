import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CajaDTO } from './caja.dto.js';

export class CierreCajaResponseDto {
  @ApiProperty({ type: () => CajaDTO })
  @Type(() => CajaDTO)
  @Expose()
  caja: CajaDTO;

  @ApiProperty({ description: 'Monto esperado calculado', type: Number })
  @Expose()
  montoEsperado: number;

  @ApiProperty({ description: 'Monto contado al cierre', type: Number })
  @Expose()
  montoCierre: number;

  @ApiProperty({
    description: 'Diferencia (contado - esperado)',
    type: Number,
  })
  @Expose()
  diferencia: number;
}
