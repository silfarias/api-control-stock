import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsDate, IsNumber, IsOptional } from 'class-validator';

export class CommonDTO {
  @ApiProperty({
    description: 'Id de la entidad a insertar/modificar',
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Expose()
  id: number;

  @ApiProperty({
    description: 'Fecha de creación',
    type: Date,
    default: new Date(),
  })
  @IsDate()
  @IsOptional()
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de actualización',
    type: Date,
    default: new Date(),
  })
  @IsDate()
  @IsOptional()
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'Fecha de eliminación',
    type: Date,
    default: new Date(),
    required: false,
  })
  @IsDate()
  @IsOptional()
  @Expose()
  deletedAt?: Date;

}