import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { EstadoVenta } from '../../common/enums/estado-venta.enum.js';
import { ItemVenta } from '../venta/entities/item-venta.entity.js';
import { Venta } from '../venta/entities/venta.entity.js';
import { Stock } from '../inventario/entities/stock.entity.js';
import { FiltroReporteDto } from './dto/filtro-reporte.dto.js';
import { ReporteInventarioResponseDto } from './dto/reporte-inventario-response.dto.js';
import { ReporteProductoTopItemDto } from './dto/reporte-producto-top-item.dto.js';
import { ReporteStockBajoItemDto } from './dto/reporte-stock-bajo-item.dto.js';
import { ReporteVentasDiarioItemDto } from './dto/reporte-ventas-diario-item.dto.js';
import { ReporteVentasResponseDto } from './dto/reporte-ventas-response.dto.js';

@Injectable()
export class ReporteService {
  constructor(private readonly dataSource: DataSource) {}

  async ventas(filtro: FiltroReporteDto): Promise<ReporteVentasResponseDto> {
    const ventasRows = await this.ventasBaseQb(filtro)
      .select('venta.id', 'id')
      .addSelect('venta.total', 'total')
      .groupBy('venta.id')
      .addGroupBy('venta.total')
      .getRawMany<{ id: string; total: string }>();

    const unidadesRaw = await this.itemsBaseQb(filtro)
      .select('COALESCE(SUM(item.cantidad), 0)', 'unidadesVendidas')
      .getRawOne<{ unidadesVendidas: string }>();

    const cantidadVentas = ventasRows.length;
    const totalIngresos = Number(
      ventasRows
        .reduce((acc, row) => acc + Number(row.total || 0), 0)
        .toFixed(2),
    );
    const unidadesVendidas = Number(unidadesRaw?.unidadesVendidas || 0);
    const ticketPromedio =
      cantidadVentas > 0
        ? Number((totalIngresos / cantidadVentas).toFixed(2))
        : 0;

    return {
      cantidadVentas,
      totalIngresos,
      unidadesVendidas,
      ticketPromedio,
    };
  }

  async ventasDiario(
    filtro: FiltroReporteDto,
  ): Promise<ReporteVentasDiarioItemDto[]> {
    const rows = await this.ventasBaseQb(filtro)
      .select('venta.id', 'id')
      .addSelect('venta.total', 'total')
      .addSelect('DATE(venta.created_date)', 'fecha')
      .groupBy('venta.id')
      .addGroupBy('venta.total')
      .addGroupBy('DATE(venta.created_date)')
      .orderBy('fecha', 'ASC')
      .getRawMany<{ id: string; total: string; fecha: string | Date }>();

    const porDia = new Map<
      string,
      { cantidadVentas: number; totalIngresos: number }
    >();

    for (const row of rows) {
      const fecha = this.normalizarFecha(row.fecha);
      const actual = porDia.get(fecha) ?? {
        cantidadVentas: 0,
        totalIngresos: 0,
      };
      actual.cantidadVentas += 1;
      actual.totalIngresos += Number(row.total || 0);
      porDia.set(fecha, actual);
    }

    return Array.from(porDia.entries()).map(([fecha, data]) => ({
      fecha,
      cantidadVentas: data.cantidadVentas,
      totalIngresos: Number(data.totalIngresos.toFixed(2)),
    }));
  }

  async productosTop(
    filtro: FiltroReporteDto,
  ): Promise<ReporteProductoTopItemDto[]> {
    const limite = filtro.limite ?? 10;

    const rows = await this.itemsBaseQb(filtro)
      .select('producto.id', 'productoId')
      .addSelect('producto.nombre', 'nombre')
      .addSelect('producto.codigo', 'codigo')
      .addSelect('COALESCE(SUM(item.cantidad), 0)', 'cantidadVendida')
      .addSelect('COALESCE(SUM(item.subtotal), 0)', 'totalVendido')
      .groupBy('producto.id')
      .addGroupBy('producto.nombre')
      .addGroupBy('producto.codigo')
      .orderBy('cantidadVendida', 'DESC')
      .limit(limite)
      .getRawMany<{
        productoId: string;
        nombre: string;
        codigo: string;
        cantidadVendida: string;
        totalVendido: string;
      }>();

    return rows.map((row) => ({
      productoId: Number(row.productoId),
      nombre: row.nombre,
      codigo: row.codigo,
      cantidadVendida: Number(row.cantidadVendida),
      totalVendido: Number(Number(row.totalVendido).toFixed(2)),
    }));
  }

