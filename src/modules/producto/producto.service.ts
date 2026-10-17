import { Injectable } from '@nestjs/common';
import { PageDto } from '../../common/dto/page.dto.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { renameOnDelete } from '../../common/utils/rename-on-delete.js';
import { Categoria } from '../categoria/entities/categoria.entity.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { CreateProductoRequestDto } from './dto/create-producto-request.dto.js';
import { CreateProductosBulkRequestDto } from './dto/create-productos-bulk-request.dto.js';
import { ProductoDTO } from './dto/producto.dto.js';
import { SearchProductoRequestDto } from './dto/search-producto-request.dto.js';
import { UpdateProductoRequestDto } from './dto/update-producto-request.dto.js';
import { Producto } from './entities/producto.entity.js';
import { ProductoMapper } from './mappers/producto.mapper.js';
import { ProductoRepository } from './repository/producto.repository.js';

@Injectable()
export class ProductoService {
  constructor(
    private readonly productoMapper: ProductoMapper,
    private readonly productoRepository: ProductoRepository,
    private readonly inventarioService: InventarioService,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async findOne(id: number): Promise<ProductoDTO> {
    const producto = await this.getEntity.findById(Producto, id, {
      categoria: true,
    });
    return this.productoMapper.entity2DTO(producto);
  }

  async search(
    request: SearchProductoRequestDto,
  ): Promise<PageDto<ProductoDTO>> {
    const page = await this.productoRepository.search(request);
    return this.productoMapper.page2Dto(request, page);
  }

  async create(
    request: CreateProductoRequestDto,
    actor: RequestUser,
  ): Promise<ProductoDTO> {
    try {
      await this.getEntity.findById(Categoria, request.categoriaId);

      const savedId = await this.productoRepository.manager.transaction(
        async (manager) => {
          const entity = await this.productoMapper.createDTO2Entity(request);
          const saved = await manager.getRepository(Producto).save(entity);
          await this.inventarioService.inicializarStockProducto(
            {
              productoId: saved.id,
              cantidad: request.stock?.cantidad ?? 0,
              usuarioId: actor.id,
            },
            manager,
          );
          return saved.id;
        },
      );

      return this.findOne(savedId);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async createBulk(
    request: CreateProductosBulkRequestDto,
    actor: RequestUser,
  ): Promise<ProductoDTO[]> {
    try {
      this.validarUniquesEnBatch(request.productos);

      const categoriaIds = [
        ...new Set(request.productos.map((p) => p.categoriaId)),
      ];
      for (const categoriaId of categoriaIds) {
        await this.getEntity.findById(Categoria, categoriaId);
      }

      const ids = await this.productoRepository.manager.transaction(
        async (manager) => {
          const repo = manager.getRepository(Producto);
          const createdIds: number[] = [];

          for (const item of request.productos) {
            const entity = await this.productoMapper.createDTO2Entity(item);
            const saved = await repo.save(entity);
            await this.inventarioService.inicializarStockProducto(
              {
                productoId: saved.id,
                cantidad: item.stock?.cantidad ?? 0,
                usuarioId: actor.id,
              },
              manager,
            );
            createdIds.push(saved.id);
          }

          return createdIds;
        },
      );

      return Promise.all(ids.map((id) => this.findOne(id)));
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async update(
    id: number,
    request: UpdateProductoRequestDto,
  ): Promise<ProductoDTO> {
    try {
      const producto = await this.getEntity.findById(Producto, id, {
        categoria: true,
      });

      if (request.categoriaId !== undefined) {
        await this.getEntity.findById(Categoria, request.categoriaId);
      }

      const updated = await this.productoMapper.updateDTO2Entity(
        producto,
        request,
      );
      await this.productoRepository.save(updated);
      return this.findOne(id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async remove(id: number): Promise<string> {
    try {
      await this.productoRepository.manager.transaction(async (manager) => {
        const repo = manager.getRepository(Producto);
        const producto = await repo.findOne({ where: { id } });
        if (!producto) {
          this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
            id,
          });
        }
        // Libera uniques de codigo / codigoBarras al soft-delete
        producto.codigo = renameOnDelete(producto.codigo).slice(0, 80);
        producto.codigoBarras = renameOnDelete(producto.codigoBarras).slice(
          0,
          80,
        );
        await repo.save(producto);
        await repo.softRemove(producto);
      });
      return 'Registro eliminado correctamente';
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  private validarUniquesEnBatch(productos: CreateProductoRequestDto[]): void {
    const codigos = new Set<string>();
    const barras = new Set<string>();

    for (const producto of productos) {
      const codigo = producto.codigo.trim().toLowerCase();
      const codigoBarras = producto.codigoBarras.trim().toLowerCase();

      if (codigos.has(codigo)) {
        this.errorHandler.throwBadRequest(ERRORS.VALIDATION.INVALID_INPUT, {
          codigo: `Código duplicado en el lote: ${producto.codigo}`,
        });
      }
      if (barras.has(codigoBarras)) {
        this.errorHandler.throwBadRequest(ERRORS.VALIDATION.INVALID_INPUT, {
          codigoBarras: `Código de barras duplicado en el lote: ${producto.codigoBarras}`,
        });
      }

      codigos.add(codigo);
      barras.add(codigoBarras);
    }
  }
}
