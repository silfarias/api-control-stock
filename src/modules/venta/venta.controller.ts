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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Buscar ventas' })
  @PaginatedResponse(VentaDTO)
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async search(
    @Query() request: SearchVentaRequestDto,
  ): Promise<PageDto<VentaDTO>> {
    const req = plainToInstance(SearchVentaRequestDto, request);
    return this.ventaService.search(req);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Registrar venta',
    description:
      'Crea la venta, calcula precios desde producto.precioVenta, descuenta stock y genera movimientos VENTA en una sola transacción. Si metodoPago es EFECTIVO, requiere caja abierta y registra movimiento de caja. El cliente no envía precios ni totales.',
  })
  @ApiBody({ type: CreateVentaRequestDto })
  @ApiOkResponse({ type: VentaDTO, description: 'Venta confirmada' })
  @ApiBadRequestResponse({
    description: 'Stock insuficiente / productos inválidos',
  })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async create(
    @Request() req: { user: RequestUser },
    @Body() body: CreateVentaRequestDto,
  ): Promise<VentaDTO> {
    return this.ventaService.create(body, req.user);
  }

  @Post(':id/cancelar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Anular venta confirmada',
    description:
      'Pasa la venta a CANCELADA, devuelve el stock y, si el pago fue en efectivo, registra un egreso. Si la caja que cobró sigue abierta, el egreso va a esa caja. Si ya cerró, va a la caja abierta actual. El número de comprobante no cambia. Requiere autenticación (ADMIN o EMPLEADO).',
  })
  @ApiParam({ name: 'id', example: 1, description: 'Id técnico de la venta' })
  @ApiOkResponse({ type: VentaDTO, description: 'Venta anulada' })
  @ApiBadRequestResponse({
    description: 'Ya cancelada, estado inválido o sin caja abierta para el efectivo',
  })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async cancelar(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VentaDTO> {
    return this.ventaService.cancelar(id, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Obtener venta por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: VentaDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<VentaDTO> {
    return this.ventaService.findOne(id);
  }
}
