import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { EstadoCaja } from '../../../common/enums/estado-caja.enum.js';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';

export class CajaDTO extends CommonDTO {
  @ApiProperty({
    description:
      'Número de caja correlativo. Es el identificador visible; el id sigue siendo la clave técnica.',
    type: Number,
    example: 2,
  })
  @Expose()
  numero: number;

  @ApiProperty({ description: 'Monto de apertura', type: Number, example: 20000 })
  @Expose()
  montoApertura: number;

  @ApiPropertyOptional({ description: 'Monto de cierre contado', type: Number })
  @Expose()
  montoCierre?: number;

  @ApiPropertyOptional({
    description: 'Monto esperado según movimientos',
    type: Number,
  })
  @Expose()
  montoEsperado?: number;

  @ApiProperty({ description: 'Fecha/hora de apertura', type: Date })
  @Expose()
  abiertaEn: Date;

  @ApiPropertyOptional({ description: 'Fecha/hora de cierre', type: Date })
  @Expose()
  cerradaEn?: Date;

  @ApiProperty({
    description: 'Estado de la caja',
    enum: EstadoCaja,
    enumName: 'EstadoCaja',
  })
  @Expose()
  estado: EstadoCaja;

  @ApiProperty({ description: 'Usuario que abrió la caja', type: () => UsuarioDTO })
  @Type(() => UsuarioDTO)
  @Expose()
  usuario: UsuarioDTO;
}
