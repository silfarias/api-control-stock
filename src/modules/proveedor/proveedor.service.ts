import { Injectable } from '@nestjs/common';
import { PageDto } from '../../common/dto/page.dto.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { CreateProveedorRequestDto } from './dto/create-proveedor-request.dto.js';
import { ProveedorDTO } from './dto/proveedor.dto.js';
import { SearchProveedorRequestDto } from './dto/search-proveedor-request.dto.js';
import { UpdateProveedorRequestDto } from './dto/update-proveedor-request.dto.js';
import { Proveedor } from './entities/proveedor.entity.js';
import { ProveedorMapper } from './mappers/proveedor.mapper.js';
import { ProveedorRepository } from './repository/proveedor.repository.js';

@Injectable()
export class ProveedorService {
  constructor(
    private readonly proveedorMapper: ProveedorMapper,
    private readonly proveedorRepository: ProveedorRepository,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async findOne(id: number): Promise<ProveedorDTO> {
    const proveedor = await this.getEntity.findById(Proveedor, id);
    return this.proveedorMapper.entity2DTO(proveedor);
  }

  async search(
    request: SearchProveedorRequestDto,
  ): Promise<PageDto<ProveedorDTO>> {
    const page = await this.proveedorRepository.search(request);
    return this.proveedorMapper.page2Dto(request, page);
  }

  async create(request: CreateProveedorRequestDto): Promise<ProveedorDTO> {
    try {
      const entity = await this.proveedorMapper.createDTO2Entity(request);
      const saved = await this.proveedorRepository.save(entity);
      return this.proveedorMapper.entity2DTO(saved);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async update(
    id: number,
    request: UpdateProveedorRequestDto,
  ): Promise<ProveedorDTO> {
    try {
      const proveedor = await this.getEntity.findById(Proveedor, id);
      const updated = await this.proveedorMapper.updateDTO2Entity(
        proveedor,
        request,
      );
      await this.proveedorRepository.save(updated);
      return this.proveedorMapper.entity2DTO(updated);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async remove(id: number): Promise<string> {
    try {
      await this.proveedorRepository.manager.transaction(async (manager) => {
        const repo = manager.getRepository(Proveedor);
        const proveedor = await repo.findOne({ where: { id } });
        if (!proveedor) {
          this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
            id,
          });
        }
        await repo.softRemove(proveedor);
      });
      return 'Registro eliminado correctamente';
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }
}
