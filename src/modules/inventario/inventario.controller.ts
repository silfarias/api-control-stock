import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { AjusteStockResponseDto } from './dto/ajuste-stock-response.dto.js';
import { CreateAjusteStockRequestDto } from './dto/create-ajuste-stock-request.dto.js';
import { MovimientoStockDTO } from './dto/movimiento-stock.dto.js';
import { SearchMovimientoStockRequestDto } from './dto/search-movimiento-stock-request.dto.js';
import { SearchStockRequestDto } from './dto/search-stock-request.dto.js';
import { StockDTO } from './dto/stock.dto.js';
import { InventarioService } from './inventario.service.js';

/**
 * Todo el inventario opera sobre UNA sucursal: la del header `x-sucursal-id`
 * (resuelta y autorizada por RequireSucursalGuard).
 */
@ApiTags('Inventario')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Buscar stocks',
    description:
      'Lista paginada de stock por producto DE LA SUCURSAL del header `x-sucursal-id` (obligatorio). ADMIN o EMPLEADO (solo sucursales asignadas). El producto anidado omite precioCosto para EMPLEADO.',
  })
  @PaginatedResponse(StockDTO)
  @ApiBadRequestResponse({ description: 'Parámetros inválidos / header de sucursal inválido' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async search(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Query() request: SearchStockRequestDto,
  ): Promise<PageDto<StockDTO>> {
    const searchReq = plainToInstance(SearchStockRequestDto, request);
    return this.inventarioService.search(searchReq, sucursalId, req.user);
  }

  @Get('movimientos/search')
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Buscar movimientos de stock',
    description:
      'Lista paginada de movimientos (historial inmutable) DE LA SUCURSAL del header `x-sucursal-id` (obligatorio). Filtros: productoId, tipo, usuarioId, q. ADMIN o EMPLEADO (solo sucursales asignadas). El producto anidado omite precioCosto para EMPLEADO.',
  })
  @PaginatedResponse(MovimientoStockDTO)
  @ApiBadRequestResponse({ description: 'Parámetros inválidos / header de sucursal inválido' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async searchMovimientos(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Query() request: SearchMovimientoStockRequestDto,
  ): Promise<PageDto<MovimientoStockDTO>> {
    const searchReq = plainToInstance(SearchMovimientoStockRequestDto, request);
    return this.inventarioService.searchMovimientos(
      searchReq,
      sucursalId,
      req.user,
    );
  }

  @Get('producto/:productoId')
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Obtener stock por producto',
    description:
      'Devuelve el stock actual de un producto en la sucursal del header `x-sucursal-id` (obligatorio). ADMIN o EMPLEADO (solo sucursales asignadas). El producto anidado omite precioCosto para EMPLEADO.',
  })
  @ApiParam({ name: 'productoId', description: 'ID del producto', example: 1 })
  @ApiOkResponse({ type: StockDTO, description: 'Stock encontrado' })
  @ApiNotFoundResponse({ description: 'Producto o stock no encontrado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async findByProducto(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Param('productoId', ParseIntPipe) productoId: number,
  ): Promise<StockDTO> {
    return this.inventarioService.findByProductoId(
      productoId,
      sucursalId,
      req.user,
    );
  }

  @Get('producto/:productoId/movimientos')
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Movimientos de un producto',
    description:
      'Historial de movimientos de stock de un producto en la sucursal del header `x-sucursal-id` (obligatorio). ADMIN o EMPLEADO (solo sucursales asignadas). El producto anidado omite precioCosto para EMPLEADO.',
  })
  @ApiParam({ name: 'productoId', description: 'ID del producto', example: 1 })
  @PaginatedResponse(MovimientoStockDTO)
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  @ApiBadRequestResponse({ description: 'Parámetros inválidos / header de sucursal inválido' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async movimientosByProducto(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Param('productoId', ParseIntPipe) productoId: number,
    @Query() request: SearchMovimientoStockRequestDto,
  ): Promise<PageDto<MovimientoStockDTO>> {
    const searchReq = plainToInstance(SearchMovimientoStockRequestDto, request);
    return this.inventarioService.searchMovimientosByProducto(
      productoId,
      searchReq,
      sucursalId,
      req.user,
    );
  }

  @Post('ajustes')
  @UseGuards(JwtAuthGuard, AdminGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Registrar ajuste de stock',
    description:
      'Ajuste manual de entrada o salida sobre el stock de la sucursal del header `x-sucursal-id` (obligatorio). Requiere motivo. Genera un movimiento inmutable y actualiza el stock en una transacción (solo ADMIN).',
  })
  @ApiBody({ type: CreateAjusteStockRequestDto })
  @ApiOkResponse({
    type: AjusteStockResponseDto,
    description: 'Ajuste aplicado correctamente',
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos, stock insuficiente o header de sucursal inválido',
  })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async crearAjuste(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Body() body: CreateAjusteStockRequestDto,
  ): Promise<AjusteStockResponseDto> {
    return this.inventarioService.crearAjuste(body, req.user, sucursalId);
  }
}
