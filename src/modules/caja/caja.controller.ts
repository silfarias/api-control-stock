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
import { CajaService } from './caja.service.js';
import { AbrirCajaRequestDto } from './dto/abrir-caja-request.dto.js';
import { CajaDTO } from './dto/caja.dto.js';
import { CerrarCajaRequestDto } from './dto/cerrar-caja-request.dto.js';
import { CierreCajaResponseDto } from './dto/cierre-caja-response.dto.js';
import { CreateMovimientoCajaRequestDto } from './dto/create-movimiento-caja-request.dto.js';
import { MovimientoCajaDTO } from './dto/movimiento-caja.dto.js';
import { SearchCajaRequestDto } from './dto/search-caja-request.dto.js';
import { SearchMovimientoCajaRequestDto } from './dto/search-movimiento-caja-request.dto.js';

@ApiTags('Caja')
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Buscar cajas' })
  @PaginatedResponse(CajaDTO)
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async search(
    @Query() request: SearchCajaRequestDto,
  ): Promise<PageDto<CajaDTO>> {
    const req = plainToInstance(SearchCajaRequestDto, request);
    return this.cajaService.search(req);
  }

  @Get('activa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Obtener la caja abierta actual' })
  @ApiOkResponse({ type: CajaDTO })
  @ApiNotFoundResponse({ description: 'No hay caja abierta' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async getActiva(): Promise<CajaDTO> {
    return this.cajaService.getAbierta();
  }

  @Post('abrir')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Abrir caja',
    description: 'Abre una caja con monto inicial. Solo puede haber una ABIERTA.',
  })
  @ApiBody({ type: AbrirCajaRequestDto })
  @ApiOkResponse({ type: CajaDTO })
  @ApiBadRequestResponse({ description: 'Ya hay una caja abierta' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async abrir(
    @Request() req: { user: RequestUser },
    @Body() body: AbrirCajaRequestDto,
  ): Promise<CajaDTO> {
    return this.cajaService.abrir(body, req.user);
  }

  @Post(':id/cerrar')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Cerrar caja',
    description:
      'Cierra la caja con el monto contado. Calcula monto esperado (apertura + ventas + ingresos - egresos).',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: CerrarCajaRequestDto })
  @ApiOkResponse({ type: CierreCajaResponseDto })
  @ApiBadRequestResponse({ description: 'Caja ya cerrada' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async cerrar(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CerrarCajaRequestDto,
  ): Promise<CierreCajaResponseDto> {
    return this.cajaService.cerrar(id, body, req.user);
  }

  @Post('movimientos')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Registrar ingreso/egreso manual',
    description: 'Requiere caja abierta. Tipo VENTA solo se genera desde ventas en efectivo.',
  })
  @ApiBody({ type: CreateMovimientoCajaRequestDto })
  @ApiOkResponse({ type: MovimientoCajaDTO })
  @ApiBadRequestResponse({ description: 'Sin caja abierta / datos inválidos' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async crearMovimiento(
    @Request() req: { user: RequestUser },
    @Body() body: CreateMovimientoCajaRequestDto,
  ): Promise<MovimientoCajaDTO> {
    return this.cajaService.crearMovimientoManual(body, req.user);
  }

  @Get('movimientos/search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Buscar movimientos de caja' })
  @PaginatedResponse(MovimientoCajaDTO)
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async searchMovimientos(
    @Query() request: SearchMovimientoCajaRequestDto,
  ): Promise<PageDto<MovimientoCajaDTO>> {
    const req = plainToInstance(SearchMovimientoCajaRequestDto, request);
    return this.cajaService.searchMovimientos(req);
  }

  @Get(':id/movimientos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Movimientos de una caja' })
  @ApiParam({ name: 'id', example: 1 })
  @PaginatedResponse(MovimientoCajaDTO)
  @ApiNotFoundResponse({ description: 'Caja no encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async movimientosByCaja(
    @Param('id', ParseIntPipe) id: number,
    @Query() request: SearchMovimientoCajaRequestDto,
  ): Promise<PageDto<MovimientoCajaDTO>> {
    const req = plainToInstance(SearchMovimientoCajaRequestDto, request);
    return this.cajaService.searchMovimientosByCaja(id, req);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Obtener caja por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: CajaDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CajaDTO> {
    return this.cajaService.findOne(id);
  }
}
