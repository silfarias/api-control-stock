import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PageDto } from '../../common/dto/page.dto.js';
import {
  TIPOS_MOVIMIENTO_ENTRADA,
  TipoMovimientoStock,
} from '../../common/enums/tipo-movimiento-stock.enum.js';
import { TipoReferenciaMovimiento } from '../../common/enums/tipo-referencia-movimiento.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { Producto } from '../producto/entities/producto.entity.js';
import { Sucursal } from '../sucursal/entities/sucursal.entity.js';
import { Usuario } from '../usuario/entities/usuario.entity.js';
import { AjusteStockResponseDto } from './dto/ajuste-stock-response.dto.js';
import { CreateAjusteStockRequestDto } from './dto/create-ajuste-stock-request.dto.js';
import { MovimientoStockDTO } from './dto/movimiento-stock.dto.js';
import { SearchMovimientoStockRequestDto } from './dto/search-movimiento-stock-request.dto.js';
import { SearchStockRequestDto } from './dto/search-stock-request.dto.js';
import { StockDTO } from './dto/stock.dto.js';
import { MovimientoStock } from './entities/movimiento-stock.entity.js';
import { Stock } from './entities/stock.entity.js';
import { MovimientoStockMapper } from './mappers/movimiento-stock.mapper.js';
import { StockMapper } from './mappers/stock.mapper.js';
import { MovimientoStockRepository } from './repository/movimiento-stock.repository.js';
import { StockRepository } from './repository/stock.repository.js';

export type RegistrarMovimientoParams = {
  productoId: number;
  /** Sucursal cuyo stock se modifica. Obligatoria: el stock es único por (producto, sucursal). */
  sucursalId: number;
  tipo: TipoMovimientoStock;
  cantidad: number;
  tipoReferencia: TipoReferenciaMovimiento;
  referenciaId?: number;
  motivo: string;
  descripcion?: string;
  usuarioId: number;
};

/**
 * Inventario multisucursal: el catálogo (producto) es global, el stock vive en
 * `stock(producto_id, sucursal_id)` y cada movimiento registra su `sucursal_id`.
 */
