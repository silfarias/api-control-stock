import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TicketDTO } from './dto/ticket.dto.js';
import { UpdateTicketRequestDto } from './dto/update-ticket-request.dto.js';
import { TicketService } from './ticket.service.js';

@ApiTags('Ticket')
@Controller('ticket')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('authorization')
@ApiUnauthorizedResponse({ description: 'No autorizado' })
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  @ApiOperation({
    summary: 'Configuración del ticket',
    description:
      'Devuelve la única configuración del comercio (encabezado, papel y mensaje). Si no existe, la crea con los valores iniciales. ADMIN o EMPLEADO.',
  })
  @ApiOkResponse({ type: TicketDTO })
  get(): Promise<TicketDTO> {
    return this.ticketService.get();
  }

  @Patch()
  @ApiOperation({
    summary: 'Actualizar configuración del ticket',
    description:
      'Actualización parcial. Los campos ausentes se conservan. Se ignoran id, fechas y campos desconocidos. ADMIN o EMPLEADO.',
  })
  @ApiBody({ type: UpdateTicketRequestDto })
  @ApiOkResponse({ type: TicketDTO })
  @ApiBadRequestResponse({
    description:
      'paperMm distinto de 48, 58, 80 o 90 (TK01), o un texto supera el máximo',
  })
  update(@Body() body: UpdateTicketRequestDto): Promise<TicketDTO> {
    const dto = plainToInstance(UpdateTicketRequestDto, body);
    return this.ticketService.update(dto);
  }
}
