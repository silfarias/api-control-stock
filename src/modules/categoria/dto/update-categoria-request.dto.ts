import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoriaRequestDto {
  @ApiPropertyOptional({
    description: 'Nombre de la categoría',
    type: String,
    example: 'Bebidas',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    type: String,
    example: 'Productos líquidos y refrescos',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
