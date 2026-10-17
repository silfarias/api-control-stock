import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { CategoriaDTO } from '../dto/categoria.dto.js';
import { CreateCategoriaRequestDto } from '../dto/create-categoria-request.dto.js';
import { SearchCategoriaRequestDto } from '../dto/search-categoria-request.dto.js';
import { UpdateCategoriaRequestDto } from '../dto/update-categoria-request.dto.js';
import { Categoria } from '../entities/categoria.entity.js';

@Injectable()
export class CategoriaMapper {
  async entity2DTO(categoria: Categoria): Promise<CategoriaDTO> {
    return plainToInstance(CategoriaDTO, categoria, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchCategoriaRequestDto,
    page: PageDto<Categoria>,
  ): Promise<PageDto<CategoriaDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<CategoriaDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }

  async createDTO2Entity(request: CreateCategoriaRequestDto): Promise<Categoria> {
    const categoria = new Categoria();
    categoria.nombre = request.nombre.trim();
    if (request.descripcion !== undefined) {
      categoria.descripcion = request.descripcion?.trim() || undefined;
    }
    return categoria;
  }

  async updateDTO2Entity(
    entity: Categoria,
    request: UpdateCategoriaRequestDto,
  ): Promise<Categoria> {
    if (request.nombre !== undefined) {
      entity.nombre = request.nombre.trim();
    }
    if (request.descripcion !== undefined) {
      entity.descripcion = request.descripcion?.trim() || undefined;
    }
    return entity;
  }
}
