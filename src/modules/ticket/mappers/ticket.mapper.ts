import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { TicketDTO } from '../dto/ticket.dto.js';
import { Ticket } from '../entities/ticket.entity.js';

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

@Injectable()
export class TicketMapper {
  entity2DTO(ticket: Ticket): TicketDTO {
    return plainToInstance(
      TicketDTO,
      {
        id: ticket.id,
        paperMm: Number(ticket.paperMm),
        comercio: ticket.comercio ?? '',
        direccion: ticket.direccion ?? '',
        telefono: ticket.telefono ?? '',
        cuit: ticket.cuit ?? '',
        mensaje: ticket.mensaje ?? '',
        createdAt: toIso(ticket.createdAt),
        updatedAt: toIso(ticket.updatedAt),
      },
      { excludeExtraneousValues: true },
    );
  }
}