  async stockBajo(filtro: FiltroReporteDto): Promise<ReporteStockBajoItemDto[]> {
    const qb = this.dataSource
      .getRepository(Stock)
      .createQueryBuilder('stock')
      .innerJoin('stock.producto', 'producto')
      .leftJoin('producto.categoria', 'categoria')
      .where('stock.cantidad <= producto.minimo_stock');

    if (filtro.categoriaId) {
      qb.andWhere('categoria.id = :categoriaId', {
        categoriaId: filtro.categoriaId,
      });
    }
    if (filtro.productoId) {
      qb.andWhere('producto.id = :productoId', {
        productoId: filtro.productoId,
      });
    }

    const rows = await qb
      .select('producto.id', 'productoId')
      .addSelect('producto.nombre', 'nombre')
      .addSelect('producto.codigo', 'codigo')
      .addSelect('stock.cantidad', 'cantidad')
      .addSelect('producto.minimo_stock', 'minimoStock')
      .addSelect('categoria.id', 'categoriaId')
      .addSelect('categoria.nombre', 'categoriaNombre')
      .orderBy('stock.cantidad', 'ASC')
      .getRawMany<{
        productoId: string;
        nombre: string;
        codigo: string;
        cantidad: string;
        minimoStock: string;
        categoriaId: string;
        categoriaNombre: string;
      }>();

    return rows.map((row) => ({
      productoId: Number(row.productoId),
      nombre: row.nombre,
      codigo: row.codigo,
      cantidad: Number(row.cantidad),
      minimoStock: Number(row.minimoStock),
      categoriaId: Number(row.categoriaId),
      categoriaNombre: row.categoriaNombre,
    }));
  }

  async inventario(
    filtro: FiltroReporteDto,
  ): Promise<ReporteInventarioResponseDto> {
    const qb = this.dataSource
      .getRepository(Stock)
      .createQueryBuilder('stock')
      .innerJoin('stock.producto', 'producto')
      .leftJoin('producto.categoria', 'categoria');

    if (filtro.categoriaId) {
      qb.andWhere('categoria.id = :categoriaId', {
        categoriaId: filtro.categoriaId,
      });
    }
    if (filtro.productoId) {
      qb.andWhere('producto.id = :productoId', {
        productoId: filtro.productoId,
      });
    }

    const rows = await qb
      .select('producto.id', 'productoId')
      .addSelect('producto.nombre', 'nombre')
      .addSelect('producto.codigo', 'codigo')
      .addSelect('stock.cantidad', 'cantidad')
      .addSelect('producto.precio_costo', 'precioCosto')
      .addSelect('producto.precio_venta', 'precioVenta')
      .orderBy('producto.nombre', 'ASC')
      .getRawMany<{
        productoId: string;
        nombre: string;
        codigo: string;
        cantidad: string;
        precioCosto: string;
        precioVenta: string;
      }>();

    const items = rows.map((row) => {
      const cantidad = Number(row.cantidad);
      const precioCosto = Number(row.precioCosto);
      const precioVenta = Number(row.precioVenta);
      return {
        productoId: Number(row.productoId),
        nombre: row.nombre,
        codigo: row.codigo,
        cantidad,
        precioCosto,
        precioVenta,
        valorCosto: Number((cantidad * precioCosto).toFixed(2)),
        valorVenta: Number((cantidad * precioVenta).toFixed(2)),
      };
    });

    return {
      cantidadProductos: items.length,
      unidadesTotales: items.reduce((acc, i) => acc + i.cantidad, 0),
      valorTotalCosto: Number(
        items.reduce((acc, i) => acc + i.valorCosto, 0).toFixed(2),
      ),
      valorTotalVenta: Number(
        items.reduce((acc, i) => acc + i.valorVenta, 0).toFixed(2),
      ),
      items,
    };
  }

  private ventasBaseQb(
    filtro: FiltroReporteDto,
  ): SelectQueryBuilder<Venta> {
    const qb = this.dataSource
      .getRepository(Venta)
      .createQueryBuilder('venta')
      .leftJoin('venta.items', 'item')
      .leftJoin('item.producto', 'producto')
      .leftJoin('producto.categoria', 'categoria')
      .where('venta.estado = :estado', { estado: EstadoVenta.CONFIRMADA });

    this.aplicarFiltrosVenta(qb, filtro);
    return qb;
  }

  private itemsBaseQb(
    filtro: FiltroReporteDto,
  ): SelectQueryBuilder<ItemVenta> {
    const qb = this.dataSource
      .getRepository(ItemVenta)
      .createQueryBuilder('item')
      .innerJoin('item.venta', 'venta')
      .innerJoin('item.producto', 'producto')
      .leftJoin('producto.categoria', 'categoria')
      .where('venta.estado = :estado', { estado: EstadoVenta.CONFIRMADA });

    this.aplicarFiltrosVenta(qb, filtro);
    return qb;
  }

  private aplicarFiltrosVenta(
    qb: SelectQueryBuilder<Venta> | SelectQueryBuilder<ItemVenta>,
    filtro: FiltroReporteDto,
  ): void {
    if (filtro.desde) {
      qb.andWhere('venta.created_date >= :desde', {
        desde: `${filtro.desde} 00:00:00`,
      });
    }
    if (filtro.hasta) {
      qb.andWhere('venta.created_date <= :hasta', {
        hasta: `${filtro.hasta} 23:59:59`,
      });
    }
    if (filtro.usuarioId) {
      qb.andWhere('venta.usuario_id = :usuarioId', {
        usuarioId: filtro.usuarioId,
      });
    }
    if (filtro.productoId) {
      qb.andWhere('producto.id = :productoId', {
        productoId: filtro.productoId,
      });
    }
    if (filtro.categoriaId) {
      qb.andWhere('categoria.id = :categoriaId', {
        categoriaId: filtro.categoriaId,
      });
    }
  }

  private normalizarFecha(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
  }
}
