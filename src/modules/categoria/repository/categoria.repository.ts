import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchCategoriaRequestDto } from '../dto/search-categoria-request.dto.js';
import { Categoria } from '../entities/categoria.entity.js';

@Injectable()
export class CategoriaRepository extends Repository<Categoria> {
  constructor(private readonly dataSource: DataSource) {
    super(Categoria, dataSource.createEntityManager());
  }

  async search(request: SearchCategoriaRequestDto): Promise<PageDto<Categoria>> {
    const queryBuilder: SelectQueryBuilder<Categoria> =
      this.createQueryBuilder('categoria');

    if (request.id) {
      queryBuilder.andWhere('categoria.id = :id', { id: request.id });
    }

    if (request.nombre) {
      queryBuilder.andWhere('LOWER(categoria.nombre) LIKE LOWER(:nombre)', {
        nombre: `%${request.nombre}%`,
      });
    }

    applyTextSearch(queryBuilder, request.q, [
      'categoria.nombre',
      'categoria.descripcion',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Categoria>(list, count);
  }
}