@Injectable()
export class InventarioService {
  constructor(
    private readonly stockRepository: StockRepository,
    private readonly movimientoStockRepository: MovimientoStockRepository,
    private readonly stockMapper: StockMapper,
    private readonly movimientoStockMapper: MovimientoStockMapper,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async search(
    request: SearchStockRequestDto,
    sucursalId: number,
    viewer?: RequestUser,
  ): Promise<PageDto<StockDTO>> {
    const page = await this.stockRepository.search(request, sucursalId);
    return this.stockMapper.page2Dto(request, page, viewer?.role);
  }

  async findByProductoId(
    productoId: number,
    sucursalId: number,
    viewer?: RequestUser,
  ): Promise<StockDTO> {
    await this.getEntity.findById(Producto, productoId);
    const stock = await this.stockRepository.findByProductoId(
      productoId,
      sucursalId,
    );
    if (!stock) {
      this.errorHandler.throwNotFound(ERRORS.INVENTARIO.STOCK_NO_ENCONTRADO, {
        productoId,
        sucursalId,
      });
    }
    return this.stockMapper.entity2DTO(stock, viewer?.role);
  }

  /**
   * Filas de stock de una sucursal para varios productos (usado para `stockCantidad`
   * en el catálogo cuando el request trae sucursal operativa).
   */
  async findStocksByProductoIds(
    productoIds: number[],
    sucursalId: number,
  ): Promise<Stock[]> {
    return this.stockRepository.findByProductoIds(productoIds, sucursalId);
  }

  async searchMovimientos(
    request: SearchMovimientoStockRequestDto,
    sucursalId: number,
    viewer?: RequestUser,
  ): Promise<PageDto<MovimientoStockDTO>> {
    const page = await this.movimientoStockRepository.search(
      request,
      sucursalId,
    );
    return this.movimientoStockMapper.page2Dto(request, page, viewer?.role);
  }

  async searchMovimientosByProducto(
    productoId: number,
    request: SearchMovimientoStockRequestDto,
    sucursalId: number,
    viewer?: RequestUser,
  ): Promise<PageDto<MovimientoStockDTO>> {
    await this.getEntity.findById(Producto, productoId);
    request.productoId = productoId;
    return this.searchMovimientos(request, sucursalId, viewer);
  }

  /**
   * Crea el registro de stock en 0 de un producto en una sucursal.
   * Idempotente: si ya existe, no hace nada.
   */
  async crearStockInicial(
    productoId: number,
    sucursalId: number,
  ): Promise<StockDTO> {
    try {
      await this.getEntity.findById(Producto, productoId);
      await this.asegurarFilasStock(
        productoId,
        [sucursalId],
        this.stockRepository.manager,
      );
      const stock = await this.stockRepository.findByProductoId(
        productoId,
        sucursalId,
      );
      if (!stock) {
        this.errorHandler.throwNotFound(ERRORS.INVENTARIO.STOCK_NO_ENCONTRADO, {
          productoId,
          sucursalId,
        });
      }
      return this.stockMapper.entity2DTO(stock);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Inicializa stock al crear un producto:
   * - Garantiza una fila en 0 para el producto en TODAS las sucursales activas
   *   (y en la sucursal operativa del actor, que siempre está activa).
   * - Si `cantidad > 0`, aplica un movimiento AJUSTE_ENTRADA SOLO en `sucursalId`
   *   (fuente única de verdad del stock inicial).
   */
  async inicializarStockProducto(
    params: {
      productoId: number;
      cantidad: number;
      usuarioId: number;
      /** Sucursal operativa del actor (header `x-sucursal-id`). */
      sucursalId: number;
    },
    manager: EntityManager,
  ): Promise<void> {
    const activas = await manager.getRepository(Sucursal).find({
      where: { activo: true },
      select: { id: true },
    });
    const sucursalIds = new Set<number>(activas.map((s) => s.id));
    sucursalIds.add(params.sucursalId);

    await this.asegurarFilasStock(
      params.productoId,
      [...sucursalIds],
      manager,
    );

    if (params.cantidad <= 0) return;

    await this.aplicarMovimiento(
      {
        productoId: params.productoId,
        sucursalId: params.sucursalId,
        tipo: TipoMovimientoStock.AJUSTE_ENTRADA,
        cantidad: params.cantidad,
        tipoReferencia: TipoReferenciaMovimiento.AJUSTE,
        motivo: 'Stock inicial al crear producto',
        usuarioId: params.usuarioId,
      },
      manager,
    );
  }

  async crearAjuste(
    request: CreateAjusteStockRequestDto,
    actor: RequestUser,
    sucursalId: number,
  ): Promise<AjusteStockResponseDto> {
    try {
      if (
        request.tipo !== TipoMovimientoStock.AJUSTE_ENTRADA &&
        request.tipo !== TipoMovimientoStock.AJUSTE_SALIDA
      ) {
        this.errorHandler.throwBadRequest(ERRORS.VALIDATION.INVALID_INPUT, {
          tipo: 'Solo se permiten AJUSTE_ENTRADA o AJUSTE_SALIDA',
        });
      }

      await this.getEntity.findById(Producto, request.productoId);

      const result = await this.stockRepository.manager.transaction(
        async (manager) => {
          return this.aplicarMovimiento(
            {
              productoId: request.productoId,
              sucursalId,
              tipo: request.tipo,
              cantidad: request.cantidad,
              tipoReferencia: TipoReferenciaMovimiento.AJUSTE,
              motivo: request.motivo.trim(),
              descripcion: request.descripcion?.trim() || undefined,
              usuarioId: actor.id,
            },
            manager,
          );
        },
      );

      return {
        stock: await this.stockMapper.entity2DTO(result.stock, actor.role),
        movimiento: await this.movimientoStockMapper.entity2DTO(
          result.movimiento,
          actor.role,
        ),
      };
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Registra una entrada por compra (tipo COMPRA) en la sucursal indicada.
   * Debe ejecutarse dentro de la transacción de confirmación de compra.
   */
  async registrarEntradaPorCompra(
    params: {
      productoId: number;
      sucursalId: number;
      cantidad: number;
      compraId: number;
      usuarioId: number;
      motivo?: string;
    },
    manager: EntityManager,
  ): Promise<{ stock: Stock; movimiento: MovimientoStock }> {
    return this.aplicarMovimiento(
      {
        productoId: params.productoId,
        sucursalId: params.sucursalId,
        tipo: TipoMovimientoStock.COMPRA,
        cantidad: params.cantidad,
        tipoReferencia: TipoReferenciaMovimiento.COMPRA,
        referenciaId: params.compraId,
        motivo: params.motivo ?? `Entrada por compra #${params.compraId}`,
        usuarioId: params.usuarioId,
      },
      manager,
    );
  }

  /**
   * Devuelve al stock las unidades de una venta anulada.
   * `sucursalId` debe ser la sucursal de la VENTA (no la del header del actor).
   * Debe ejecutarse dentro de la transacción de anulación.
   */
  async registrarEntradaPorAnulacionVenta(
    params: {
      productoId: number;
      sucursalId: number;
      cantidad: number;
      ventaId: number;
      usuarioId: number;
      motivo?: string;
    },
    manager: EntityManager,
  ): Promise<{ stock: Stock; movimiento: MovimientoStock }> {
    return this.aplicarMovimiento(
      {
        productoId: params.productoId,
        sucursalId: params.sucursalId,
        tipo: TipoMovimientoStock.AJUSTE_ENTRADA,
        cantidad: params.cantidad,
        tipoReferencia: TipoReferenciaMovimiento.VENTA,
        referenciaId: params.ventaId,
        motivo: params.motivo ?? `Anulación venta #${params.ventaId}`,
        usuarioId: params.usuarioId,
      },
      manager,
    );
  }

  /**
   * Registra una salida por venta (tipo VENTA) del stock de la sucursal de la venta.
   * Debe ejecutarse dentro de la transacción de alta de venta.
   */
  async registrarSalidaPorVenta(
    params: {
      productoId: number;
      sucursalId: number;
      cantidad: number;
      ventaId: number;
      usuarioId: number;
      motivo?: string;
    },
    manager: EntityManager,
  ): Promise<{ stock: Stock; movimiento: MovimientoStock }> {
    return this.aplicarMovimiento(
      {
        productoId: params.productoId,
        sucursalId: params.sucursalId,
        tipo: TipoMovimientoStock.VENTA,
        cantidad: params.cantidad,
        tipoReferencia: TipoReferenciaMovimiento.VENTA,
        referenciaId: params.ventaId,
        motivo: params.motivo ?? `Salida por venta #${params.ventaId}`,
        usuarioId: params.usuarioId,
      },
      manager,
    );
  }

  /**
   * Salida de stock (TRANSFERENCIA_SALIDA) en la sucursal ORIGEN de una transferencia.
   * Valida stock suficiente. Debe ejecutarse dentro de la transacción de confirmación.
   */
  async registrarSalidaPorTransferencia(
    params: {
      productoId: number;
      sucursalId: number;
      cantidad: number;
      transferenciaId: number;
      usuarioId: number;
      motivo?: string;
    },
    manager: EntityManager,
  ): Promise<{ stock: Stock; movimiento: MovimientoStock }> {
    return this.aplicarMovimiento(
      {
        productoId: params.productoId,
        sucursalId: params.sucursalId,
        tipo: TipoMovimientoStock.TRANSFERENCIA_SALIDA,
        cantidad: params.cantidad,
        tipoReferencia: TipoReferenciaMovimiento.TRANSFERENCIA,
        referenciaId: params.transferenciaId,
        motivo:
          params.motivo ?? `Salida por transferencia #${params.transferenciaId}`,
        usuarioId: params.usuarioId,
      },
      manager,
    );
  }

  /**
   * Entrada de stock (TRANSFERENCIA_ENTRADA) en la sucursal DESTINO de una transferencia.
   * Debe ejecutarse dentro de la transacción de confirmación.
   */
  async registrarEntradaPorTransferencia(
    params: {
      productoId: number;
      sucursalId: number;
      cantidad: number;
      transferenciaId: number;
      usuarioId: number;
      motivo?: string;
    },
    manager: EntityManager,
  ): Promise<{ stock: Stock; movimiento: MovimientoStock }> {
    return this.aplicarMovimiento(
      {
        productoId: params.productoId,
        sucursalId: params.sucursalId,
        tipo: TipoMovimientoStock.TRANSFERENCIA_ENTRADA,
        cantidad: params.cantidad,
        tipoReferencia: TipoReferenciaMovimiento.TRANSFERENCIA,
        referenciaId: params.transferenciaId,
        motivo:
          params.motivo ??
          `Entrada por transferencia #${params.transferenciaId}`,
        usuarioId: params.usuarioId,
      },
      manager,
    );
  }

  /**
   * Núcleo de movimiento de stock sobre (producto, sucursal).
   * Bloquea (FOR UPDATE) SOLO la fila de stock de esa pareja —no la del producto—,
   * así ventas en sucursales distintas no se serializan entre sí.
   * Si el tipo es salida, valida stock suficiente.
   */
  async aplicarMovimiento(
    params: RegistrarMovimientoParams,
    manager: EntityManager,
  ): Promise<{ stock: Stock; movimiento: MovimientoStock }> {
    const stockRepo = manager.getRepository(Stock);
    const movimientoRepo = manager.getRepository(MovimientoStock);

    const lockStock = () =>
      stockRepo
        .createQueryBuilder('stock')
        .setLock('pessimistic_write')
        .where(
          'stock.producto_id = :productoId AND stock.sucursal_id = :sucursalId',
          { productoId: params.productoId, sucursalId: params.sucursalId },
        )
        .getOne();

    let stock = await lockStock();

    if (!stock) {
      // INSERT IGNORE: si otra transacción creó la fila en paralelo, se re-lee y bloquea.
      await this.asegurarFilasStock(
        params.productoId,
        [params.sucursalId],
        manager,
      );
      stock = await lockStock();
      if (!stock) {
        this.errorHandler.throwNotFound(ERRORS.INVENTARIO.STOCK_NO_ENCONTRADO, {
          productoId: params.productoId,
          sucursalId: params.sucursalId,
        });
      }
    }

    const stockAnterior = stock.cantidad;
    const esEntrada = TIPOS_MOVIMIENTO_ENTRADA.includes(params.tipo);
    const delta = esEntrada ? params.cantidad : -params.cantidad;
    const stockNuevo = stockAnterior + delta;

    if (stockNuevo < 0) {
      this.errorHandler.throwBadRequest(ERRORS.INVENTARIO.STOCK_INSUFICIENTE, {
        productoId: params.productoId,
        sucursalId: params.sucursalId,
        stockActual: stockAnterior,
        cantidadSolicitada: params.cantidad,
      });
    }

    stock.cantidad = stockNuevo;
    await stockRepo.save(stock);

    const movimiento = movimientoRepo.create({
      producto: Producto.fromId(params.productoId),
      sucursal: Sucursal.fromId(params.sucursalId),
      tipo: params.tipo,
      cantidad: params.cantidad,
      stockAnterior,
      stockNuevo,
      tipoReferencia: params.tipoReferencia,
      referenciaId: params.referenciaId,
      motivo: params.motivo,
      descripcion: params.descripcion,
      usuario: Usuario.fromId(params.usuarioId),
    });
    const movimientoSaved = await movimientoRepo.save(movimiento);

    const movimientoCompleto = await movimientoRepo.findOneOrFail({
      where: { id: movimientoSaved.id },
      relations: {
        producto: { categoria: true },
        usuario: true,
        sucursal: true,
      },
    });

    const stockCompleto = await stockRepo.findOneOrFail({
      where: { id: stock.id },
      relations: { producto: { categoria: true }, sucursal: true },
    });

    return { stock: stockCompleto, movimiento: movimientoCompleto };
  }

  /**
   * Crea (si faltan) las filas de stock en 0 del producto para las sucursales indicadas.
   * Idempotente: INSERT IGNORE sobre el UNIQUE `uq_stock_producto_sucursal`.
   */
  private async asegurarFilasStock(
    productoId: number,
    sucursalIds: number[],
    manager: EntityManager,
  ): Promise<void> {
    if (sucursalIds.length === 0) return;
    await manager
      .getRepository(Stock)
      .createQueryBuilder()
      .insert()
      .into(Stock)
      .values(
        sucursalIds.map((sucursalId) => ({
          producto: Producto.fromId(productoId),
          sucursal: Sucursal.fromId(sucursalId),
          cantidad: 0,
        })),
      )
      .orIgnore()
      .execute();
  }
}
