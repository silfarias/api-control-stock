import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { TicketDTO } from './dto/ticket.dto.js';
import { UpdateTicketRequestDto } from './dto/update-ticket-request.dto.js';
import { Ticket } from './entities/ticket.entity.js';
import { TicketMapper } from './mappers/ticket.mapper.js';

const PAPER_MM = new Set([48, 58, 80, 90]);

const DEFAULTS = {
  unica: 1,
  paperMm: 80,
  comercio: '',
  direccion: '',
  telefono: '',
  cuit: '',
  mensaje: 'Gracias por su compra',
} as const;

@Injectable()
export class TicketService implements OnModuleInit {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    private readonly ticketMapper: TicketMapper,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensure();
  }

  async get(): Promise<TicketDTO> {
    const ticket = await this.ensure();
    return this.ticketMapper.entity2DTO(ticket);
  }

  async update(dto: UpdateTicketRequestDto): Promise<TicketDTO> {
    const ticket = await this.ensure();

    if (dto.paperMm !== undefined) {
      ticket.paperMm = this.assertPaperMm(dto.paperMm);
    }
    if (dto.comercio !== undefined) ticket.comercio = dto.comercio;
    if (dto.direccion !== undefined) ticket.direccion = dto.direccion;
    if (dto.telefono !== undefined) ticket.telefono = dto.telefono;
    if (dto.cuit !== undefined) ticket.cuit = dto.cuit;
    if (dto.mensaje !== undefined) ticket.mensaje = dto.mensaje;

    const saved = await this.ticketRepository.save(ticket);
    return this.ticketMapper.entity2DTO(saved);
  }

  private async ensure(): Promise<Ticket> {
    const existing = await this.ticketRepository.find({
      order: { id: 'ASC' },
      take: 1,
    });
    if (existing[0]) return existing[0];

    try {
      return await this.ticketRepository.save(
        this.ticketRepository.create({ ...DEFAULTS }),
      );
    } catch (error) {
      if (!this.isDuplicate(error)) throw error;
      const again = await this.ticketRepository.find({
        order: { id: 'ASC' },
        take: 1,
      });
      if (again[0]) return again[0];
      throw error;
    }
  }

  private assertPaperMm(value: unknown): number {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : Number.NaN;

    if (!Number.isInteger(parsed) || !PAPER_MM.has(parsed)) {
      this.errorHandler.throwBadRequest(ERRORS.TICKET.PAPER_MM);
    }

    return parsed;
  }

  private isDuplicate(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === 'ER_DUP_ENTRY'
    );
  }
}
