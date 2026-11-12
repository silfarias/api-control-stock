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
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Buscar cajas',
    description:
      'Historial de cajas (lectura) DE LA SUCURSAL del header `x-sucursal-id` (obligatorio). ADMIN o EMPLEADO (solo sucursales asignadas). Incluye sucursal, responsable de apertura y, si existe, de cierre.',
  })
  @PaginatedResponse(CajaDTO)
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async search(
    @OperativeSucursalId() sucursalId: number,
    @Query() request: SearchCajaRequestDto,
  ): Promise<PageDto<CajaDTO>> {
    const req = plainToInstance(SearchCajaRequestDto, request);
    return this.cajaService.search(req, sucursalId);
  }

  @Get('activa')
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Obtener la caja abierta de la sucursal',
    description:
      'Caja abierta de la sucursal del header `x-sucursal-id` (obligatorio). ADMIN o EMPLEADO (solo sucursales asignadas). Necesaria para verificar disponibilidad al cobrar en efectivo.',
  })
  @ApiOkResponse({ type: CajaDTO })
  @ApiNotFoundResponse({ description: 'No hay caja abierta en la sucursal' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async getActiva(@OperativeSucursalId() sucursalId: number): Promise<CajaDTO> {
    return this.cajaService.getAbierta(sucursalId);
  }

  @Post('abrir')
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Abrir caja',
    description:
      'Abre una caja con monto inicial en la sucursal del header `x-sucursal-id` (obligatorio). Solo puede haber una ABIERTA por sucursal. El responsable de apertura se toma del JWT. El número de caja es global. ADMIN o EMPLEADO (solo sucursales asignadas).'
  })
  @ApiBody({ type: AbrirCajaRequestDto })
  @ApiOkResponse({ type: CajaDTO })
  @ApiBadRequestResponse({
    description: 'Ya hay una caja abierta en la sucursal / header inválido',
  })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async abrir(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Body() body: AbrirCajaRequestDto,
  ): Promise<CajaDTO> {
    return this.cajaService.abrir(body, req.user, sucursalId);
  }

  @Post(':id/cerrar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Cerrar caja',
    description:
      'Cierra la caja con el monto contado. Calcula monto esperado (apertura + ventas + ingresos - egresos). ADMIN puede cerrar cualquier caja abierta; EMPLEADO solo la que él abrió y de una sucursal asignada. No requiere header: la sucursal sale de la caja. El responsable de cierre se toma del JWT.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: CerrarCajaRequestDto })
  @ApiOkResponse({ type: CierreCajaResponseDto })
  @ApiBadRequestResponse({ description: 'Caja ya cerrada' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({
    description: 'EMPLEADO intentó cerrar una caja que no abrió',
  })
  async cerrar(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CerrarCajaRequestDto,
  ): Promise<CierreCajaResponseDto> {
    return this.cajaService.cerrar(id, body, req.user);
  }

  @Post('movimientos')
  @UseGuards(JwtAuthGuard, AdminGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Registrar ingreso/egreso manual',
    description:
      'Requiere caja abierta en la sucursal del header `x-sucursal-id` (obligatorio). Tipo VENTA solo se genera desde ventas en efectivo. Solo ADMIN.'
  })
  @ApiBody({ type: CreateMovimientoCajaRequestDto })
  @ApiOkResponse({ type: MovimientoCajaDTO })
  @ApiBadRequestResponse({ description: 'Sin caja abierta / datos inválidos' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async crearMovimiento(
    @Request() req: { user: RequestUser },
    @OperativeSucursalId() sucursalId: number,
    @Body() body: CreateMovimientoCajaRequestDto,
  ): Promise<MovimientoCajaDTO> {
    return this.cajaService.crearMovimientoManual(body, req.user, sucursalId);
  }

  @Get('movimientos/search')
  @UseGuards(JwtAuthGuard, RequireSucursalGuard)
  @ApiBearerAuth('authorization')
  @ApiSucursalHeader()
  @ApiOperation({
    summary: 'Buscar movimientos de caja',
    description:
      'Historial de movimientos (lectura) de las cajas DE LA SUCURSAL del header `x-sucursal-id` (obligatorio). ADMIN o EMPLEADO (solo sucursales asignadas).',
  })
  @PaginatedResponse(MovimientoCajaDTO)
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async searchMovimientos(
    @OperativeSucursalId() sucursalId: number,
    @Query() request: SearchMovimientoCajaRequestDto,
  ): Promise<PageDto<MovimientoCajaDTO>> {
    const req = plainToInstance(SearchMovimientoCajaRequestDto, request);
    return this.cajaService.searchMovimientos(req, sucursalId);
  }

  @Get(':id/movimientos')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Movimientos de una caja',
    description:
      'Lectura. ADMIN o EMPLEADO (EMPLEADO solo si tiene asignada la sucursal de la caja; no requiere header).',
  })
  @ApiParam({ name: 'id', example: 1 })
  @PaginatedResponse(MovimientoCajaDTO)
  @ApiNotFoundResponse({ description: 'Caja no encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal de la caja' })
  async movimientosByCaja(
    @Request() reqUser: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @Query() request: SearchMovimientoCajaRequestDto,
  ): Promise<PageDto<MovimientoCajaDTO>> {
    const req = plainToInstance(SearchMovimientoCajaRequestDto, request);
    return this.cajaService.searchMovimientosByCaja(id, req, reqUser.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Obtener caja por ID',
    description:
      'Detalle de una caja (incl. cerradas). Lectura. ADMIN o EMPLEADO (EMPLEADO solo si tiene asignada la sucursal de la caja; no requiere header).',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: CajaDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal de la caja' })
  async findOne(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CajaDTO> {
    return this.cajaService.findOne(id, req.user);
  }
}
