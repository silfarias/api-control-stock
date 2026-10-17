import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PageDto } from '../../../common/dto/page.dto.js';
import {
  applySearchQueryOptions,
  applyTextSearch,
} from '../../../common/utils/search-query.util.js';
import { SearchUsuarioRequestDto } from '../dto/search-usuario-request.dto.js';
import { Usuario } from '../entities/usuario.entity.js';

@Injectable()
export class UsuarioRepository extends Repository<Usuario> {
  constructor(private readonly dataSource: DataSource) {
    super(Usuario, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async search(request: SearchUsuarioRequestDto): Promise<PageDto<Usuario>> {
    const queryBuilder: SelectQueryBuilder<Usuario> =
      this.createQueryBuilder('usuario');

    if (request.id) {
      queryBuilder.andWhere('usuario.id = :id', { id: request.id });
    }

    if (request.nombre) {
      queryBuilder.andWhere('LOWER(usuario.nombre) LIKE LOWER(:nombre)', {
        nombre: `%${request.nombre}%`,
      });
    }

    if (request.email) {
      queryBuilder.andWhere('LOWER(usuario.email) = LOWER(:email)', {
        email: request.email,
      });
    }

    if (request.role) {
      queryBuilder.andWhere('usuario.role = :role', { role: request.role });
    }

    applyTextSearch(queryBuilder, request.q, [
      'usuario.nombre',
      'usuario.email',
    ]);

    applySearchQueryOptions(queryBuilder, request, 'id');

    const [list, count] = await queryBuilder.getManyAndCount();
    return new PageDto<Usuario>(list, count);
  }
}
