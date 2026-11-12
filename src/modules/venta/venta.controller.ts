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
import { CreateVentaRequestDto } from './dto/create-venta-request.dto.js';
import { SearchVentaRequestDto } from './dto/search-venta-request.dto.js';
import { VentaDTO } from './dto/venta.dto.js';
import { VentaService } from './venta.service.js';

@ApiTags('Venta')
@Controller('venta')
export class VentaController {
  constructor(private readonly ventaService: VentaService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Buscar ventas',
    description:
      'Ventas DE LA SUCURSAL del header `x-sucursal-id` (obligatorio). ADMIN o EMPLEADO (solo sucursales asignadas). Filtros opcionales: estado, metodoPago, fecha (YYYY-MM-DD), q y paginación. Los productos anidados omiten precioCosto para EMPLEADO.'
  })
  @PaginatedResponse(VentaDTO)
  @ApiBadRequestResponse({ description: 'Parámetros inválidos (p. ej. fecha)' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async search(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Query() request: SearchVentaRequestDto,
  ): Promise<PageDto<VentaDTO>> {
    const searchReq = plainToInstance(SearchVentaRequestDto, request);
    return this.ventaService.search(searchReq, sucursalId, req.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Registrar venta',
    description:
      'Crea la venta en la sucursal del header `x-sucursal-id` (obligatorio), calcula precios desde producto.precioVenta, descuenta el stock de esa sucursal y genera movimientos VENTA en una sola transacción. Guarda un snapshot de nombre/dirección/teléfono de la sucursal. Si metodoPago es EFECTIVO, requiere caja abierta EN ESA SUCURSAL y registra el movimiento de caja. El cliente no envía precios ni totales. La numeración del comprobante es global. ADMIN o EMPLEADO (solo sucursales asignadas).'
  })
  @ApiBody({ type: CreateVentaRequestDto })
  @ApiOkResponse({ type: VentaDTO, description: 'Venta confirmada' })
  @ApiBadRequestResponse({
    description: 'Stock insuficiente / productos inválidos',
  })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async create(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Body() body: CreateVentaRequestDto,
  ): Promise<VentaDTO> {
    return this.ventaService.create(body, req.user, sucursalId);
  }

  @Post(':id/cancelar')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Anular venta confirmada',
    description:
      'Pasa la venta a CANCELADA, devuelve el stock a la sucursal de la venta (no depende del header) y, si el pago fue en efectivo, registra un egreso. Si la caja que cobró sigue abierta, el egreso va a esa caja. Si ya cerró, va a la caja abierta de la MISMA sucursal (si no hay, error). El número de comprobante no cambia. Solo ADMIN.',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id técnico de la venta' })
  @ApiOkResponse({ type: VentaDTO, description: 'Venta anulada' })
  @ApiBadRequestResponse({
    description: 'Ya cancelada, estado inválido o sin caja abierta para el efectivo',
  })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async cancelar(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VentaDTO> {
    return this.ventaService.cancelar(id, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Obtener venta por ID',
    description:
      'ADMIN o EMPLEADO (EMPLEADO solo ve ventas de sus sucursales asignadas; no requiere header). Incluye sucursal y snapshots (sucursalNombre, sucursalDireccion, sucursalTelefono). Los productos anidados omiten precioCosto para EMPLEADO.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: VentaDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal de la venta' })
  async findOne(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VentaDTO> {
    return this.ventaService.findOne(id, req.user);
  }
}
