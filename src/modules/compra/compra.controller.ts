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
import { ApiSucursalHeader } from '../../common/decorators/api-sucursal-header.decorator.js';
import { OperativeSucursalId } from '../../common/decorators/operative-sucursal-id.decorator.js';
import { PaginatedResponse } from '../../common/decorators/paginated-response.decorator.js';
import { PageDto } from '../../common/dto/page.dto.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequireSucursalGuard } from '../../common/guards/require-sucursal.guard.js';
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
  @UseGuards(JwtAuthGuard, AdminGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Buscar compras',
    description:
      'Compras DE LA SUCURSAL del header `x-sucursal-id` (obligatorio). Solo ADMIN. Incluye costos unitarios y subtotales de compra.',
  })
  @PaginatedResponse(CompraDTO)
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async search(
    @OperativeSucursalId() sucursalId: number,
    @Query() request: SearchCompraRequestDto,
  ): Promise<PageDto<CompraDTO>> {
    const req = plainToInstance(SearchCompraRequestDto, request);
    return this.compraService.search(req, sucursalId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Crear compra (borrador)',
    description:
      'Crea una compra en estado BORRADOR con ítems, asociada a la sucursal del header `x-sucursal-id` (obligatorio). No afecta stock hasta confirmar. El número de compra es global.'
  })
  @ApiBody({ type: CreateCompraRequestDto })
  @ApiOkResponse({ type: CompraDTO })
  @ApiBadRequestResponse({ description: 'Validación fallida / proveedor inactivo' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async create(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Body() body: CreateCompraRequestDto,
  ): Promise<CompraDTO> {
    return this.compraService.create(body, req.user, sucursalId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Actualizar compra borrador',
    description:
      'Solo compras en estado BORRADOR y de la sucursal del header `x-sucursal-id` (obligatorio). La sucursal de una compra no se puede cambiar.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateCompraRequestDto })
  @ApiOkResponse({ type: CompraDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiBadRequestResponse({ description: 'Estado inválido' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async update(
    @OperativeSucursalId() sucursalId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCompraRequestDto,
  ): Promise<CompraDTO> {
    return this.compraService.update(id, body, sucursalId);
  }

  @Post(':id/confirmar')
  @UseGuards(JwtAuthGuard, AdminGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Confirmar compra',
    description:
      'Confirma la compra en una transacción: genera movimientos COMPRA y aumenta el stock de la sucursal de la compra, que debe coincidir con la del header `x-sucursal-id` (obligatorio).'
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: CompraDTO, description: 'Compra confirmada' })
  @ApiBadRequestResponse({ description: 'Estado inválido / sin ítems' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async confirmar(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CompraDTO> {
    return this.compraService.confirmar(id, req.user, sucursalId);
  }

  @Post(':id/cancelar')
  @UseGuards(JwtAuthGuard, AdminGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Cancelar compra borrador',
    description:
      'Solo BORRADOR y de la sucursal del header `x-sucursal-id` (obligatorio). No revierte stock (aún no hubo movimientos).',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: CompraDTO })
  @ApiBadRequestResponse({ description: 'Estado inválido' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async cancelar(
    @OperativeSucursalId() sucursalId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CompraDTO> {
    return this.compraService.cancelar(id, sucursalId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Obtener compra por ID',
    description:
      'Solo ADMIN (puede ver compras de cualquier sucursal; no requiere header). Incluye sucursal, costos unitarios y subtotales de compra.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: CompraDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CompraDTO> {
    return this.compraService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Eliminar compra borrador',
    description:
      'Soft-delete. Solo BORRADOR y de la sucursal del header `x-sucursal-id` (obligatorio).',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Eliminada' })
  @ApiBadRequestResponse({ description: 'Estado inválido' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async remove(
    @OperativeSucursalId() sucursalId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<string> {
    return this.compraService.remove(id, sucursalId);
  }
}
