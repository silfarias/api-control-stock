import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoriaRequestDto {
  @ApiProperty({
    description: 'Nombre de la categoría',
    type: String,
    example: 'Bebidas',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción opcional de la categoría',
    type: String,
    example: 'Productos líquidos y refrescos',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
