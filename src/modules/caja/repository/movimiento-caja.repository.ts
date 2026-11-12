import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchMovimientoCajaRequestDto } from '../dto/search-movimiento-caja-request.dto.js';
import { MovimientoCaja } from '../entities/movimiento-caja.entity.js';

@Injectable()
export class MovimientoCajaRepository extends Repository<MovimientoCaja> {
  constructor(private readonly dataSource: DataSource) {
    super(MovimientoCaja, dataSource.createEntityManager());
  }

  /**
   * @param sucursalId Si viene, solo movimientos de cajas de esa sucursal
   *   (endpoints con header obligatorio). Si no, sin filtro de sucursal
   *   (el llamador ya validó el acceso a una caja concreta).
   */
  async search(
    request: SearchMovimientoCajaRequestDto,
    sucursalId?: number,
  ): Promise<PageDto<MovimientoCaja>> {
    const queryBuilder: SelectQueryBuilder<MovimientoCaja> =
      this.createQueryBuilder('movimiento')
        .leftJoinAndSelect('movimiento.caja', 'caja')
        .leftJoinAndSelect('movimiento.usuario', 'usuario');

    if (sucursalId !== undefined) {
      queryBuilder.andWhere('caja.sucursal_id = :sucursalId', { sucursalId });
    }

    if (request.id) {
      queryBuilder.andWhere('movimiento.id = :id', { id: request.id });
    }

    if (request.cajaId) {
      queryBuilder.andWhere('caja.id = :cajaId', { cajaId: request.cajaId });
    }

    if (request.tipo) {
      queryBuilder.andWhere('movimiento.tipo = :tipo', { tipo: request.tipo });
    }

    applyTextSearch(queryBuilder, request.q, ['movimiento.descripcion']);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<MovimientoCaja>(list, count);
  }

  async sumarPorCaja(
    cajaId: number,
    manager?: EntityManager,
  ): Promise<{
    ventas: number;
    ingresos: number;
    egresos: number;
  }> {
    const repo = manager
      ? manager.getRepository(MovimientoCaja)
      : this;
    const rows = await repo
      .createQueryBuilder('movimiento')
      .innerJoin('movimiento.caja', 'caja')
      .select('movimiento.tipo', 'tipo')
      .addSelect('SUM(movimiento.monto)', 'total')
      .where('caja.id = :cajaId', { cajaId })
      .groupBy('movimiento.tipo')
      .getRawMany<{ tipo: string; total: string }>();

    const result = { ventas: 0, ingresos: 0, egresos: 0 };
    for (const row of rows) {
      const total = Number(row.total) || 0;
      if (row.tipo === 'VENTA') result.ventas = total;
      if (row.tipo === 'INGRESO') result.ingresos = total;
      if (row.tipo === 'EGRESO') result.egresos = total;
    }
    return result;
  }
}
