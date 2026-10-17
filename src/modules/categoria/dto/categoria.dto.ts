import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CommonDTO } from '../../../common/dto/common.dto.js';

export class CategoriaDTO extends CommonDTO {
  @ApiProperty({
    description: 'Nombre de la categoría',
    type: String,
    example: 'Bebidas',
  })
  @Expose()
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    type: String,
    example: 'Productos líquidos y refrescos',
  })
  @Expose()
  descripcion?: string;
}
