import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { Categoria } from '../../categoria/entities/categoria.entity.js';
import { CreateProductoRequestDto } from '../dto/create-producto-request.dto.js';
import { ProductoDTO } from '../dto/producto.dto.js';
import { SearchProductoRequestDto } from '../dto/search-producto-request.dto.js';
import { UpdateProductoRequestDto } from '../dto/update-producto-request.dto.js';
import { Producto } from '../entities/producto.entity.js';

@Injectable()
export class ProductoMapper {
  async entity2DTO(producto: Producto): Promise<ProductoDTO> {
    return plainToInstance(ProductoDTO, producto, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchProductoRequestDto,
    page: PageDto<Producto>,
  ): Promise<PageDto<ProductoDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<ProductoDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }

  async createDTO2Entity(request: CreateProductoRequestDto): Promise<Producto> {
    const producto = new Producto();
    producto.nombre = request.nombre.trim();
    if (request.descripcion !== undefined) {
      producto.descripcion = request.descripcion?.trim() || undefined;
    }
    producto.codigo = request.codigo.trim();
    producto.codigoBarras = request.codigoBarras.trim();
    producto.categoria = Categoria.fromId(request.categoriaId);
    producto.precioCosto = request.precioCosto;
    producto.precioVenta = request.precioVenta;
    producto.minimoStock = request.minimoStock;
    return producto;
  }

  async updateDTO2Entity(
    entity: Producto,
    request: UpdateProductoRequestDto,
  ): Promise<Producto> {
    if (request.nombre !== undefined) entity.nombre = request.nombre.trim();
    if (request.descripcion !== undefined) {
      entity.descripcion = request.descripcion?.trim() || undefined;
    }
    if (request.codigo !== undefined) entity.codigo = request.codigo.trim();
    if (request.codigoBarras !== undefined) {
      entity.codigoBarras = request.codigoBarras.trim();
    }
    if (request.categoriaId !== undefined) {
      entity.categoria = Categoria.fromId(request.categoriaId);
    }
    if (request.precioCosto !== undefined) {
      entity.precioCosto = request.precioCosto;
    }
    if (request.precioVenta !== undefined) {
      entity.precioVenta = request.precioVenta;
    }
    if (request.minimoStock !== undefined) {
      entity.minimoStock = request.minimoStock;
    }
    return entity;
  }
}
