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
import { PaginatedResponse } from '../../common/decorators/paginated-response.decorator.js';
import { PageDto } from '../../common/dto/page.dto.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { AjusteStockResponseDto } from './dto/ajuste-stock-response.dto.js';
import { CreateAjusteStockRequestDto } from './dto/create-ajuste-stock-request.dto.js';
import { MovimientoStockDTO } from './dto/movimiento-stock.dto.js';
import { SearchMovimientoStockRequestDto } from './dto/search-movimiento-stock-request.dto.js';
import { SearchStockRequestDto } from './dto/search-stock-request.dto.js';
import { StockDTO } from './dto/stock.dto.js';
import { InventarioService } from './inventario.service.js';

@ApiTags('Inventario')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Buscar stocks',
    description: 'Lista paginada de stock por producto.',
  })
  @PaginatedResponse(StockDTO)
  @ApiBadRequestResponse({ description: 'Parámetros inválidos' })
  async search(
    @Query() request: SearchStockRequestDto,
  ): Promise<PageDto<StockDTO>> {
    const req = plainToInstance(SearchStockRequestDto, request);
    return this.inventarioService.search(req);
  }

  @Get('movimientos/search')
  @ApiOperation({
    summary: 'Buscar movimientos de stock',
    description:
      'Lista paginada de movimientos (historial inmutable). Filtros: productoId, tipo, usuarioId, q.',
  })
  @PaginatedResponse(MovimientoStockDTO)
  @ApiBadRequestResponse({ description: 'Parámetros inválidos' })
  async searchMovimientos(
    @Query() request: SearchMovimientoStockRequestDto,
  ): Promise<PageDto<MovimientoStockDTO>> {
    const req = plainToInstance(SearchMovimientoStockRequestDto, request);
    return this.inventarioService.searchMovimientos(req);
  }

  @Get('producto/:productoId')
  @ApiOperation({
    summary: 'Obtener stock por producto',
    description: 'Devuelve el stock actual de un producto.',
  })
  @ApiParam({ name: 'productoId', description: 'ID del producto', example: 1 })
  @ApiOkResponse({ type: StockDTO, description: 'Stock encontrado' })
  @ApiNotFoundResponse({ description: 'Producto o stock no encontrado' })
  async findByProducto(
    @Param('productoId', ParseIntPipe) productoId: number,
  ): Promise<StockDTO> {
    return this.inventarioService.findByProductoId(productoId);
  }

  @Get('producto/:productoId/movimientos')
  @ApiOperation({
    summary: 'Movimientos de un producto',
    description: 'Historial de movimientos de stock de un producto.',
  })
  @ApiParam({ name: 'productoId', description: 'ID del producto', example: 1 })
  @PaginatedResponse(MovimientoStockDTO)
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  @ApiBadRequestResponse({ description: 'Parámetros inválidos' })
  async movimientosByProducto(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Query() request: SearchMovimientoStockRequestDto,
  ): Promise<PageDto<MovimientoStockDTO>> {
    const req = plainToInstance(SearchMovimientoStockRequestDto, request);
    return this.inventarioService.searchMovimientosByProducto(productoId, req);
  }

  @Post('ajustes')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Registrar ajuste de stock',
    description:
      'Ajuste manual de entrada o salida. Requiere motivo. Genera un movimiento inmutable y actualiza el stock en una transacción (solo ADMIN).',
  })
  @ApiBody({ type: CreateAjusteStockRequestDto })
  @ApiOkResponse({
    type: AjusteStockResponseDto,
    description: 'Ajuste aplicado correctamente',
  })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o stock insuficiente',
  })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async crearAjuste(
    @Request() req: { user: RequestUser },
    @Body() body: CreateAjusteStockRequestDto,
  ): Promise<AjusteStockResponseDto> {
    return this.inventarioService.crearAjuste(body, req.user);
  }
}
