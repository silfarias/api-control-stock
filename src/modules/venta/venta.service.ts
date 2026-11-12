import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PageDto } from '../../common/dto/page.dto.js';
import { EstadoVenta } from '../../common/enums/estado-venta.enum.js';
import { MetodoPago } from '../../common/enums/metodo-pago.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { CajaService } from '../caja/caja.service.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { Producto } from '../producto/entities/producto.entity.js';
import { SucursalAccessService } from '../sucursal/sucursal-access.service.js';
import { CreateVentaRequestDto } from './dto/create-venta-request.dto.js';
import { SearchVentaRequestDto } from './dto/search-venta-request.dto.js';
import { VentaDTO } from './dto/venta.dto.js';
import { Venta } from './entities/venta.entity.js';
import { ItemVentaConPrecio, VentaMapper } from './mappers/venta.mapper.js';
import { VentaRepository } from './repository/venta.repository.js';

/**
 * Ventas multisucursal.
 *
 * Numeración: el `numero` de comprobante es GLOBAL (un único contador `venta_numeracion`
 * compartido por todas las sucursales); no se reinicia por sucursal.
 */
@Injectable()
export class VentaService implements OnModuleInit {
  constructor(
    private readonly ventaRepository: VentaRepository,
    private readonly ventaMapper: VentaMapper,
    private readonly inventarioService: InventarioService,
    private readonly cajaService: CajaService,
    private readonly sucursalAccess: SucursalAccessService,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ventaRepository.syncNumeracion();
  }

