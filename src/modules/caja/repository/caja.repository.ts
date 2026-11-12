import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
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
    return this.createQueryBuilder('caja')
      .leftJoinAndSelect('caja.usuario', 'usuario')
      .leftJoinAndSelect('caja.usuarioCierre', 'usuarioCierre')
      .leftJoinAndSelect('caja.sucursal', 'sucursal');
  }

  /** Caja ABIERTA de una sucursal (a lo sumo una, garantizado por uq_caja_abierta_por_sucursal). */
  async findAbierta(sucursalId: number): Promise<Caja | null> {
    return this.baseQuery()
      .where('caja.estado = :estado', { estado: EstadoCaja.ABIERTA })
      .andWhere('caja.sucursal_id = :sucursalId', { sucursalId })
      .getOne();
  }

  async findByIdWithUsuario(id: number): Promise<Caja | null> {
    return this.baseQuery().where('caja.id = :id', { id }).getOne();
  }

  /**
   * Alinea cajas ya cargadas (numero = id) y deja el contador
   * en el máximo existente. Idempotente.
   * La numeración es GLOBAL (un único contador para todas las sucursales).
   */
  async syncNumeracion(): Promise<void> {
    await this.manager.query(`
      INSERT INTO caja_numeracion (id, ultimo_numero)
      VALUES (1, 0)
      ON DUPLICATE KEY UPDATE id = id
    `);
    await this.manager.query(`
      UPDATE caja SET numero = id WHERE numero IS NULL
    `);
    await this.manager.query(`
      UPDATE caja_numeracion
      SET ultimo_numero = (
        SELECT COALESCE(MAX(numero), 0) FROM (SELECT numero FROM caja) AS existentes
      )
      WHERE id = 1
    `);
  }

  /**
   * Reserva el siguiente número de caja. El FOR UPDATE se sostiene
   * hasta el commit de la transacción que llama.
   * Numeración GLOBAL: no depende de la sucursal (decisión de diseño multisucursal).
   */
  async allocateNumero(manager: EntityManager): Promise<number> {
    const rows: { ultimo: number | string }[] = await manager.query(
      `SELECT ultimo_numero AS ultimo FROM caja_numeracion WHERE id = 1 FOR UPDATE`,
    );
    if (!rows.length) {
      throw new Error('La numeración de cajas no está inicializada');
    }
    const numero = Number(rows[0].ultimo) + 1;
    await manager.query(
      `UPDATE caja_numeracion SET ultimo_numero = ? WHERE id = 1`,
      [numero],
    );
    return numero;
  }

  /** @param sucursalId Sucursal operativa del request: solo se listan sus cajas. */
  async search(
    request: SearchCajaRequestDto,
    sucursalId: number,
  ): Promise<PageDto<Caja>> {
    const queryBuilder = this.baseQuery().where('caja.sucursal_id = :sucursalId', {
      sucursalId,
    });

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
