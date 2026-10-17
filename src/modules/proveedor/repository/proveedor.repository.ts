import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchProveedorRequestDto } from '../dto/search-proveedor-request.dto.js';
import { Proveedor } from '../entities/proveedor.entity.js';

@Injectable()
export class ProveedorRepository extends Repository<Proveedor> {
  constructor(private readonly dataSource: DataSource) {
    super(Proveedor, dataSource.createEntityManager());
  }

  async search(request: SearchProveedorRequestDto): Promise<PageDto<Proveedor>> {
    const queryBuilder: SelectQueryBuilder<Proveedor> =
      this.createQueryBuilder('proveedor');

    if (request.id) {
      queryBuilder.andWhere('proveedor.id = :id', { id: request.id });
    }

    if (request.nombre) {
      queryBuilder.andWhere('LOWER(proveedor.nombre) LIKE LOWER(:nombre)', {
        nombre: `%${request.nombre}%`,
      });
    }

    if (request.activo !== undefined) {
      queryBuilder.andWhere('proveedor.activo = :activo', {
        activo: request.activo,
      });
    }

    applyTextSearch(queryBuilder, request.q, [
      'proveedor.nombre',
      'proveedor.cuit',
      'proveedor.email',
      'proveedor.telefono',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Proveedor>(list, count);
  }
}
