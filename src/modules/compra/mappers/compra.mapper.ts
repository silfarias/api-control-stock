import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { EstadoCompra } from '../../../common/enums/estado-compra.enum.js';
import { Producto } from '../../producto/entities/producto.entity.js';
import { Proveedor } from '../../proveedor/entities/proveedor.entity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import { CompraDTO } from '../dto/compra.dto.js';
import { CreateCompraRequestDto } from '../dto/create-compra-request.dto.js';
import { CreateItemCompraRequestDto } from '../dto/create-item-compra-request.dto.js';
import { SearchCompraRequestDto } from '../dto/search-compra-request.dto.js';
import { Compra } from '../entities/compra.entity.js';
import { ItemCompra } from '../entities/item-compra.entity.js';

@Injectable()
export class CompraMapper {
  async entity2DTO(compra: Compra): Promise<CompraDTO> {
    return plainToInstance(CompraDTO, compra, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchCompraRequestDto,
    page: PageDto<Compra>,
  ): Promise<PageDto<CompraDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<CompraDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }

  buildItems(itemsDto: CreateItemCompraRequestDto[]): {
    items: ItemCompra[];
    total: number;
  } {
    let total = 0;
    const items = itemsDto.map((itemDto) => {
      const subtotal = Number(
        (itemDto.cantidad * itemDto.costoUnitario).toFixed(2),
      );
      total += subtotal;
      const item = new ItemCompra();
      item.producto = Producto.fromId(itemDto.productoId);
      item.cantidad = itemDto.cantidad;
      item.costoUnitario = itemDto.costoUnitario;
      item.subtotal = subtotal;
      return item;
    });
    return { items, total: Number(total.toFixed(2)) };
  }

  createDTO2Entity(
    request: CreateCompraRequestDto,
    usuarioId: number,
  ): Compra {
    const { items, total } = this.buildItems(request.items);
    const compra = new Compra();
    compra.proveedor = Proveedor.fromId(request.proveedorId);
    compra.usuario = Usuario.fromId(usuarioId);
    compra.estado = EstadoCompra.BORRADOR;
    compra.total = total;
    compra.items = items;
    return compra;
  }
}