  /**
   * Detalle de una venta. ADMIN: cualquiera; EMPLEADO: solo de sucursales asignadas.
   * No requiere header: la sucursal sale de la propia venta.
   */
  async findOne(id: number, viewer: RequestUser): Promise<VentaDTO> {
    const venta = await this.ventaRepository.findByIdWithRelations(id);
    if (!venta) {
      this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, { id });
    }
    await this.sucursalAccess.assertUsuarioTieneAcceso(
      viewer,
      venta.sucursal.id,
    );
    return this.ventaMapper.entity2DTO(venta, viewer.role);
  }

  /** Búsqueda limitada a la sucursal operativa (header `x-sucursal-id`). */
  async search(
    request: SearchVentaRequestDto,
    sucursalId: number,
    viewer?: RequestUser,
  ): Promise<PageDto<VentaDTO>> {
    const page = await this.ventaRepository.search(request, sucursalId);
    return this.ventaMapper.page2Dto(request, page, viewer?.role);
  }

  /**
   * Registra una venta confirmada en la sucursal operativa, en una sola transacción:
   * valida productos → calcula precios en backend → crea venta/ítems (con snapshot de la
   * sucursal) → descuenta el stock de ESA sucursal → movimientos VENTA →
   * (efectivo) movimiento en la caja abierta de ESA sucursal.
   */
  async create(
    request: CreateVentaRequestDto,
    actor: RequestUser,
    sucursalId: number,
  ): Promise<VentaDTO> {
    try {
      if (!request.items?.length) {
        this.errorHandler.throwBadRequest(ERRORS.VENTA.SIN_ITEMS);
      }

      const sucursal = await this.sucursalAccess.assertActiva(sucursalId);
      const itemsConPrecio = await this.resolverPrecios(request);

      const savedId = await this.ventaRepository.manager.transaction(
        async (manager) => {
          const ventaRepo = manager.getRepository(Venta);
          const venta = this.ventaMapper.buildFromPrecios(
            request,
            actor.id,
            itemsConPrecio,
            sucursal,
          );
          venta.numero = await this.ventaRepository.allocateNumero(manager);
          const saved = await ventaRepo.save(venta);

          for (const item of itemsConPrecio) {
            await this.inventarioService.registrarSalidaPorVenta(
              {
                productoId: item.productoId,
                sucursalId,
                cantidad: item.cantidad,
                ventaId: saved.id,
                usuarioId: actor.id,
                motivo: `Venta #${saved.numero} — producto ${item.productoId}`,
              },
              manager,
            );
          }

          if (request.metodoPago === MetodoPago.EFECTIVO) {
            await this.cajaService.registrarVentaEfectivo(
              {
                ventaId: saved.id,
                monto: Number(saved.total),
                usuarioId: actor.id,
                sucursalId,
              },
              manager,
            );
          }

          return saved.id;
        },
      );

      return this.findOne(savedId, actor);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Anula una venta confirmada: devuelve el stock a la sucursal DE LA VENTA (no a la del
   * header del actor) y, si fue en efectivo, registra un egreso en la caja de esa misma
   * sucursal (la original si sigue abierta; si no, la abierta de la sucursal; si no hay, error).
   * El número de comprobante no se reutiliza.
   */
  async cancelar(id: number, actor: RequestUser): Promise<VentaDTO> {
    try {
      await this.ventaRepository.manager.transaction(async (manager) => {
        const ventaRepo = manager.getRepository(Venta);
        const venta = await ventaRepo
          .createQueryBuilder('venta')
          .setLock('pessimistic_write')
          .leftJoinAndSelect('venta.items', 'items')
          .leftJoinAndSelect('items.producto', 'producto')
          .where('venta.id = :id', { id })
          .getOne();

        if (!venta) {
          this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
            id,
          });
        }

        if (venta.estado === EstadoVenta.CANCELADA) {
          this.errorHandler.throwBadRequest(ERRORS.VENTA.YA_CANCELADA, { id });
        }

        if (venta.estado !== EstadoVenta.CONFIRMADA) {
          this.errorHandler.throwBadRequest(ERRORS.VENTA.ESTADO_INVALIDO, {
            estado: venta.estado,
          });
        }

        if (!venta.items?.length) {
          this.errorHandler.throwBadRequest(ERRORS.VENTA.SIN_ITEMS, { id });
        }

        // Lectura sin lock (la venta ya está bloqueada): evita bloquear la fila de sucursal.
        const sucursalId = await this.getSucursalIdDeVenta(manager, id);
        await this.sucursalAccess.assertUsuarioTieneAcceso(actor, sucursalId);

        const etiqueta = venta.numero ?? venta.id;

        for (const item of venta.items) {
          await this.inventarioService.registrarEntradaPorAnulacionVenta(
            {
              productoId: item.producto.id,
              sucursalId,
              cantidad: item.cantidad,
              ventaId: venta.id,
              usuarioId: actor.id,
              motivo: `Anulación venta #${etiqueta} — producto ${item.producto.id}`,
            },
            manager,
          );
        }

        if (venta.metodoPago === MetodoPago.EFECTIVO) {
          await this.cajaService.registrarAnulacionEfectivo(
            {
              ventaId: venta.id,
              numero: venta.numero,
              monto: Number(venta.total),
              usuarioId: actor.id,
              sucursalId,
            },
            manager,
          );
        }

        venta.estado = EstadoVenta.CANCELADA;
        await ventaRepo.save(venta);
      });

      return this.findOne(id, actor);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  private async getSucursalIdDeVenta(
    manager: EntityManager,
    ventaId: number,
  ): Promise<number> {
    const conSucursal = await manager.getRepository(Venta).findOne({
      where: { id: ventaId },
      relations: { sucursal: true },
      select: { id: true, sucursal: { id: true } },
    });
    if (!conSucursal?.sucursal) {
      this.errorHandler.throwNotFound(ERRORS.SUCURSAL.NOT_FOUND, {
        ventaId,
      });
    }
    return conSucursal.sucursal.id;
  }

  private async resolverPrecios(
    request: CreateVentaRequestDto,
  ): Promise<ItemVentaConPrecio[]> {
    const result: ItemVentaConPrecio[] = [];

    for (const item of request.items) {
      const producto = await this.getEntity.findById(Producto, item.productoId);
      const precioUnitario = Number(producto.precioVenta);
      result.push({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario,
      });
    }

    return result;
  }
}
