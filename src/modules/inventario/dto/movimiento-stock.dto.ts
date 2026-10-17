import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';
import { TipoMovimientoStock } from '../../../common/enums/tipo-movimiento-stock.enum.js';
import { TipoReferenciaMovimiento } from '../../../common/enums/tipo-referencia-movimiento.enum.js';
import { ProductoDTO } from '../../producto/dto/producto.dto.js';
import { UsuarioDTO } from '../../usuario/dto/usuario.dto.js';

export class MovimientoStockDTO extends CommonDTO {
  @ApiProperty({
    description: 'Tipo de movimiento',
    enum: TipoMovimientoStock,
    enumName: 'TipoMovimientoStock',
  })
  @Expose()
  tipo: TipoMovimientoStock;

  @ApiProperty({ description: 'Cantidad del movimiento', type: Number, example: 3 })
  @Expose()
  cantidad: number;

  @ApiProperty({ description: 'Stock antes del movimiento', type: Number, example: 20 })
  @Expose()
  stockAnterior: number;

  @ApiProperty({ description: 'Stock después del movimiento', type: Number, example: 17 })
  @Expose()
  stockNuevo: number;

  @ApiProperty({
    description: 'Tipo de referencia del origen',
    enum: TipoReferenciaMovimiento,
    enumName: 'TipoReferenciaMovimiento',
  })
  @Expose()
  tipoReferencia: TipoReferenciaMovimiento;

  @ApiPropertyOptional({ description: 'ID de la referencia externa', type: Number })
  @Expose()
  referenciaId?: number;

  @ApiProperty({ description: 'Motivo del movimiento', type: String })
  @Expose()
  motivo: string;

  @ApiPropertyOptional({ description: 'Descripción adicional', type: String })
  @Expose()
  descripcion?: string;

  @ApiProperty({ description: 'Producto afectado', type: () => ProductoDTO })
  @Type(() => ProductoDTO)
  @Expose()
  producto: ProductoDTO;

  @ApiProperty({ description: 'Usuario que registró el movimiento', type: () => UsuarioDTO })
  @Type(() => UsuarioDTO)
  @Expose()
  usuario: UsuarioDTO;
}
