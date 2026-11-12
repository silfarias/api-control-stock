import { Injectable, OnModuleInit } from '@nestjs/common';
import { PageDto } from '../../common/dto/page.dto.js';
import { EstadoTransferencia } from '../../common/enums/estado-transferencia.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { Producto } from '../producto/entities/producto.entity.js';
import { Sucursal } from '../sucursal/entities/sucursal.entity.js';
import { SucursalAccessService } from '../sucursal/sucursal-access.service.js';
import { CreateItemTransferenciaRequestDto } from './dto/create-item-transferencia-request.dto.js';
import { CreateTransferenciaRequestDto } from './dto/create-transferencia-request.dto.js';
import { SearchTransferenciaRequestDto } from './dto/search-transferencia-request.dto.js';
import { TransferenciaDTO } from './dto/transferencia.dto.js';
import { UpdateTransferenciaRequestDto } from './dto/update-transferencia-request.dto.js';
import { ItemTransferencia } from './entities/item-transferencia.entity.js';
import { Transferencia } from './entities/transferencia.entity.js';
import { TransferenciaMapper } from './mappers/transferencia.mapper.js';
import { TransferenciaRepository } from './repository/transferencia.repository.js';

/**
 * Transferencias de stock entre sucursales (solo ADMIN).
 *
 * - Una transferencia nace en BORRADOR (no toca stock), se puede editar/cancelar/eliminar
 *   mientras sea BORRADOR y se CONFIRMA una sola vez.
 * - La confirmación corre en UNA transacción con lock pesimista sobre la transferencia:
 *   por cada ítem genera TRANSFERENCIA_SALIDA en el origen y TRANSFERENCIA_ENTRADA en el destino.
 *   Si falta stock en el origen se aborta TODA la transacción (no queda nada a medias).
 * - Numeración: el número es GLOBAL (contador único `transferencia_numeracion`).
 * - Una transferencia confirmada es inmutable y no se elimina (soft-delete solo de BORRADOR).
 */
@Injectable()
export class TransferenciaService implements OnModuleInit {
  constructor(
    private readonly transferenciaRepository: TransferenciaRepository,
    private readonly transferenciaMapper: TransferenciaMapper,
    private readonly inventarioService: InventarioService,
    private readonly sucursalAccess: SucursalAccessService,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.transferenciaRepository.syncNumeracion();
  }

