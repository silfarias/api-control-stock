import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PageDto } from '../../common/dto/page.dto.js';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { GetEntityService } from '../../common/services/get-entity.service.js';
import { PasswordHelper } from '../../common/utils/password-helper.js';
import { renameOnDelete } from '../../common/utils/rename-on-delete.js';
import { CreateUsuarioRequestDto } from './dto/create-usuario-request.dto.js';
import { SearchUsuarioRequestDto } from './dto/search-usuario-request.dto.js';
import { UpdateUsuarioRequestDto } from './dto/update-usuario-request.dto.js';
import { UsuarioDTO } from './dto/usuario.dto.js';
import { Usuario } from './entities/usuario.entity.js';
import { UsuarioMapper } from './mappers/usuario.mapper.js';
import { UsuarioRepository } from './repository/usuario.repository.js';

@Injectable()
export class UsuarioService {
  private readonly passwordHelper = new PasswordHelper();

  constructor(
    private readonly usuarioMapper: UsuarioMapper,
    private readonly usuarioRepository: UsuarioRepository,
    private readonly getEntity: GetEntityService,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async findOne(id: number): Promise<UsuarioDTO> {
    const usuario = await this.getEntity.findById(Usuario, id);
    return this.usuarioMapper.entity2DTO(usuario);
  }

  async findByEmail(email: string): Promise<UsuarioDTO | null> {
    const usuario = await this.usuarioRepository.findByEmail(email);
    if (!usuario) return null;
    return this.usuarioMapper.entity2DTO(usuario);
  }

  async login(email: string, password: string): Promise<UsuarioDTO> {
    const usuario = await this.usuarioRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!usuario) {
      this.errorHandler.throwUnauthorized(
        ERRORS.AUTHENTICATION.INVALID_CREDENTIALS,
      );
    }

    const valid = await this.passwordHelper.validate(password, usuario.password);
    if (!valid) {
      this.errorHandler.throwUnauthorized(
        ERRORS.AUTHENTICATION.INVALID_CREDENTIALS,
      );
    }

    return this.usuarioMapper.entity2DTO(usuario);
  }

  async changePassword(userId: number, newPassword: string): Promise<UsuarioDTO> {
    try {
      const usuario = await this.getEntity.findById(Usuario, userId);
      usuario.password = await this.passwordHelper.hashPassword(newPassword);
      const saved = await this.usuarioRepository.save(usuario);
      return this.usuarioMapper.entity2DTO(saved);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async search(request: SearchUsuarioRequestDto): Promise<PageDto<UsuarioDTO>> {
    const page = await this.usuarioRepository.search(request);
    return this.usuarioMapper.page2Dto(request, page);
  }

  async create(request: CreateUsuarioRequestDto): Promise<UsuarioDTO> {
    try {
      const entity = await this.usuarioMapper.createDTO2Entity(request);
      const saved = await this.usuarioRepository.save(entity);
      return this.usuarioMapper.entity2DTO(saved);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async update(
    id: number,
    request: UpdateUsuarioRequestDto,
    actor: RequestUser,
  ): Promise<UsuarioDTO> {
    try {
      const esAdmin = actor.role === UsuarioRole.ADMIN;
      const esPropio = actor.id === id;

      if (!esAdmin && !esPropio) {
        this.errorHandler.throwForbidden(
          ERRORS.AUTHORIZATION.INSUFFICIENT_PERMISSIONS,
          { details: 'Solo podés actualizar tu propio usuario' },
        );
      }

      if (!esAdmin && request.role !== undefined) {
        this.errorHandler.throwForbidden(
          ERRORS.AUTHORIZATION.INSUFFICIENT_PERMISSIONS,
          { details: 'No podés cambiar el rol de usuario' },
        );
      }

      return await this.usuarioRepository.manager.transaction(async (manager) => {
        const repo = manager.getRepository(Usuario);
        const usuario = await repo
          .createQueryBuilder('usuario')
          .setLock('pessimistic_write')
          .where('usuario.id = :id', { id })
          .getOne();

        if (!usuario) {
          this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
            id,
          });
        }

        const degradarUltimoAdmin =
          esAdmin &&
          usuario.role === UsuarioRole.ADMIN &&
          request.role !== undefined &&
          request.role !== UsuarioRole.ADMIN;

        if (degradarUltimoAdmin) {
          await this.ensureNotLastAdmin(manager);
        }

        const updated = await this.usuarioMapper.updateDTO2Entity(
          usuario,
          request,
        );
        const saved = await repo.save(updated);
        return this.usuarioMapper.entity2DTO(saved);
      });
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async remove(id: number, _actor: { id?: number } = {}): Promise<string> {
    try {
      await this.usuarioRepository.manager.transaction(async (manager) => {
        const repo = manager.getRepository(Usuario);
        const usuario = await repo
          .createQueryBuilder('usuario')
          .setLock('pessimistic_write')
          .where('usuario.id = :id', { id })
          .getOne();

        if (!usuario) {
          this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
            id,
          });
        }

        if (usuario.role === UsuarioRole.ADMIN) {
          await this.ensureNotLastAdmin(manager);
        }

        // Libera unique de email al soft-delete (respeta length de columna)
        usuario.email = renameOnDelete(usuario.email).slice(0, 180);
        await repo.save(usuario);
        await repo.softRemove(usuario);
      });
      return 'Registro eliminado correctamente';
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Bloquea filas ADMIN (FOR UPDATE) y aborta si solo queda uno.
   * Serializa degradaciones/eliminaciones concurrentes del último admin.
   */
  private async ensureNotLastAdmin(manager: EntityManager): Promise<void> {
    const repo = manager.getRepository(Usuario);
    const admins = await repo
      .createQueryBuilder('usuario')
      .setLock('pessimistic_write')
      .where('usuario.role = :role', { role: UsuarioRole.ADMIN })
      .getMany();

    if (admins.length <= 1) {
      this.errorHandler.throwForbidden(ERRORS.USER.CANNOT_REMOVE_LAST_ADMIN);
    }
  }
}
