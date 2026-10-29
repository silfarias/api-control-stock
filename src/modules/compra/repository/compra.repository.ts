import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
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

  /**
   * Alinea comprobantes ya cargados (numero = id) y deja el contador
   * en el máximo existente. Idempotente.
   */
  async syncNumeracion(): Promise<void> {
    await this.manager.query(`
      INSERT INTO compra_numeracion (id, ultimo_numero)
      VALUES (1, 0)
      ON DUPLICATE KEY UPDATE id = id
    `);
    await this.manager.query(`
      UPDATE compra SET numero = id WHERE numero IS NULL
    `);
    await this.manager.query(`
      UPDATE compra_numeracion
      SET ultimo_numero = (
        SELECT COALESCE(MAX(numero), 0) FROM (SELECT numero FROM compra) AS existentes
      )
      WHERE id = 1
    `);
  }

  /**
   * Reserva el siguiente comprobante. El FOR UPDATE se sostiene
   * hasta el commit de la transacción que llama.
   */
  async allocateNumero(manager: EntityManager): Promise<number> {
    const rows: { ultimo: number | string }[] = await manager.query(
      `SELECT ultimo_numero AS ultimo FROM compra_numeracion WHERE id = 1 FOR UPDATE`,
    );
    if (!rows.length) {
      throw new Error('La numeración de compras no está inicializada');
    }
    const numero = Number(rows[0].ultimo) + 1;
    await manager.query(
      `UPDATE compra_numeracion SET ultimo_numero = ? WHERE id = 1`,
      [numero],
    );
    return numero;
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
      'CAST(compra.numero AS CHAR)',
      'proveedor.nombre',
      'producto.nombre',
      'producto.codigo',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Compra>(list, count);
  }
}
