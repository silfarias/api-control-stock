import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from '../../common/decorators/paginated-response.decorator.js';
import { PageDto } from '../../common/dto/page.dto.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { CreateTransferenciaRequestDto } from './dto/create-transferencia-request.dto.js';
import { SearchTransferenciaRequestDto } from './dto/search-transferencia-request.dto.js';
import { TransferenciaDTO } from './dto/transferencia.dto.js';
import { UpdateTransferenciaRequestDto } from './dto/update-transferencia-request.dto.js';
import { TransferenciaService } from './transferencia.service.js';

/**
 * Transferencias entre sucursales. Solo ADMIN; NO usan el header `x-sucursal-id`
 * (origen y destino viajan en el body).
 */
@ApiTags('Transferencia')
@Controller('transferencia')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('authorization')
@ApiUnauthorizedResponse({ description: 'No autorizado' })
@ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
export class TransferenciaController {
  constructor(private readonly transferenciaService: TransferenciaService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Buscar transferencias',
    description:
      'Lista paginada de transferencias de todas las sucursales. Filtros: estado, sucursalOrigenId, sucursalDestinoId, sucursalId (origen o destino), usuarioId, id y búsqueda `q`. No requiere header `x-sucursal-id`. Solo ADMIN.',
  })
  @PaginatedResponse(TransferenciaDTO)
  async search(
    @Query() request: SearchTransferenciaRequestDto,
  ): Promise<PageDto<TransferenciaDTO>> {
    const req = plainToInstance(SearchTransferenciaRequestDto, request);
    return this.transferenciaService.search(req);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear transferencia (borrador)',
    description:
      'Crea una transferencia en estado BORRADOR entre dos sucursales activas y distintas. No afecta stock hasta confirmar. El número es global. El usuario se toma del JWT.',
  })
  @ApiBody({ type: CreateTransferenciaRequestDto })
  @ApiOkResponse({ type: TransferenciaDTO })
  @ApiBadRequestResponse({
    description:
      'Validación fallida / origen = destino / sucursal inactiva / ítems vacíos o repetidos',
  })
  @ApiNotFoundResponse({ description: 'Sucursal o producto inexistente' })
  async create(
    @Request() req: { user: RequestUser },
    @Body() body: CreateTransferenciaRequestDto,
  ): Promise<TransferenciaDTO> {
    return this.transferenciaService.create(body, req.user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar transferencia borrador',
    description:
      'Solo transferencias en estado BORRADOR. Si se envían `items` reemplazan a todos los existentes.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateTransferenciaRequestDto })
  @ApiOkResponse({ type: TransferenciaDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiBadRequestResponse({ description: 'Estado inválido / validación fallida' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransferenciaRequestDto,
  ): Promise<TransferenciaDTO> {
    return this.transferenciaService.update(id, body);
  }

  @Post(':id/confirmar')
  @ApiOperation({
    summary: 'Confirmar transferencia',
    description:
      'En una transacción (con lock sobre la transferencia): por cada ítem genera TRANSFERENCIA_SALIDA en el origen y TRANSFERENCIA_ENTRADA en el destino. Si el stock del origen no alcanza se aborta todo. Confirmar una transferencia ya confirmada devuelve 400 (TR01).',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: TransferenciaDTO, description: 'Transferencia confirmada' })
  @ApiBadRequestResponse({
    description: 'Ya confirmada / estado inválido / sin ítems / stock insuficiente',
  })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  async confirmar(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TransferenciaDTO> {
    return this.transferenciaService.confirmar(id, req.user);
  }

  @Post(':id/cancelar')
  @ApiOperation({
    summary: 'Cancelar transferencia borrador',
    description:
      'Solo BORRADOR → CANCELADA. No revierte stock (aún no hubo movimientos).',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: TransferenciaDTO })
  @ApiBadRequestResponse({ description: 'Estado inválido' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  async cancelar(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TransferenciaDTO> {
    return this.transferenciaService.cancelar(id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener transferencia por ID',
    description:
      'Incluye sucursal origen/destino, usuario e ítems. No requiere header `x-sucursal-id`. Solo ADMIN.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: TransferenciaDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TransferenciaDTO> {
    return this.transferenciaService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar transferencia borrador',
    description:
      'Soft-delete. Solo BORRADOR; las confirmadas no se pueden eliminar.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Eliminada' })
  @ApiBadRequestResponse({ description: 'Estado inválido' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.transferenciaService.remove(id);
  }
}
