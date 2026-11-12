import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateItemTransferenciaRequestDto } from './create-item-transferencia-request.dto.js';

export class UpdateTransferenciaRequestDto {
  @ApiPropertyOptional({ description: 'ID de la sucursal de origen', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  sucursalOrigenId?: number;

  @ApiPropertyOptional({ description: 'ID de la sucursal de destino', type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  sucursalDestinoId?: number;

  @ApiPropertyOptional({ description: 'Observación', type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @ApiPropertyOptional({
    description: 'Reemplaza todos los ítems de la transferencia (solo BORRADOR)',
    type: [CreateItemTransferenciaRequestDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemTransferenciaRequestDto)
  items?: CreateItemTransferenciaRequestDto[];
}
