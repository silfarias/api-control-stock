import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { CreateSucursalRequestDto } from '../dto/create-sucursal-request.dto.js';
import { SearchSucursalRequestDto } from '../dto/search-sucursal-request.dto.js';
import { SucursalDTO } from '../dto/sucursal.dto.js';
import { UpdateSucursalRequestDto } from '../dto/update-sucursal-request.dto.js';
import { Sucursal } from '../entities/sucursal.entity.js';

@Injectable()
export class SucursalMapper {
  async entity2DTO(sucursal: Sucursal): Promise<SucursalDTO> {
    return plainToInstance(SucursalDTO, sucursal, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchSucursalRequestDto,
    page: PageDto<Sucursal>,
  ): Promise<PageDto<SucursalDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<SucursalDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }

  async createDTO2Entity(request: CreateSucursalRequestDto): Promise<Sucursal> {
    const sucursal = new Sucursal();
    sucursal.nombre = request.nombre.trim();
    sucursal.codigo = SucursalMapper.normalizeCodigo(request.codigo);
    sucursal.direccion = request.direccion?.trim() || undefined;
    sucursal.telefono = request.telefono?.trim() || undefined;
    sucursal.activo = request.activo ?? true;
    return sucursal;
  }

  async updateDTO2Entity(
    entity: Sucursal,
    request: UpdateSucursalRequestDto,
  ): Promise<Sucursal> {
    if (request.nombre !== undefined) entity.nombre = request.nombre.trim();
    if (request.codigo !== undefined) {
      entity.codigo = SucursalMapper.normalizeCodigo(request.codigo);
    }
    if (request.direccion !== undefined) {
      entity.direccion = request.direccion?.trim() || undefined;
    }
    if (request.telefono !== undefined) {
      entity.telefono = request.telefono?.trim() || undefined;
    }
    if (request.activo !== undefined) entity.activo = request.activo;
    return entity;
  }

  /** Códigos siempre en mayúsculas y sin espacios en los extremos. */
  static normalizeCodigo(codigo: string): string {
    return codigo.trim().toUpperCase();
  }
}
