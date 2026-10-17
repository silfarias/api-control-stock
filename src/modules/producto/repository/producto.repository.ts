import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchProductoRequestDto } from '../dto/search-producto-request.dto.js';
import { Producto } from '../entities/producto.entity.js';

@Injectable()
export class ProductoRepository extends Repository<Producto> {
  constructor(private readonly dataSource: DataSource) {
    super(Producto, dataSource.createEntityManager());
  }

  async search(request: SearchProductoRequestDto): Promise<PageDto<Producto>> {
    const queryBuilder: SelectQueryBuilder<Producto> = this.createQueryBuilder(
      'producto',
    ).leftJoinAndSelect('producto.categoria', 'categoria');

    if (request.id) {
      queryBuilder.andWhere('producto.id = :id', { id: request.id });
    }

    if (request.nombre) {
      queryBuilder.andWhere('LOWER(producto.nombre) LIKE LOWER(:nombre)', {
        nombre: `%${request.nombre}%`,
      });
    }

    if (request.codigo) {
      queryBuilder.andWhere('LOWER(producto.codigo) = LOWER(:codigo)', {
        codigo: request.codigo,
      });
    }

    if (request.codigoBarras) {
      queryBuilder.andWhere('producto.codigoBarras = :codigoBarras', {
        codigoBarras: request.codigoBarras,
      });
    }

    if (request.categoriaId) {
      queryBuilder.andWhere('categoria.id = :categoriaId', {
        categoriaId: request.categoriaId,
      });
    }

    applyTextSearch(queryBuilder, request.q, [
      'producto.nombre',
      'producto.descripcion',
      'producto.codigo',
      'producto.codigoBarras',
      'categoria.nombre',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Producto>(list, count);
  }
}