  async findOne(id: number): Promise<TransferenciaDTO> {
    const transferencia =
      await this.transferenciaRepository.findByIdWithRelations(id);
    if (!transferencia) {
      this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, { id });
    }
    return this.transferenciaMapper.entity2DTO(transferencia);
  }

  async search(
    request: SearchTransferenciaRequestDto,
  ): Promise<PageDto<TransferenciaDTO>> {
    const page = await this.transferenciaRepository.search(request);
    return this.transferenciaMapper.page2Dto(request, page);
  }

  async create(
    request: CreateTransferenciaRequestDto,
    actor: RequestUser,
  ): Promise<TransferenciaDTO> {
    try {
      this.assertOrigenDistintoDestino(
        request.sucursalOrigenId,
        request.sucursalDestinoId,
      );
      await this.sucursalAccess.assertActiva(request.sucursalOrigenId);
      await this.sucursalAccess.assertActiva(request.sucursalDestinoId);
      await this.validarItems(request.items);

      const savedId = await this.transferenciaRepository.manager.transaction(
        async (manager) => {
          const transferencia = this.transferenciaMapper.createDTO2Entity(
            request,
            actor.id,
          );
          transferencia.numero =
            await this.transferenciaRepository.allocateNumero(manager);
          const saved = await manager
            .getRepository(Transferencia)
            .save(transferencia);
          return saved.id;
        },
      );
      return this.findOne(savedId);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async update(
    id: number,
    request: UpdateTransferenciaRequestDto,
  ): Promise<TransferenciaDTO> {
    try {
      const transferencia =
        await this.transferenciaRepository.findByIdWithRelations(id);
      if (!transferencia) {
        this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
          id,
        });
      }
      this.assertBorrador(transferencia);

      const origenId =
        request.sucursalOrigenId ?? transferencia.sucursalOrigen.id;
      const destinoId =
        request.sucursalDestinoId ?? transferencia.sucursalDestino.id;
      this.assertOrigenDistintoDestino(origenId, destinoId);

      if (origenId !== transferencia.sucursalOrigen.id) {
        await this.sucursalAccess.assertActiva(origenId);
      }
      if (destinoId !== transferencia.sucursalDestino.id) {
        await this.sucursalAccess.assertActiva(destinoId);
      }
      if (request.items) {
        await this.validarItems(request.items);
      }

      await this.transferenciaRepository.manager.transaction(
        async (manager) => {
          if (request.items) {
            const itemRepo = manager.getRepository(ItemTransferencia);
            await itemRepo.delete({ transferencia: { id } });
            for (const item of this.transferenciaMapper.buildItems(
              request.items,
            )) {
              item.transferencia = Transferencia.fromId(id);
              await itemRepo.save(item);
            }
          }
          await manager.getRepository(Transferencia).update(id, {
            sucursalOrigen: Sucursal.fromId(origenId),
            sucursalDestino: Sucursal.fromId(destinoId),
            ...(request.observacion !== undefined && {
              observacion: request.observacion.trim() || null,
            }),
          });
        },
      );

      return this.findOne(id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Confirma la transferencia: por cada ítem descuenta stock en el origen y lo suma en el destino,
   * todo en una única transacción. Confirmar dos veces falla con `TRANSFERENCIA.YA_CONFIRMADA`
   * (la segunda llamada, aun concurrente, espera el lock y ve el estado ya confirmado).
   */
  async confirmar(id: number, actor: RequestUser): Promise<TransferenciaDTO> {
    try {
      await this.transferenciaRepository.manager.transaction(
        async (manager) => {
          const transferenciaRepo = manager.getRepository(Transferencia);

          // Lock pesimista SOLO sobre la fila de la transferencia (sin joins).
          const locked = await transferenciaRepo
            .createQueryBuilder('transferencia')
            .setLock('pessimistic_write')
            .where('transferencia.id = :id', { id })
            .getOne();

          if (!locked) {
            this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
              id,
            });
          }

          if (locked.estado === EstadoTransferencia.CONFIRMADA) {
            this.errorHandler.throwBadRequest(
              ERRORS.TRANSFERENCIA.YA_CONFIRMADA,
              { id },
            );
          }
          if (locked.estado !== EstadoTransferencia.BORRADOR) {
            this.errorHandler.throwBadRequest(
              ERRORS.TRANSFERENCIA.ESTADO_INVALIDO,
              { estado: locked.estado },
            );
          }

          const transferencia = await transferenciaRepo.findOne({
            where: { id },
            relations: {
              sucursalOrigen: true,
              sucursalDestino: true,
              items: { producto: true },
            },
          });
          if (!transferencia) {
            this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
              id,
            });
          }

          if (!transferencia.items?.length) {
            this.errorHandler.throwBadRequest(ERRORS.TRANSFERENCIA.SIN_ITEMS, {
              id,
            });
          }

          const origenId = transferencia.sucursalOrigen.id;
          const destinoId = transferencia.sucursalDestino.id;
          this.assertOrigenDistintoDestino(origenId, destinoId);
          // Las sucursales pudieron desactivarse después de crear el borrador.
          await this.sucursalAccess.assertActiva(origenId);
          await this.sucursalAccess.assertActiva(destinoId);

          const referencia = `Transferencia #${transferencia.numero ?? transferencia.id}`;

          // Orden determinista (por producto y, dentro de cada ítem, por sucursal) para que dos
          // transferencias concurrentes en sentidos opuestos tomen los locks de stock en el mismo
          // orden y no se produzcan deadlocks.
          const items = [...transferencia.items].sort(
            (a, b) => a.producto.id - b.producto.id,
          );
          for (const item of items) {
            const salida = () =>
              this.inventarioService.registrarSalidaPorTransferencia(
                {
                  productoId: item.producto.id,
                  sucursalId: origenId,
                  cantidad: item.cantidad,
                  transferenciaId: transferencia.id,
                  usuarioId: actor.id,
                  motivo: `${referencia} — salida hacia ${transferencia.sucursalDestino.nombre ?? destinoId}`,
                },
                manager,
              );
            const entrada = () =>
              this.inventarioService.registrarEntradaPorTransferencia(
                {
                  productoId: item.producto.id,
                  sucursalId: destinoId,
                  cantidad: item.cantidad,
                  transferenciaId: transferencia.id,
                  usuarioId: actor.id,
                  motivo: `${referencia} — entrada desde ${transferencia.sucursalOrigen.nombre ?? origenId}`,
                },
                manager,
              );

            if (origenId < destinoId) {
              await salida();
              await entrada();
            } else {
              await entrada();
              await salida();
            }
          }

          await transferenciaRepo.update(id, {
            estado: EstadoTransferencia.CONFIRMADA,
          });
        },
      );

      return this.findOne(id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async cancelar(id: number): Promise<TransferenciaDTO> {
    try {
      const transferencia =
        await this.transferenciaRepository.findByIdWithRelations(id);
      if (!transferencia) {
        this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
          id,
        });
      }
      this.assertBorrador(transferencia);
      await this.transferenciaRepository.update(id, {
        estado: EstadoTransferencia.CANCELADA,
      });
      return this.findOne(id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /** Soft-delete. Solo BORRADOR: las confirmadas (con movimientos de stock) no se eliminan. */
  async remove(id: number): Promise<string> {
    try {
      const transferencia =
        await this.transferenciaRepository.findByIdWithRelations(id);
      if (!transferencia) {
        this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
          id,
        });
      }
      this.assertBorrador(transferencia);
      await this.transferenciaRepository.softRemove(transferencia);
      return 'Registro eliminado correctamente';
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  private assertBorrador(transferencia: Transferencia): void {
    if (transferencia.estado === EstadoTransferencia.CONFIRMADA) {
      this.errorHandler.throwBadRequest(ERRORS.TRANSFERENCIA.YA_CONFIRMADA, {
        id: transferencia.id,
      });
    }
    if (transferencia.estado !== EstadoTransferencia.BORRADOR) {
      this.errorHandler.throwBadRequest(ERRORS.TRANSFERENCIA.ESTADO_INVALIDO, {
        estado: transferencia.estado,
        mensaje: 'Solo se pueden modificar transferencias en estado BORRADOR',
      });
    }
  }

  private assertOrigenDistintoDestino(
    origenId: number,
    destinoId: number,
  ): void {
    if (origenId === destinoId) {
      this.errorHandler.throwBadRequest(
        ERRORS.TRANSFERENCIA.MISMO_ORIGEN_DESTINO,
        { sucursalId: origenId },
      );
    }
  }

  private async validarItems(
    items: CreateItemTransferenciaRequestDto[],
  ): Promise<void> {
    if (!items?.length) {
      this.errorHandler.throwBadRequest(ERRORS.TRANSFERENCIA.SIN_ITEMS);
    }
    const vistos = new Set<number>();
    for (const item of items) {
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        this.errorHandler.throwBadRequest(ERRORS.VALIDATION.INVALID_INPUT, {
          productoId: item.productoId,
          cantidad: 'La cantidad debe ser un entero mayor a 0',
        });
      }
      if (vistos.has(item.productoId)) {
        this.errorHandler.throwBadRequest(
          ERRORS.TRANSFERENCIA.PRODUCTO_DUPLICADO,
          { productoId: item.productoId },
        );
      }
      vistos.add(item.productoId);
      await this.getEntity.findById(Producto, item.productoId);
    }
  }
}
