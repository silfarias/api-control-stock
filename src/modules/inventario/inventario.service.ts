import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PageDto } from '../../common/dto/page.dto.js';
import { TipoMovimientoStock } from '../../common/enums/tipo-movimiento-stock.enum.js';
import { TipoReferenciaMovimiento } from '../../common/enums/tipo-referencia-movimiento.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { Producto } from '../producto/entities/producto.entity.js';
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
  tipo: TipoMovimientoStock;
  cantidad: number;
  tipoReferencia: TipoReferenciaMovimiento;
  referenciaId?: number;
  motivo: string;
  descripcion?: string;
  usuarioId: number;
};

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

  async search(request: SearchStockRequestDto): Promise<PageDto<StockDTO>> {
    const page = await this.stockRepository.search(request);
    return this.stockMapper.page2Dto(request, page);
  }

  async findByProductoId(productoId: number): Promise<StockDTO> {
    await this.getEntity.findById(Producto, productoId);
    const stock = await this.stockRepository.findByProductoId(productoId);
    if (!stock) {
      this.errorHandler.throwNotFound(ERRORS.INVENTARIO.STOCK_NO_ENCONTRADO, {
        productoId,
      });
    }
    return this.stockMapper.entity2DTO(stock);
  }

  async searchMovimientos(
    request: SearchMovimientoStockRequestDto,
  ): Promise<PageDto<MovimientoStockDTO>> {
    const page = await this.movimientoStockRepository.search(request);
    return this.movimientoStockMapper.page2Dto(request, page);
  }

  async searchMovimientosByProducto(
    productoId: number,
    request: SearchMovimientoStockRequestDto,
  ): Promise<PageDto<MovimientoStockDTO>> {
    await this.getEntity.findById(Producto, productoId);
    request.productoId = productoId;
    return this.searchMovimientos(request);
  }

  /**
   * Crea el registro de stock en 0 para un producto nuevo.
   * Idempotente: si ya existe, no hace nada.
   */
  async crearStockInicial(productoId: number): Promise<StockDTO> {
    try {
      const existente = await this.stockRepository.findByProductoId(productoId);
      if (existente) {
        return this.stockMapper.entity2DTO(existente);
      }

      await this.getEntity.findById(Producto, productoId);
      const stock = new Stock();
      stock.producto = Producto.fromId(productoId);
      stock.cantidad = 0;
      const saved = await this.stockRepository.save(stock);
      const withRelations = await this.stockRepository.findByProductoId(
        saved.producto?.id ?? productoId,
      );
      return this.stockMapper.entity2DTO(withRelations ?? saved);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Inicializa stock al crear un producto.
   * cantidad 0 → solo registro en 0.
   * cantidad > 0 → movimiento AJUSTE_ENTRADA (fuente única de verdad).
   */
  async inicializarStockProducto(
    params: {
      productoId: number;
      cantidad: number;
      usuarioId: number;
    },
    manager: EntityManager,
  ): Promise<void> {
    if (params.cantidad <= 0) {
      const stockRepo = manager.getRepository(Stock);
      const existente = await stockRepo.findOne({
        where: { producto: { id: params.productoId } },
      });
      if (!existente) {
        await stockRepo.save(
          stockRepo.create({
            producto: Producto.fromId(params.productoId),
            cantidad: 0,
          }),
        );
      }
      return;
    }

    await this.aplicarMovimiento(
      {
        productoId: params.productoId,
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
        stock: await this.stockMapper.entity2DTO(result.stock),
        movimiento: await this.movimientoStockMapper.entity2DTO(
          result.movimiento,
        ),
      };
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Registra una entrada por compra (tipo COMPRA).
   * Debe ejecutarse dentro de la transacción de confirmación de compra.
   */
  async registrarEntradaPorCompra(
    params: {
      productoId: number;
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
   * Registra una salida por venta (tipo VENTA).
   * Debe ejecutarse dentro de la transacción de alta de venta.
   */
  async registrarSalidaPorVenta(
    params: {
      productoId: number;
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
   * Núcleo de movimiento de stock. Si el tipo es salida, valida stock suficiente.
   */
  async aplicarMovimiento(
    params: RegistrarMovimientoParams,
    manager: EntityManager,
  ): Promise<{ stock: Stock; movimiento: MovimientoStock }> {
    const stockRepo = manager.getRepository(Stock);
    const movimientoRepo = manager.getRepository(MovimientoStock);

    let stock = await stockRepo
      .createQueryBuilder('stock')
      .setLock('pessimistic_write')
      .leftJoinAndSelect('stock.producto', 'producto')
      .where('producto.id = :productoId', { productoId: params.productoId })
      .getOne();

    if (!stock) {
      stock = stockRepo.create({
        producto: Producto.fromId(params.productoId),
        cantidad: 0,
      });
      stock = await stockRepo.save(stock);
      stock = await stockRepo.findOneOrFail({
        where: { id: stock.id },
        relations: { producto: true },
      });
    }

    const stockAnterior = stock.cantidad;
    const esEntrada =
      params.tipo === TipoMovimientoStock.COMPRA ||
      params.tipo === TipoMovimientoStock.AJUSTE_ENTRADA;
    const delta = esEntrada ? params.cantidad : -params.cantidad;
    const stockNuevo = stockAnterior + delta;

    if (stockNuevo < 0) {
      this.errorHandler.throwBadRequest(ERRORS.INVENTARIO.STOCK_INSUFICIENTE, {
        productoId: params.productoId,
        stockActual: stockAnterior,
        cantidadSolicitada: params.cantidad,
      });
    }

    stock.cantidad = stockNuevo;
    await stockRepo.save(stock);

    const movimiento = movimientoRepo.create({
      producto: Producto.fromId(params.productoId),
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
      },
    });

    const stockCompleto = await stockRepo.findOneOrFail({
      where: { id: stock.id },
      relations: { producto: { categoria: true } },
    });

    return { stock: stockCompleto, movimiento: movimientoCompleto };
  }
}
