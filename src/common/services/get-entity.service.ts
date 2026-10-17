import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  EntityManager,
  EntityTarget,
  FindOptionsWhere,
  FindOptionsRelations,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { ERRORS } from '../errors/errors-codes.js';
import { ErrorHandlerService } from './error-handler.service.js';

@Injectable()
export class GetEntityService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  private getRepository<T extends ObjectLiteral>(
    entityClass: EntityTarget<T>,
  ): Repository<T> {
    return this.entityManager.getRepository(entityClass);
  }

  private getEntityName<T extends ObjectLiteral>(entityClass: EntityTarget<T>): string {
    if (typeof entityClass === 'function') return entityClass.name;
    if (typeof entityClass === 'string') return entityClass;
    return 'unknown_entity';
  }

  /**
   * Busca una entidad por su id. Lanza NotFoundException si no existe.
   */
  async findById<T extends ObjectLiteral>(
    entityClass: EntityTarget<T>,
    id: number,
    relations?: FindOptionsRelations<T>,
  ): Promise<T> {
    const repository = this.getRepository(entityClass);
    const found = await repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
      relations,
    });
    if (!found) {
      this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
        entity: this.getEntityName(entityClass),
        id,
      });
    }
    return found;
  }

  /**
   * Busca una entidad por un criterio (objeto where).
   * Retorna null si no encuentra.
   */
  async findOneBy<T extends ObjectLiteral>(
    entityClass: EntityTarget<T>,
    criteria: FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T>,
  ): Promise<T | null> {
    const repository = this.getRepository(entityClass);
    const found = await repository.findOne({
      where: criteria,
      relations,
    });
    return found;
  }

  /**
   * Busca una entidad por un criterio. Lanza NotFoundException si no existe.
   */
  async findOneByOrFail<T extends ObjectLiteral>(
    entityClass: EntityTarget<T>,
    criteria: FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T>,
  ): Promise<T> {
    const repository = this.getRepository(entityClass);
    const found = await repository.findOne({
      where: criteria,
      relations,
    });
    if (!found) {
      this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
        entity: this.getEntityName(entityClass),
        criteria,
      });
    }
    return found;
  }
}