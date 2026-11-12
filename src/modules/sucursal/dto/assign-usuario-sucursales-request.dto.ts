import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

export class AssignUsuarioSucursalesRequestDto {
  @ApiProperty({
    description:
      'IDs de las sucursales asignadas al usuario. Reemplaza las asignaciones actuales. Puede ser vacío (sin sucursales).',
    type: [Number],
    example: [1, 2],
  })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  sucursalIds: number[];
}
