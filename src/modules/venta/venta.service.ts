import { Injectable, OnModuleInit } from '@nestjs/common';
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
import { CreateVentaRequestDto } from './dto/create-venta-request.dto.js';
import { SearchVentaRequestDto } from './dto/search-venta-request.dto.js';
import { VentaDTO } from './dto/venta.dto.js';
import { Venta } from './entities/venta.entity.js';
import { ItemVentaConPrecio, VentaMapper } from './mappers/venta.mapper.js';
import { VentaRepository } from './repository/venta.repository.js';

@Injectable()
export class VentaService implements OnModuleInit {
  constructor(
    private readonly ventaRepository: VentaRepository,
    private readonly ventaMapper: VentaMapper,
    private readonly inventarioService: InventarioService,
    private readonly cajaService: CajaService,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ventaRepository.syncNumeracion();
  }

  async findOne(id: number): Promise<VentaDTO> {
    const venta = await this.ventaRepository.findByIdWithRelations(id);
    if (!venta) {
      this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, { id });
    }
    return this.ventaMapper.entity2DTO(venta);
  }

  async search(request: SearchVentaRequestDto): Promise<PageDto<VentaDTO>> {
    const page = await this.ventaRepository.search(request);
    return this.ventaMapper.page2Dto(request, page);
  }

  /**
   * Registra una venta confirmada en una sola transacción:
   * valida productos → calcula precios en backend → crea venta/ítems →
   * descuenta stock → movimientos VENTA.
   */
  async create(
    request: CreateVentaRequestDto,
    actor: RequestUser,
  ): Promise<VentaDTO> {
    try {
      if (!request.items?.length) {
        this.errorHandler.throwBadRequest(ERRORS.VENTA.SIN_ITEMS);
      }

      const itemsConPrecio = await this.resolverPrecios(request);

      const savedId = await this.ventaRepository.manager.transaction(
        async (manager) => {
          const ventaRepo = manager.getRepository(Venta);
          const venta = this.ventaMapper.buildFromPrecios(
            request,
            actor.id,
            itemsConPrecio,
          );
          venta.numero = await this.ventaRepository.allocateNumero(manager);
          const saved = await ventaRepo.save(venta);

          for (const item of itemsConPrecio) {
            await this.inventarioService.registrarSalidaPorVenta(
              {
                productoId: item.productoId,
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
              },
              manager,
            );
          }

          return saved.id;
        },
      );

      return this.findOne(savedId);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Anula una venta confirmada: devuelve el stock y, si fue en efectivo,
   * registra un egreso. El número de comprobante no se reutiliza.
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

        const etiqueta = venta.numero ?? venta.id;

        for (const item of venta.items) {
          await this.inventarioService.registrarEntradaPorAnulacionVenta(
            {
              productoId: item.producto.id,
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
            },
            manager,
          );
        }

        venta.estado = EstadoVenta.CANCELADA;
        await ventaRepo.save(venta);
      });

      return this.findOne(id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
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
