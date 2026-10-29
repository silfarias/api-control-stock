import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { FiltroReporteDto } from './dto/filtro-reporte.dto.js';
import { ReporteInventarioResponseDto } from './dto/reporte-inventario-response.dto.js';
import { ReporteProductoTopItemDto } from './dto/reporte-producto-top-item.dto.js';
import { ReporteStockBajoItemDto } from './dto/reporte-stock-bajo-item.dto.js';
import { ReporteVentasDiarioItemDto } from './dto/reporte-ventas-diario-item.dto.js';
import { ReporteVentasResponseDto } from './dto/reporte-ventas-response.dto.js';
import { ReporteService } from './reporte.service.js';

@ApiTags('Reporte')
@Controller('reporte')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('authorization')
@ApiUnauthorizedResponse({ description: 'No autorizado' })
export class ReporteController {
  constructor(private readonly reporteService: ReporteService) {}

  @Get('ventas')
  @ApiOperation({
    summary: 'Resumen de ventas',
    description:
      'Totales de ventas confirmadas (cantidad, ingresos, unidades, ticket promedio) y desglose por método de pago. Requiere autenticación (ADMIN o EMPLEADO). `fecha` filtra un día exacto y tiene prioridad sobre `desde`/`hasta`. Fechas inclusivas sobre created_date en zona horaria de la DB (DB_TIMEZONE, típ. -03:00).',
  })
  @ApiOkResponse({ type: ReporteVentasResponseDto })
  async ventas(
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteVentasResponseDto> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.ventas(filtro);
  }

  @Get('ventas/diario')
  @ApiOperation({
    summary: 'Ventas por día',
    description:
      'Cantidad e ingresos agrupados por día. Requiere autenticación (ADMIN o EMPLEADO). Acepta `fecha` (día exacto) o el rango `desde`/`hasta`.',
  })
  @ApiOkResponse({ type: [ReporteVentasDiarioItemDto] })
  async ventasDiario(
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteVentasDiarioItemDto[]> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.ventasDiario(filtro);
  }

  @Get('productos-top')
  @ApiOperation({
    summary: 'Productos más vendidos',
    description:
      'Ranking por unidades vendidas (límite configurable). Requiere autenticación (ADMIN o EMPLEADO). Acepta `fecha` (día exacto) o el rango `desde`/`hasta`.',
  })
  @ApiOkResponse({ type: [ReporteProductoTopItemDto] })
  async productosTop(
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteProductoTopItemDto[]> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.productosTop(filtro);
  }

  @Get('stock-bajo')
  @ApiOperation({
    summary: 'Stock bajo',
    description:
      'Productos con cantidad menor o igual al mínimo configurado. Requiere autenticación (ADMIN o EMPLEADO).',
  })
  @ApiOkResponse({ type: [ReporteStockBajoItemDto] })
  async stockBajo(
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteStockBajoItemDto[]> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.stockBajo(filtro);
  }

  @Get('inventario')
  @ApiOperation({
    summary: 'Valorización de inventario',
    description:
      'Stock actual valorizado a costo y a precio de venta. Requiere autenticación (ADMIN o EMPLEADO).',
  })
  @ApiOkResponse({ type: ReporteInventarioResponseDto })
  async inventario(
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteInventarioResponseDto> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.inventario(filtro);
  }
}
