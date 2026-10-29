import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
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

  /**
   * Alinea comprobantes ya cargados (numero = id) y deja el contador
   * en el máximo existente. Idempotente.
   */
  async syncNumeracion(): Promise<void> {
    await this.manager.query(`
      INSERT INTO venta_numeracion (id, ultimo_numero)
      VALUES (1, 0)
      ON DUPLICATE KEY UPDATE id = id
    `);
    await this.manager.query(`
      UPDATE venta SET numero = id WHERE numero IS NULL
    `);
    await this.manager.query(`
      UPDATE venta_numeracion
      SET ultimo_numero = (
        SELECT COALESCE(MAX(numero), 0) FROM (SELECT numero FROM venta) AS existentes
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
      `SELECT ultimo_numero AS ultimo FROM venta_numeracion WHERE id = 1 FOR UPDATE`,
    );
    if (!rows.length) {
      throw new Error('La numeración de ventas no está inicializada');
    }
    const numero = Number(rows[0].ultimo) + 1;
    await manager.query(
      `UPDATE venta_numeracion SET ultimo_numero = ? WHERE id = 1`,
      [numero],
    );
    return numero;
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
      'CAST(venta.numero AS CHAR)',
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
