import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { AdminGuard } from '../../common/guards/admin.guard.js';
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
  @UseGuards(AdminGuard)
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  @ApiOperation({
    summary: 'Resumen de ventas',
    description:
      'Totales de ventas confirmadas: cantidad, ingresos, unidades y ticket promedio. Solo ADMIN.',
  })
  @ApiOkResponse({ type: ReporteVentasResponseDto })
  async ventas(
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteVentasResponseDto> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.ventas(filtro);
  }

  @Get('ventas/diario')
  @UseGuards(AdminGuard)
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  @ApiOperation({
    summary: 'Ventas por día',
    description:
      'Cantidad e ingresos agrupados por día en el rango filtrado. Solo ADMIN.',
  })
  @ApiOkResponse({ type: [ReporteVentasDiarioItemDto] })
  async ventasDiario(
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteVentasDiarioItemDto[]> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.ventasDiario(filtro);
  }

  @Get('productos-top')
  @UseGuards(AdminGuard)
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  @ApiOperation({
    summary: 'Productos más vendidos',
    description:
      'Ranking por unidades vendidas (límite configurable). Solo ADMIN.',
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
  @UseGuards(AdminGuard)
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  @ApiOperation({
    summary: 'Valorización de inventario',
    description:
      'Stock actual valorizado a costo y a precio de venta. Solo ADMIN.',
  })
  @ApiOkResponse({ type: ReporteInventarioResponseDto })
  async inventario(
    @Query() query: FiltroReporteDto,
  ): Promise<ReporteInventarioResponseDto> {
    const filtro = plainToInstance(FiltroReporteDto, query);
    return this.reporteService.inventario(filtro);
  }
}
