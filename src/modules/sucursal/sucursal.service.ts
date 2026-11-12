import { Injectable } from '@nestjs/common';
import { EntityManager, In, MoreThan, Not } from 'typeorm';
import { PageDto } from '../../common/dto/page.dto.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { Caja } from '../caja/entities/caja.entity.js';
import { Compra } from '../compra/entities/compra.entity.js';
import { MovimientoStock } from '../inventario/entities/movimiento-stock.entity.js';
import { Stock } from '../inventario/entities/stock.entity.js';
import { Usuario } from '../usuario/entities/usuario.entity.js';
import { Venta } from '../venta/entities/venta.entity.js';
import { AssignUsuarioSucursalesRequestDto } from './dto/assign-usuario-sucursales-request.dto.js';
import { CreateSucursalRequestDto } from './dto/create-sucursal-request.dto.js';
import { SearchSucursalRequestDto } from './dto/search-sucursal-request.dto.js';
import { SucursalDTO } from './dto/sucursal.dto.js';
import { UpdateSucursalRequestDto } from './dto/update-sucursal-request.dto.js';
import { Sucursal } from './entities/sucursal.entity.js';
import { UsuarioSucursal } from './entities/usuario-sucursal.entity.js';
import { SucursalMapper } from './mappers/sucursal.mapper.js';
import { SucursalRepository } from './repository/sucursal.repository.js';
import { SucursalAccessService } from './sucursal-access.service.js';

/** Código de la sucursal base del sistema; no puede eliminarse. */
export const SUCURSAL_CASA_CENTRAL_CODIGO = 'CASA-CENTRAL';

