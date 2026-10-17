import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchCompraRequestDto } from '../dto/search-compra-request.dto.js';
import { Compra } from '../entities/compra.entity.js';

@Injectable()
export class CompraRepository extends Repository<Compra> {
  constructor(private readonly dataSource: DataSource) {
    super(Compra, dataSource.createEntityManager());
  }

  private baseQuery(): SelectQueryBuilder<Compra> {
    return this.createQueryBuilder('compra')
      .leftJoinAndSelect('compra.proveedor', 'proveedor')
      .leftJoinAndSelect('compra.usuario', 'usuario')
      .leftJoinAndSelect('compra.items', 'items')
      .leftJoinAndSelect('items.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria');
  }

  async findByIdWithRelations(id: number): Promise<Compra | null> {
    return this.baseQuery().where('compra.id = :id', { id }).getOne();
  }

  async search(request: SearchCompraRequestDto): Promise<PageDto<Compra>> {
    const queryBuilder = this.baseQuery();

    if (request.id) {
      queryBuilder.andWhere('compra.id = :id', { id: request.id });
    }

    if (request.proveedorId) {
      queryBuilder.andWhere('proveedor.id = :proveedorId', {
        proveedorId: request.proveedorId,
      });
    }

    if (request.usuarioId) {
      queryBuilder.andWhere('usuario.id = :usuarioId', {
        usuarioId: request.usuarioId,
      });
    }

    if (request.estado) {
      queryBuilder.andWhere('compra.estado = :estado', {
        estado: request.estado,
      });
    }

    applyTextSearch(queryBuilder, request.q, [
      'proveedor.nombre',
      'producto.nombre',
      'producto.codigo',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Compra>(list, count);
  }
}
