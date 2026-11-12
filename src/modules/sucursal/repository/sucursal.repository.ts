import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchSucursalRequestDto } from '../dto/search-sucursal-request.dto.js';
import { Sucursal } from '../entities/sucursal.entity.js';

@Injectable()
export class SucursalRepository extends Repository<Sucursal> {
  constructor(private readonly dataSource: DataSource) {
    super(Sucursal, dataSource.createEntityManager());
  }

  /**
   * @param allowedIds `null` = sin restricción (ADMIN); array = solo esos ids (EMPLEADO).
   */
  async search(
    request: SearchSucursalRequestDto,
    allowedIds: number[] | null = null,
  ): Promise<PageDto<Sucursal>> {
    const queryBuilder: SelectQueryBuilder<Sucursal> =
      this.createQueryBuilder('sucursal');

    if (allowedIds !== null) {
      if (allowedIds.length === 0) {
        return new PageDto<Sucursal>([], 0);
      }
      queryBuilder.andWhere('sucursal.id IN (:...allowedIds)', { allowedIds });
    }

    if (request.id) {
      queryBuilder.andWhere('sucursal.id = :id', { id: request.id });
    }

    if (request.nombre) {
      queryBuilder.andWhere('LOWER(sucursal.nombre) LIKE LOWER(:nombre)', {
        nombre: `%${request.nombre}%`,
      });
    }

    if (request.codigo) {
      queryBuilder.andWhere('LOWER(sucursal.codigo) LIKE LOWER(:codigo)', {
        codigo: `%${request.codigo}%`,
      });
    }

    if (request.activo !== undefined) {
      queryBuilder.andWhere('sucursal.activo = :activo', {
        activo: request.activo,
      });
    }

    applyTextSearch(queryBuilder, request.q, [
      'sucursal.nombre',
      'sucursal.codigo',
      'sucursal.direccion',
      'sucursal.telefono',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Sucursal>(list, count);
  }
}