@Injectable()
export class SucursalService {
  constructor(
    private readonly sucursalMapper: SucursalMapper,
    private readonly sucursalRepository: SucursalRepository,
    private readonly sucursalAccess: SucursalAccessService,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  /** ADMIN: cualquiera. EMPLEADO: solo si la tiene asignada. */
  async findOne(id: number, user: RequestUser): Promise<SucursalDTO> {
    const sucursal = await this.getEntity.findById(Sucursal, id);
    await this.sucursalAccess.assertUsuarioTieneAcceso(user, id);
    return this.sucursalMapper.entity2DTO(sucursal);
  }

  /** ADMIN ve todas; EMPLEADO solo las asignadas. */
  async search(
    request: SearchSucursalRequestDto,
    user: RequestUser,
  ): Promise<PageDto<SucursalDTO>> {
    const allowedIds = await this.sucursalAccess.listSucursalIdsForUser(user);
    const page = await this.sucursalRepository.search(request, allowedIds);
    return this.sucursalMapper.page2Dto(request, page);
  }

  /**
   * Sucursales ACTIVAS en las que el usuario autenticado puede operar
   * (ADMIN: todas las activas; EMPLEADO: las activas asignadas).
   */
  async findMine(user: RequestUser): Promise<SucursalDTO[]> {
    const allowedIds = await this.sucursalAccess.listSucursalIdsForUser(user);
    if (allowedIds !== null && allowedIds.length === 0) return [];
    const sucursales = await this.sucursalRepository.find({
      where: {
        activo: true,
        ...(allowedIds !== null ? { id: In(allowedIds) } : {}),
      },
      order: { nombre: 'ASC' },
    });
    return Promise.all(sucursales.map((s) => this.sucursalMapper.entity2DTO(s)));
  }

  /**
   * Crea la sucursal y, en la misma transacción, inicializa en 0 el stock de todos los
   * productos del catálogo en la nueva sucursal (decisión de diseño: existe una fila por
   * producto y sucursal). Idempotente a nivel DB (INSERT IGNORE sobre el UNIQUE
   * uq_stock_producto_sucursal); además aplicarMovimiento crea filas faltantes bajo demanda.
   */
  async create(request: CreateSucursalRequestDto): Promise<SucursalDTO> {
    try {
      const entity = await this.sucursalMapper.createDTO2Entity(request);
      await this.assertCodigoDisponible(entity.codigo);
      const saved = await this.sucursalRepository.manager.transaction(
        async (manager) => {
          const creada = await manager.getRepository(Sucursal).save(entity);
          await manager.query(
            `INSERT IGNORE INTO stock (producto_id, sucursal_id, cantidad)
             SELECT p.id, ?, 0 FROM producto p WHERE p.deleted_date IS NULL`,
            [creada.id],
          );
          return creada;
        },
      );
      return this.sucursalMapper.entity2DTO(saved);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async update(
    id: number,
    request: UpdateSucursalRequestDto,
  ): Promise<SucursalDTO> {
    try {
      const sucursal = await this.getEntity.findById(Sucursal, id);
      const updated = await this.sucursalMapper.updateDTO2Entity(
        sucursal,
        request,
      );
      if (request.codigo !== undefined) {
        await this.assertCodigoDisponible(updated.codigo, id);
      }
      await this.sucursalRepository.save(updated);
      return this.sucursalMapper.entity2DTO(updated);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /** Reactiva una sucursal (activo = true). */
  async activar(id: number): Promise<SucursalDTO> {
    try {
      const sucursal = await this.getEntity.findById(Sucursal, id);
      sucursal.activo = true;
      await this.sucursalRepository.save(sucursal);
      return this.sucursalMapper.entity2DTO(sucursal);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * "Eliminar" = soft delete + activo=false. Nunca hard delete.
   * No se permite eliminar la sucursal con código CASA-CENTRAL (sucursal base del sistema).
   * Tampoco si tiene historial (ventas, compras, cajas, movimientos de stock — incluidos los
   * soft-deleted) ni unidades en stock: en ese caso solo se puede DESACTIVAR (`activo = false`).
   * Lanza SUCURSAL.NO_ELIMINABLE con el detalle de los conteos.
   */
  async remove(id: number): Promise<string> {
    try {
      await this.sucursalRepository.manager.transaction(async (manager) => {
        const repo = manager.getRepository(Sucursal);
        const sucursal = await repo.findOne({ where: { id } });
        if (!sucursal) {
          this.errorHandler.throwNotFound(ERRORS.SUCURSAL.NOT_FOUND, { id });
        }
        if (sucursal.codigo === SUCURSAL_CASA_CENTRAL_CODIGO) {
          this.errorHandler.throwBadRequest(ERRORS.SUCURSAL.NO_ELIMINABLE, {
            id,
            motivo: `La sucursal ${SUCURSAL_CASA_CENTRAL_CODIGO} no puede eliminarse`,
          });
        }
        await this.assertSinHistorial(manager, id);
        sucursal.activo = false;
        await repo.save(sucursal);
        await repo.softRemove(sucursal);
      });
      return 'Registro eliminado correctamente';
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /** Sucursales asignadas a un usuario (no eliminadas). */
  async getAsignaciones(usuarioId: number): Promise<SucursalDTO[]> {
    await this.getEntity.findById(Usuario, usuarioId);
    const asignaciones = await this.sucursalRepository.manager
      .getRepository(UsuarioSucursal)
      .find({
        where: { usuario: { id: usuarioId } },
        relations: { sucursal: true },
        order: { id: 'ASC' },
      });
    const sucursales = asignaciones
      .map((a) => a.sucursal)
      .filter((s): s is Sucursal => Boolean(s) && !s.deletedAt);
    return Promise.all(sucursales.map((s) => this.sucursalMapper.entity2DTO(s)));
  }

  /** Reemplaza TODAS las asignaciones del usuario por las indicadas (puede ser []). */
  async replaceAsignaciones(
    usuarioId: number,
    request: AssignUsuarioSucursalesRequestDto,
  ): Promise<SucursalDTO[]> {
    try {
      await this.getEntity.findById(Usuario, usuarioId);
      const sucursalIds = [...new Set(request.sucursalIds)];

      if (sucursalIds.length > 0) {
        const existentes = await this.sucursalRepository.find({
          where: { id: In(sucursalIds) },
          select: { id: true },
        });
        const existentesIds = new Set(existentes.map((s) => s.id));
        const faltantes = sucursalIds.filter((sid) => !existentesIds.has(sid));
        if (faltantes.length > 0) {
          this.errorHandler.throwNotFound(ERRORS.SUCURSAL.NOT_FOUND, {
            ids: faltantes,
          });
        }
      }

      await this.sucursalRepository.manager.transaction(async (manager) => {
        const repo = manager.getRepository(UsuarioSucursal);
        await repo
          .createQueryBuilder()
          .delete()
          .where('usuario_id = :usuarioId', { usuarioId })
          .execute();
        if (sucursalIds.length > 0) {
          const nuevas = sucursalIds.map((sid) => {
            const asignacion = new UsuarioSucursal();
            asignacion.usuario = Usuario.fromId(usuarioId);
            asignacion.sucursal = Sucursal.fromId(sid);
            return asignacion;
          });
          await repo.save(nuevas);
        }
      });

      return this.getAsignaciones(usuarioId);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Una sucursal con historial (o con mercadería) no puede eliminarse: se desactiva.
   * Cuenta también registros soft-deleted (`withDeleted`) porque siguen referenciando la sucursal.
   * @throws 400 SUCURSAL.NO_ELIMINABLE
   */
  private async assertSinHistorial(
    manager: EntityManager,
    sucursalId: number,
  ): Promise<void> {
    const porSucursal = { sucursal: { id: sucursalId } };
    const [ventas, compras, cajas, movimientosStock, stockConUnidades] =
      await Promise.all([
        manager
          .getRepository(Venta)
          .count({ where: porSucursal, withDeleted: true }),
        manager
          .getRepository(Compra)
          .count({ where: porSucursal, withDeleted: true }),
        manager
          .getRepository(Caja)
          .count({ where: porSucursal, withDeleted: true }),
        manager
          .getRepository(MovimientoStock)
          .count({ where: porSucursal, withDeleted: true }),
        manager.getRepository(Stock).count({
          where: { ...porSucursal, cantidad: MoreThan(0) },
          withDeleted: true,
        }),
      ]);

    if (ventas + compras + cajas + movimientosStock + stockConUnidades > 0) {
      this.errorHandler.throwBadRequest(ERRORS.SUCURSAL.NO_ELIMINABLE, {
        id: sucursalId,
        motivo:
          'La sucursal tiene historial o stock; solo puede desactivarse (activo = false)',
        ventas,
        compras,
        cajas,
        movimientosStock,
        stockConUnidades,
      });
    }
  }

  /**
   * El índice UNIQUE de `codigo` incluye sucursales eliminadas (soft delete),
   * por eso se consulta con `withDeleted`.
   */
  private async assertCodigoDisponible(
    codigo: string,
    excludeId?: number,
  ): Promise<void> {
    const duplicada = await this.sucursalRepository.findOne({
      where: {
        codigo,
        ...(excludeId !== undefined ? { id: Not(excludeId) } : {}),
      },
      withDeleted: true,
      select: { id: true },
    });
    if (duplicada) {
      this.errorHandler.throwConflict(ERRORS.SUCURSAL.CODIGO_DUPLICADO, {
        codigo,
      });
    }
  }
}
