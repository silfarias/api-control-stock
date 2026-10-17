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
import { CompraService } from './compra.service.js';
import { CompraDTO } from './dto/compra.dto.js';
import { CreateCompraRequestDto } from './dto/create-compra-request.dto.js';
import { SearchCompraRequestDto } from './dto/search-compra-request.dto.js';
import { UpdateCompraRequestDto } from './dto/update-compra-request.dto.js';

@ApiTags('Compra')
@Controller('compra')
export class CompraController {
  constructor(private readonly compraService: CompraService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Buscar compras' })
  @PaginatedResponse(CompraDTO)
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async search(
    @Query() request: SearchCompraRequestDto,
  ): Promise<PageDto<CompraDTO>> {
    const req = plainToInstance(SearchCompraRequestDto, request);
    return this.compraService.search(req);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Crear compra (borrador)',
    description:
      'Crea una compra en estado BORRADOR con ítems. No afecta stock hasta confirmar.',
  })
  @ApiBody({ type: CreateCompraRequestDto })
  @ApiOkResponse({ type: CompraDTO })
  @ApiBadRequestResponse({ description: 'Validación fallida / proveedor inactivo' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async create(
    @Request() req: { user: RequestUser },
    @Body() body: CreateCompraRequestDto,
  ): Promise<CompraDTO> {
    return this.compraService.create(body, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Actualizar compra borrador',
    description: 'Solo compras en estado BORRADOR.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateCompraRequestDto })
  @ApiOkResponse({ type: CompraDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiBadRequestResponse({ description: 'Estado inválido' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCompraRequestDto,
  ): Promise<CompraDTO> {
    return this.compraService.update(id, body);
  }

  @Post(':id/confirmar')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Confirmar compra',
    description:
      'Confirma la compra en una transacción: genera movimientos COMPRA y aumenta stock por cada ítem.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: CompraDTO, description: 'Compra confirmada' })
  @ApiBadRequestResponse({ description: 'Estado inválido / sin ítems' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async confirmar(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CompraDTO> {
    return this.compraService.confirmar(id, req.user);
  }

  @Post(':id/cancelar')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Cancelar compra borrador',
    description: 'Solo BORRADOR. No revierte stock (aún no hubo movimientos).',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: CompraDTO })
  @ApiBadRequestResponse({ description: 'Estado inválido' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async cancelar(@Param('id', ParseIntPipe) id: number): Promise<CompraDTO> {
    return this.compraService.cancelar(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Obtener compra por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: CompraDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CompraDTO> {
    return this.compraService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Eliminar compra borrador',
    description: 'Soft-delete. Solo BORRADOR.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Eliminada' })
  @ApiBadRequestResponse({ description: 'Estado inválido' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.compraService.remove(id);
  }
}
