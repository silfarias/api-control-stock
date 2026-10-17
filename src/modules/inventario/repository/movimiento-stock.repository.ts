import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchMovimientoStockRequestDto } from '../dto/search-movimiento-stock-request.dto.js';
import { MovimientoStock } from '../entities/movimiento-stock.entity.js';

@Injectable()
export class MovimientoStockRepository extends Repository<MovimientoStock> {
  constructor(private readonly dataSource: DataSource) {
    super(MovimientoStock, dataSource.createEntityManager());
  }

  async search(
    request: SearchMovimientoStockRequestDto,
  ): Promise<PageDto<MovimientoStock>> {
    const queryBuilder: SelectQueryBuilder<MovimientoStock> =
      this.createQueryBuilder('movimiento')
        .leftJoinAndSelect('movimiento.producto', 'producto')
        .leftJoinAndSelect('producto.categoria', 'categoria')
        .leftJoinAndSelect('movimiento.usuario', 'usuario');

    if (request.id) {
      queryBuilder.andWhere('movimiento.id = :id', { id: request.id });
    }

    if (request.productoId) {
      queryBuilder.andWhere('producto.id = :productoId', {
        productoId: request.productoId,
      });
    }

    if (request.tipo) {
      queryBuilder.andWhere('movimiento.tipo = :tipo', { tipo: request.tipo });
    }

    if (request.usuarioId) {
      queryBuilder.andWhere('usuario.id = :usuarioId', {
        usuarioId: request.usuarioId,
      });
    }

    applyTextSearch(queryBuilder, request.q, [
      'movimiento.motivo',
      'movimiento.descripcion',
      'producto.nombre',
      'producto.codigo',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<MovimientoStock>(list, count);
  }
}
