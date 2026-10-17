import { Injectable } from '@nestjs/common';
import { PageDto } from '../../common/dto/page.dto.js';
import { EstadoCompra } from '../../common/enums/estado-compra.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { Producto } from '../producto/entities/producto.entity.js';
import { Proveedor } from '../proveedor/entities/proveedor.entity.js';
import { CompraDTO } from './dto/compra.dto.js';
import { CreateCompraRequestDto } from './dto/create-compra-request.dto.js';
import { CreateItemCompraRequestDto } from './dto/create-item-compra-request.dto.js';
import { SearchCompraRequestDto } from './dto/search-compra-request.dto.js';
import { UpdateCompraRequestDto } from './dto/update-compra-request.dto.js';
import { Compra } from './entities/compra.entity.js';
import { ItemCompra } from './entities/item-compra.entity.js';
import { CompraMapper } from './mappers/compra.mapper.js';
import { CompraRepository } from './repository/compra.repository.js';

@Injectable()
export class CompraService {
  constructor(
    private readonly compraRepository: CompraRepository,
    private readonly compraMapper: CompraMapper,
    private readonly inventarioService: InventarioService,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async findOne(id: number): Promise<CompraDTO> {
    const compra = await this.compraRepository.findByIdWithRelations(id);
    if (!compra) {
      this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, { id });
    }
    return this.compraMapper.entity2DTO(compra);
  }

  async search(request: SearchCompraRequestDto): Promise<PageDto<CompraDTO>> {
    const page = await this.compraRepository.search(request);
    return this.compraMapper.page2Dto(request, page);
  }

  async create(
    request: CreateCompraRequestDto,
    actor: RequestUser,
  ): Promise<CompraDTO> {
    try {
      await this.validarProveedorActivo(request.proveedorId);
      await this.validarProductos(request.items);

      const entity = this.compraMapper.createDTO2Entity(request, actor.id);
      const saved = await this.compraRepository.save(entity);
      return this.findOne(saved.id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async update(
    id: number,
    request: UpdateCompraRequestDto,
  ): Promise<CompraDTO> {
    try {
      const compra = await this.compraRepository.findByIdWithRelations(id);
      if (!compra) {
        this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
          id,
        });
      }
      this.assertBorrador(compra);

      if (request.proveedorId !== undefined) {
        await this.validarProveedorActivo(request.proveedorId);
        compra.proveedor = Proveedor.fromId(request.proveedorId);
      }

      if (request.items) {
        await this.validarProductos(request.items);
        await this.compraRepository.manager.transaction(async (manager) => {
          const itemRepo = manager.getRepository(ItemCompra);
          const compraRepo = manager.getRepository(Compra);

          await itemRepo.delete({ compra: { id } });

          const { items, total } = this.compraMapper.buildItems(request.items!);
          for (const item of items) {
            item.compra = Compra.fromId(id);
            await itemRepo.save(item);
          }

          compra.total = total;
          if (request.proveedorId !== undefined) {
            compra.proveedor = Proveedor.fromId(request.proveedorId);
          }
          await compraRepo.save(compra);
        });
      } else if (request.proveedorId !== undefined) {
        await this.compraRepository.save(compra);
      }

      return this.findOne(id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async confirmar(id: number, actor: RequestUser): Promise<CompraDTO> {
    try {
      await this.compraRepository.manager.transaction(async (manager) => {
        const compraRepo = manager.getRepository(Compra);
        const compra = await compraRepo
          .createQueryBuilder('compra')
          .setLock('pessimistic_write')
          .leftJoinAndSelect('compra.proveedor', 'proveedor')
          .leftJoinAndSelect('compra.items', 'items')
          .leftJoinAndSelect('items.producto', 'producto')
          .where('compra.id = :id', { id })
          .getOne();

        if (!compra) {
          this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
            id,
          });
        }

        if (compra.estado === EstadoCompra.CONFIRMADA) {
          this.errorHandler.throwBadRequest(ERRORS.COMPRA.YA_CONFIRMADA, {
            id,
          });
        }

        if (compra.estado !== EstadoCompra.BORRADOR) {
          this.errorHandler.throwBadRequest(ERRORS.COMPRA.ESTADO_INVALIDO, {
            estado: compra.estado,
          });
        }

        if (!compra.items?.length) {
          this.errorHandler.throwBadRequest(ERRORS.COMPRA.SIN_ITEMS, { id });
        }

        if (compra.proveedor && compra.proveedor.activo === false) {
          this.errorHandler.throwBadRequest(ERRORS.PROVEEDOR.INACTIVO, {
            proveedorId: compra.proveedor.id,
          });
        }

        for (const item of compra.items) {
          await this.inventarioService.registrarEntradaPorCompra(
            {
              productoId: item.producto.id,
              cantidad: item.cantidad,
              compraId: compra.id,
              usuarioId: actor.id,
              motivo: `Compra #${compra.id} — producto ${item.producto.id}`,
            },
            manager,
          );
        }

        compra.estado = EstadoCompra.CONFIRMADA;
        await compraRepo.save(compra);
      });

      return this.findOne(id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async cancelar(id: number): Promise<CompraDTO> {
    try {
      const compra = await this.compraRepository.findByIdWithRelations(id);
      if (!compra) {
        this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
          id,
        });
      }
      this.assertBorrador(compra);
      compra.estado = EstadoCompra.CANCELADA;
      await this.compraRepository.save(compra);
      return this.findOne(id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async remove(id: number): Promise<string> {
    try {
      const compra = await this.compraRepository.findByIdWithRelations(id);
      if (!compra) {
        this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
          id,
        });
      }
      this.assertBorrador(compra);
      await this.compraRepository.softRemove(compra);
      return 'Registro eliminado correctamente';
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  private assertBorrador(compra: Compra): void {
    if (compra.estado !== EstadoCompra.BORRADOR) {
      this.errorHandler.throwBadRequest(ERRORS.COMPRA.ESTADO_INVALIDO, {
        estado: compra.estado,
        mensaje: 'Solo se pueden modificar compras en estado BORRADOR',
      });
    }
  }

  private async validarProveedorActivo(proveedorId: number): Promise<void> {
    const proveedor = await this.getEntity.findById(Proveedor, proveedorId);
    if (!proveedor.activo) {
      this.errorHandler.throwBadRequest(ERRORS.PROVEEDOR.INACTIVO, {
        proveedorId,
      });
    }
  }

  private async validarProductos(
    items: CreateItemCompraRequestDto[],
  ): Promise<void> {
    for (const item of items) {
      await this.getEntity.findById(Producto, item.productoId);
    }
  }
}
