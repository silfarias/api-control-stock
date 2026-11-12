import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { OperativeSucursalId } from '../../common/decorators/operative-sucursal-id.decorator.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { OptionalSucursalGuard } from '../../common/guards/optional-sucursal.guard.js';
import { FiltroReporteDto } from './dto/filtro-reporte.dto.js';
import { ReporteInventarioResponseDto } from './dto/reporte-inventario-response.dto.js';
import { ReporteProductoTopItemDto } from './dto/reporte-producto-top-item.dto.js';
import { ReporteStockBajoItemDto } from './dto/reporte-stock-bajo-item.dto.js';
import { ReporteVentasDiarioItemDto } from './dto/reporte-ventas-diario-item.dto.js';
import { ReporteVentasResponseDto } from './dto/reporte-ventas-response.dto.js';
import { ReporteService } from './reporte.service.js';

/**
 * Reportes (solo ADMIN). El header `x-sucursal-id` es OPCIONAL:
 * - con header: el reporte se calcula solo para esa sucursal;
 * - sin header: reporte CONSOLIDADO de todas las sucursales.
 */
@ApiTags('Reporte')
@Controller('reporte')
@UseGuards(JwtAuthGuard, AdminGuard, OptionalSucursalGuard)
@ApiBearerAuth('authorization')
@ApiHeader({
  name: 'x-sucursal-id',
  required: false,
  description:
    'ID de la sucursal (opcional). Con header: reporte de esa sucursal. SIN header: reporte consolidado de TODAS las sucursales.',
  example: '1',
})
@ApiUnauthorizedResponse({ description: 'No autorizado' })
@ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
export class ReporteController {
  constructor(private readonly reporteService: ReporteService) {}

  @Get('ventas')
  @ApiOperation({
    summary: 'Resumen de ventas',
    description:
      'Totales de ventas confirmadas (cantidad, ingresos, unidades, ticket promedio) y desglose por método de pago. Con header `x-sucursal-id` se limita a esa sucursal; sin header = consolidado de todas las sucursales. Solo ADMIN. `fecha` filtra un día exacto y tiene prioridad sobre `desde`/`hasta`. Fechas inclusivas sobre created_date en zona horaria de la DB (DB_TIMEZONE, típ. -03:00).',
  })
  @ApiOkResponse({ type: ReporteVentasResponseDto })
  async ventas(
    @OperativeSucursalId() sucursalId: number | undefined,
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteVentasResponseDto> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.ventas(filtro, sucursalId);
  }

  @Get('ventas/diario')
  @ApiOperation({
    summary: 'Ventas por día',
    description:
      'Cantidad e ingresos agrupados por día. Con header `x-sucursal-id` solo esa sucursal; sin header = consolidado. Solo ADMIN. Acepta `fecha` (día exacto) o el rango `desde`/`hasta`.',
  })
  @ApiOkResponse({ type: [ReporteVentasDiarioItemDto] })
  async ventasDiario(
    @OperativeSucursalId() sucursalId: number | undefined,
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteVentasDiarioItemDto[]> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.ventasDiario(filtro, sucursalId);
  }

  @Get('productos-top')
  @ApiOperation({
    summary: 'Productos más vendidos',
    description:
      'Ranking por unidades vendidas (límite configurable). Con header `x-sucursal-id` solo esa sucursal; sin header = consolidado. Solo ADMIN. Acepta `fecha` (día exacto) o el rango `desde`/`hasta`.',
  })
  @ApiOkResponse({ type: [ReporteProductoTopItemDto] })
  async productosTop(
    @OperativeSucursalId() sucursalId: number | undefined,
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteProductoTopItemDto[]> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.productosTop(filtro, sucursalId);
  }

  @Get('stock-bajo')
  @ApiOperation({
    summary: 'Stock bajo',
    description:
      'Productos con cantidad menor o igual al mínimo configurado. Con header `x-sucursal-id` se evalúa el stock de esa sucursal; sin header = consolidado (se suma el stock del producto en todas las sucursales y se compara contra su mínimo). Solo ADMIN.',
  })
  @ApiOkResponse({ type: [ReporteStockBajoItemDto] })
  async stockBajo(
    @OperativeSucursalId() sucursalId: number | undefined,
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteStockBajoItemDto[]> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.stockBajo(filtro, sucursalId);
  }

  @Get('inventario')
  @ApiOperation({
    summary: 'Valorización de inventario',
    description:
      'Stock actual valorizado a costo y a precio de venta. Con header `x-sucursal-id` es el stock de esa sucursal; sin header = consolidado (stock sumado de todas las sucursales por producto). Solo ADMIN.',
  })
  @ApiOkResponse({ type: ReporteInventarioResponseDto })
  async inventario(
    @OperativeSucursalId() sucursalId: number | undefined,
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteInventarioResponseDto> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.inventario(filtro, sucursalId);
  }
}
