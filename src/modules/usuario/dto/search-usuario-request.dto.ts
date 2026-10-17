import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseSearchDto } from '../../../common/dto/base-search.dto.js';
import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';

export class SearchUsuarioRequestDto extends BaseSearchDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID', type: Number, example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por nombre (parcial, case-insensitive)',
    type: String,
    example: 'Ana',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por email exacto',
    type: String,
    example: 'ana@empresa.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por rol',
    enum: UsuarioRole,
    enumName: 'UsuarioRole',
    example: UsuarioRole.EMPLEADO,
  })
  @IsOptional()
  @IsEnum(UsuarioRole)
  role?: UsuarioRole;
}
