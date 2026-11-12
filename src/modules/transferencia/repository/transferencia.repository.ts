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
import { SearchTransferenciaRequestDto } from '../dto/search-transferencia-request.dto.js';
import { Transferencia } from '../entities/transferencia.entity.js';

@Injectable()
export class TransferenciaRepository extends Repository<Transferencia> {
  constructor(private readonly dataSource: DataSource) {
    super(Transferencia, dataSource.createEntityManager());
  }

  private baseQuery(): SelectQueryBuilder<Transferencia> {
    return this.createQueryBuilder('transferencia')
      .leftJoinAndSelect('transferencia.sucursalOrigen', 'origen')
      .leftJoinAndSelect('transferencia.sucursalDestino', 'destino')
      .leftJoinAndSelect('transferencia.usuario', 'usuario')
      .leftJoinAndSelect('transferencia.items', 'items')
      .leftJoinAndSelect('items.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria');
  }

  async findByIdWithRelations(id: number): Promise<Transferencia | null> {
    return this.baseQuery().where('transferencia.id = :id', { id }).getOne();
  }

  /**
   * Deja el contador en el máximo existente y rellena números nulos con el id. Idempotente.
   * Numeración GLOBAL (un único contador para todas las sucursales).
   */
  async syncNumeracion(): Promise<void> {
    await this.manager.query(`
      INSERT INTO transferencia_numeracion (id, ultimo_numero)
      VALUES (1, 0)
      ON DUPLICATE KEY UPDATE id = id
    `);
    await this.manager.query(`
      UPDATE transferencia SET numero = id WHERE numero IS NULL
    `);
    await this.manager.query(`
      UPDATE transferencia_numeracion
      SET ultimo_numero = (
        SELECT COALESCE(MAX(numero), 0) FROM (SELECT numero FROM transferencia) AS existentes
      )
      WHERE id = 1
    `);
  }

  /**
   * Reserva el siguiente número. El FOR UPDATE se sostiene hasta el commit
   * de la transacción que llama. Numeración GLOBAL (no depende de la sucursal).
   */
  async allocateNumero(manager: EntityManager): Promise<number> {
    const rows: { ultimo: number | string }[] = await manager.query(
      `SELECT ultimo_numero AS ultimo FROM transferencia_numeracion WHERE id = 1 FOR UPDATE`,
    );
    if (!rows.length) {
      throw new Error('La numeración de transferencias no está inicializada');
    }
    const numero = Number(rows[0].ultimo) + 1;
    await manager.query(
      `UPDATE transferencia_numeracion SET ultimo_numero = ? WHERE id = 1`,
      [numero],
    );
    return numero;
  }

  async search(
    request: SearchTransferenciaRequestDto,
  ): Promise<PageDto<Transferencia>> {
    const queryBuilder = this.baseQuery();

    if (request.id) {
      queryBuilder.andWhere('transferencia.id = :id', { id: request.id });
    }
    if (request.sucursalOrigenId) {
      queryBuilder.andWhere('origen.id = :sucursalOrigenId', {
        sucursalOrigenId: request.sucursalOrigenId,
      });
    }
    if (request.sucursalDestinoId) {
      queryBuilder.andWhere('destino.id = :sucursalDestinoId', {
        sucursalDestinoId: request.sucursalDestinoId,
      });
    }
    if (request.sucursalId) {
      queryBuilder.andWhere(
        '(origen.id = :sucursalId OR destino.id = :sucursalId)',
        { sucursalId: request.sucursalId },
      );
    }
    if (request.usuarioId) {
      queryBuilder.andWhere('usuario.id = :usuarioId', {
        usuarioId: request.usuarioId,
      });
    }
    if (request.estado) {
      queryBuilder.andWhere('transferencia.estado = :estado', {
        estado: request.estado,
      });
    }

    applyTextSearch(queryBuilder, request.q, [
      'CAST(transferencia.numero AS CHAR)',
      'transferencia.observacion',
      'origen.nombre',
      'destino.nombre',
      'producto.nombre',
      'producto.codigo',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Transferencia>(list, count);
  }
}
