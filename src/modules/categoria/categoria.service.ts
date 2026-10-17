import { Injectable } from '@nestjs/common';
import { PageDto } from '../../common/dto/page.dto.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { CategoriaDTO } from './dto/categoria.dto.js';
import { CreateCategoriaRequestDto } from './dto/create-categoria-request.dto.js';
import { SearchCategoriaRequestDto } from './dto/search-categoria-request.dto.js';
import { UpdateCategoriaRequestDto } from './dto/update-categoria-request.dto.js';
import { Categoria } from './entities/categoria.entity.js';
import { CategoriaMapper } from './mappers/categoria.mapper.js';
import { CategoriaRepository } from './repository/categoria.repository.js';

@Injectable()
export class CategoriaService {
  constructor(
    private readonly categoriaMapper: CategoriaMapper,
    private readonly categoriaRepository: CategoriaRepository,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async findOne(id: number): Promise<CategoriaDTO> {
    const categoria = await this.getEntity.findById(Categoria, id);
    return this.categoriaMapper.entity2DTO(categoria);
  }

  async search(
    request: SearchCategoriaRequestDto,
  ): Promise<PageDto<CategoriaDTO>> {
    const page = await this.categoriaRepository.search(request);
    return this.categoriaMapper.page2Dto(request, page);
  }

  async create(request: CreateCategoriaRequestDto): Promise<CategoriaDTO> {
    try {
      const entity = await this.categoriaMapper.createDTO2Entity(request);
      const saved = await this.categoriaRepository.save(entity);
      return this.categoriaMapper.entity2DTO(saved);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async update(
    id: number,
    request: UpdateCategoriaRequestDto,
  ): Promise<CategoriaDTO> {
    try {
      const categoria = await this.getEntity.findById(Categoria, id);
      const updated = await this.categoriaMapper.updateDTO2Entity(
        categoria,
        request,
      );
      await this.categoriaRepository.save(updated);
      return this.categoriaMapper.entity2DTO(updated);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async remove(id: number): Promise<string> {
    try {
      await this.categoriaRepository.manager.transaction(async (manager) => {
        const repo = manager.getRepository(Categoria);
        const categoria = await repo.findOne({ where: { id } });
        if (!categoria) {
          this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
            id,
          });
        }
        await repo.softRemove(categoria);
      });
      return 'Registro eliminado correctamente';
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }
}
