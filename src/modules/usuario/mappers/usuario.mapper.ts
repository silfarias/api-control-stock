import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { PasswordHelper } from '../../../common/utils/password-helper.js';
import { CreateUsuarioRequestDto } from '../dto/create-usuario-request.dto.js';
import { SearchUsuarioRequestDto } from '../dto/search-usuario-request.dto.js';
import { UpdateUsuarioRequestDto } from '../dto/update-usuario-request.dto.js';
import { UsuarioDTO } from '../dto/usuario.dto.js';
import { Usuario } from '../entities/usuario.entity.js';

@Injectable()
export class UsuarioMapper {
  private readonly passwordHelper = new PasswordHelper();

  async entity2DTO(usuario: Usuario): Promise<UsuarioDTO> {
    return plainToInstance(UsuarioDTO, usuario, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchUsuarioRequestDto,
    page: PageDto<Usuario>,
  ): Promise<PageDto<UsuarioDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<UsuarioDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }

  async createDTO2Entity(request: CreateUsuarioRequestDto): Promise<Usuario> {
    const usuario = new Usuario();
    usuario.nombre = request.nombre;
    usuario.email = request.email.toLowerCase().trim();
    usuario.password = await this.passwordHelper.hashPassword(request.password);
    usuario.role = request.role;
    return usuario;
  }

  async updateDTO2Entity(
    entity: Usuario,
    request: UpdateUsuarioRequestDto,
  ): Promise<Usuario> {
    if (request.nombre !== undefined) entity.nombre = request.nombre;
    if (request.email !== undefined) {
      entity.email = request.email.toLowerCase().trim();
    }
    if (request.role !== undefined) entity.role = request.role;
    if (request.password) {
      entity.password = await this.passwordHelper.hashPassword(request.password);
    }
    return entity;
  }
}
