import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateTransferenciaRequestDto {
  @ApiProperty({
    description: 'ID de la sucursal de origen (de donde sale el stock)',
    type: Number,
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sucursalOrigenId: number;

  @ApiProperty({
    description:
      'ID de la sucursal de destino (a donde entra el stock). Debe ser distinta del origen.',
    type: Number,
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sucursalDestinoId: number;

  @ApiPropertyOptional({ description: 'Observación', type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @ApiProperty({
    description: 'Ítems a transferir (al menos uno, sin productos repetidos)',
    type: [CreateItemTransferenciaRequestDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemTransferenciaRequestDto)
  items: CreateItemTransferenciaRequestDto[];
}
