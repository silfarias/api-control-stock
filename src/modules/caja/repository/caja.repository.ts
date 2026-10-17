import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import { EstadoCaja } from '../../../common/enums/estado-caja.enum.js';
import { applySearchQueryOptions } from '../../../common/utils/search-query.util.js';
import { SearchCajaRequestDto } from '../dto/search-caja-request.dto.js';
import { Caja } from '../entities/caja.entity.js';

@Injectable()
export class CajaRepository extends Repository<Caja> {
  constructor(private readonly dataSource: DataSource) {
    super(Caja, dataSource.createEntityManager());
  }

  private baseQuery(): SelectQueryBuilder<Caja> {
    return this.createQueryBuilder('caja').leftJoinAndSelect(
      'caja.usuario',
      'usuario',
    );
  }

  async findAbierta(): Promise<Caja | null> {
    return this.baseQuery()
      .where('caja.estado = :estado', { estado: EstadoCaja.ABIERTA })
      .getOne();
  }

  async findByIdWithUsuario(id: number): Promise<Caja | null> {
    return this.baseQuery().where('caja.id = :id', { id }).getOne();
  }

  async search(request: SearchCajaRequestDto): Promise<PageDto<Caja>> {
    const queryBuilder = this.baseQuery();

    if (request.id) {
      queryBuilder.andWhere('caja.id = :id', { id: request.id });
    }

    if (request.usuarioId) {
      queryBuilder.andWhere('usuario.id = :usuarioId', {
        usuarioId: request.usuarioId,
      });
    }

    if (request.estado) {
      queryBuilder.andWhere('caja.estado = :estado', {
        estado: request.estado,
      });
    }

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Caja>(list, count);
  }
}
