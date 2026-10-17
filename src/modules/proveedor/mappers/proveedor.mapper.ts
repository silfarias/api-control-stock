import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { CreateProveedorRequestDto } from '../dto/create-proveedor-request.dto.js';
import { ProveedorDTO } from '../dto/proveedor.dto.js';
import { SearchProveedorRequestDto } from '../dto/search-proveedor-request.dto.js';
import { UpdateProveedorRequestDto } from '../dto/update-proveedor-request.dto.js';
import { Proveedor } from '../entities/proveedor.entity.js';

@Injectable()
export class ProveedorMapper {
  async entity2DTO(proveedor: Proveedor): Promise<ProveedorDTO> {
    return plainToInstance(ProveedorDTO, proveedor, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchProveedorRequestDto,
    page: PageDto<Proveedor>,
  ): Promise<PageDto<ProveedorDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<ProveedorDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }

  async createDTO2Entity(request: CreateProveedorRequestDto): Promise<Proveedor> {
    const proveedor = new Proveedor();
    proveedor.nombre = request.nombre.trim();
    proveedor.cuit = request.cuit?.trim() || undefined;
    proveedor.telefono = request.telefono?.trim() || undefined;
    proveedor.email = request.email?.toLowerCase().trim() || undefined;
    proveedor.direccion = request.direccion?.trim() || undefined;
    proveedor.activo = request.activo ?? true;
    return proveedor;
  }

  async updateDTO2Entity(
    entity: Proveedor,
    request: UpdateProveedorRequestDto,
  ): Promise<Proveedor> {
    if (request.nombre !== undefined) entity.nombre = request.nombre.trim();
    if (request.cuit !== undefined) {
      entity.cuit = request.cuit?.trim() || undefined;
    }
    if (request.telefono !== undefined) {
      entity.telefono = request.telefono?.trim() || undefined;
    }
    if (request.email !== undefined) {
      entity.email = request.email?.toLowerCase().trim() || undefined;
    }
    if (request.direccion !== undefined) {
      entity.direccion = request.direccion?.trim() || undefined;
    }
    if (request.activo !== undefined) entity.activo = request.activo;
    return entity;
  }
}
