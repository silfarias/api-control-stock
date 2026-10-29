import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TicketDTO {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ enum: [48, 58, 80, 90], example: 80 })
  @Expose()
  paperMm: number;

  @ApiProperty({ example: 'MIA MOTOREPUESTOS' })
  @Expose()
  comercio: string;

  @ApiProperty({ example: 'Bº El Porvenir Mz 45 Cs 28' })
  @Expose()
  direccion: string;

  @ApiProperty({ example: '3705246344' })
  @Expose()
  telefono: string;

  @ApiProperty({ example: '00000000001' })
  @Expose()
  cuit: string;

  @ApiProperty({ example: 'NO VALIDO COMO TICKET FISCAL' })
  @Expose()
  mensaje: string;

  @ApiProperty({ example: '2026-10-29T18:00:00.000Z' })
  @Expose()
  createdAt: string;

  @ApiProperty({ example: '2026-10-29T18:05:00.000Z' })
  @Expose()
  updatedAt: string;
}
