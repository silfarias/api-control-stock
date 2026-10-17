import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
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

  async search(request: SearchStockRequestDto): Promise<PageDto<Stock>> {
    const queryBuilder: SelectQueryBuilder<Stock> = this.createQueryBuilder(
      'stock',
    )
      .leftJoinAndSelect('stock.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria');

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

  async findByProductoId(productoId: number): Promise<Stock | null> {
    return this.findOne({
      where: { producto: { id: productoId } },
      relations: { producto: { categoria: true } },
    });
  }
}
