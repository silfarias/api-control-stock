import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchVentaRequestDto } from '../dto/search-venta-request.dto.js';
import { Venta } from '../entities/venta.entity.js';

@Injectable()
export class VentaRepository extends Repository<Venta> {
  constructor(private readonly dataSource: DataSource) {
    super(Venta, dataSource.createEntityManager());
  }

  private baseQuery(): SelectQueryBuilder<Venta> {
    return this.createQueryBuilder('venta')
      .leftJoinAndSelect('venta.usuario', 'usuario')
      .leftJoinAndSelect('venta.items', 'items')
      .leftJoinAndSelect('items.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria');
  }

  async findByIdWithRelations(id: number): Promise<Venta | null> {
    return this.baseQuery().where('venta.id = :id', { id }).getOne();
  }

  async search(request: SearchVentaRequestDto): Promise<PageDto<Venta>> {
    const queryBuilder = this.baseQuery();

    if (request.id) {
      queryBuilder.andWhere('venta.id = :id', { id: request.id });
    }

    if (request.usuarioId) {
      queryBuilder.andWhere('usuario.id = :usuarioId', {
        usuarioId: request.usuarioId,
      });
    }

    if (request.estado) {
      queryBuilder.andWhere('venta.estado = :estado', {
        estado: request.estado,
      });
    }

    if (request.metodoPago) {
      queryBuilder.andWhere('venta.metodoPago = :metodoPago', {
        metodoPago: request.metodoPago,
      });
    }

    applyTextSearch(queryBuilder, request.q, [
      'producto.nombre',
      'producto.codigo',
      'usuario.nombre',
      'usuario.email',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Venta>(list, count);
  }
}
