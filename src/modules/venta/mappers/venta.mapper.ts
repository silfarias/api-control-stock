import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { EstadoVenta } from '../../../common/enums/estado-venta.enum.js';
import { Producto } from '../../producto/entities/producto.entity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import { CreateVentaRequestDto } from '../dto/create-venta-request.dto.js';
import { SearchVentaRequestDto } from '../dto/search-venta-request.dto.js';
import { VentaDTO } from '../dto/venta.dto.js';
import { ItemVenta } from '../entities/item-venta.entity.js';
import { Venta } from '../entities/venta.entity.js';

export type ItemVentaConPrecio = {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
};

@Injectable()
export class VentaMapper {
  async entity2DTO(venta: Venta): Promise<VentaDTO> {
    return plainToInstance(VentaDTO, venta, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchVentaRequestDto,
    page: PageDto<Venta>,
  ): Promise<PageDto<VentaDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<VentaDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }

  buildFromPrecios(
    request: CreateVentaRequestDto,
    usuarioId: number,
    itemsConPrecio: ItemVentaConPrecio[],
  ): Venta {
    let total = 0;
    const items = itemsConPrecio.map((itemDto) => {
      const subtotal = Number(
        (itemDto.cantidad * itemDto.precioUnitario).toFixed(2),
      );
      total += subtotal;
      const item = new ItemVenta();
      item.producto = Producto.fromId(itemDto.productoId);
      item.cantidad = itemDto.cantidad;
      item.precioUnitario = itemDto.precioUnitario;
      item.subtotal = subtotal;
      return item;
    });

    const venta = new Venta();
    venta.usuario = Usuario.fromId(usuarioId);
    venta.metodoPago = request.metodoPago;
    venta.estado = EstadoVenta.CONFIRMADA;
    venta.total = Number(total.toFixed(2));
    venta.items = items;
    return venta;
  }
}
