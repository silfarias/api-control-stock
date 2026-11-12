import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchStockRequestDto } from '../dto/search-stock-request.dto.js';
import { Stock } from '../entities/stock.entity.js';

@Injectable()
export class StockRepository extends Repository<Stock> {
  constructor(private readonly dataSource: DataSource) {
    super(Stock, dataSource.createEntityManager());
  }

  /**
   * Busca stock de UNA sucursal (la operativa del request).
   */
  async search(
    request: SearchStockRequestDto,
    sucursalId: number,
  ): Promise<PageDto<Stock>> {
    const queryBuilder: SelectQueryBuilder<Stock> = this.createQueryBuilder(
      'stock',
    )
      .leftJoinAndSelect('stock.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('stock.sucursal', 'sucursal')
      .where('stock.sucursal_id = :sucursalId', { sucursalId });

    if (request.id) {
      queryBuilder.andWhere('stock.id = :id', { id: request.id });
    }

    if (request.productoId) {
      queryBuilder.andWhere('producto.id = :productoId', {
        productoId: request.productoId,
      });
    }

    applyTextSearch(queryBuilder, request.q, [
      'producto.nombre',
      'producto.codigo',
      'producto.codigoBarras',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Stock>(list, count);
  }

  async findByProductoId(
    productoId: number,
    sucursalId: number,
  ): Promise<Stock | null> {
    return this.findOne({
      where: { producto: { id: productoId }, sucursal: { id: sucursalId } },
      relations: { producto: { categoria: true }, sucursal: true },
    });
  }

  /**
   * Filas de stock de la sucursal para un conjunto de productos (una consulta).
   */
  async findByProductoIds(
    productoIds: number[],
    sucursalId: number,
  ): Promise<Stock[]> {
    if (productoIds.length === 0) return [];
    return this.find({
      where: {
        producto: { id: In(productoIds) },
        sucursal: { id: sucursalId },
      },
      relations: { producto: true },
    });
  }
}
