import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { Sucursal } from './entities/sucursal.entity.js';
import { UsuarioSucursal } from './entities/usuario-sucursal.entity.js';

/** Valor crudo del header `x-sucursal-id` (Express puede entregar string o string[]). */
export type SucursalHeaderValue =
  | string
  | string[]
  | number
  | null
  | undefined;

/**
 * Reglas de acceso a sucursales:
 * - ADMIN: puede operar en cualquier sucursal activa.
 * - EMPLEADO: solo en sucursales activas que tenga asignadas (`usuario_sucursal`).
 */
@Injectable()
export class SucursalAccessService {
  constructor(
    @InjectRepository(Sucursal)
    private readonly sucursalRepository: Repository<Sucursal>,
    @InjectRepository(UsuarioSucursal)
    private readonly usuarioSucursalRepository: Repository<UsuarioSucursal>,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  /**
   * Verifica que la sucursal exista (no eliminada) y esté activa.
   * @throws 404 SUCURSAL.NOT_FOUND | 400 SUCURSAL.INACTIVA
   */
  async assertActiva(sucursalId: number): Promise<Sucursal> {
    const sucursal = await this.sucursalRepository.findOne({
      where: { id: sucursalId },
    });
    if (!sucursal) {
      this.errorHandler.throwNotFound(ERRORS.SUCURSAL.NOT_FOUND, {
        id: sucursalId,
      });
    }
    if (!sucursal.activo) {
      this.errorHandler.throwBadRequest(ERRORS.SUCURSAL.INACTIVA, {
        id: sucursalId,
      });
    }
    return sucursal;
  }

  /**
   * Verifica que el usuario tenga acceso (lectura) a la sucursal, sin exigir que esté activa.
   * ADMIN siempre pasa; EMPLEADO debe tener asignación.
   * @throws 403 SUCURSAL.ACCESO_DENEGADO
   */
  async assertUsuarioTieneAcceso(
    user: RequestUser,
    sucursalId: number,
  ): Promise<void> {
    if (user.role === UsuarioRole.ADMIN) return;
    const asignada = await this.isAsignada(user.id, sucursalId);
    if (!asignada) {
      this.errorHandler.throwForbidden(ERRORS.SUCURSAL.ACCESO_DENEGADO, {
        sucursalId,
      });
    }
  }

  /**
   * Verifica que el usuario pueda OPERAR en la sucursal: debe estar activa y,
   * si es EMPLEADO, tener asignación.
   * @throws 404 NOT_FOUND | 400 INACTIVA | 403 ACCESO_DENEGADO
   */
  async assertUsuarioPuedeOperar(
    user: RequestUser,
    sucursalId: number,
  ): Promise<void> {
    await this.assertActiva(sucursalId);
    await this.assertUsuarioTieneAcceso(user, sucursalId);
  }

  /**
   * Ids de sucursales visibles para el usuario.
   * @returns `null` para ADMIN (todas); `number[]` para EMPLEADO (solo asignadas, no eliminadas).
   */
  async listSucursalIdsForUser(user: RequestUser): Promise<number[] | null> {
    if (user.role === UsuarioRole.ADMIN) return null;
    const asignaciones = await this.usuarioSucursalRepository.find({
      where: { usuario: { id: user.id } },
      relations: { sucursal: true },
    });
    return asignaciones
      .filter((a) => a.sucursal && !a.sucursal.deletedAt)
      .map((a) => a.sucursal.id);
  }

  /**
   * Valida el header `x-sucursal-id` y devuelve la sucursal operativa.
   * @throws 400 HEADER_REQUERIDO | 400 HEADER_INVALIDO | 404 | 400 INACTIVA | 403
   */
  async resolveOperativeSucursalId(
    user: RequestUser,
    headerSucursalId: SucursalHeaderValue,
  ): Promise<number> {
    const sucursalId = this.parseHeader(headerSucursalId);
    await this.assertUsuarioPuedeOperar(user, sucursalId);
    return sucursalId;
  }

  /**
   * Igual que `resolveOperativeSucursalId`, pero el header es opcional:
   * si falta (o viene vacío) devuelve `undefined` sin validar nada.
   * Si viene, se valida exactamente igual (formato, existencia, activa y acceso).
   */
  async resolveOptionalOperativeSucursalId(
    user: RequestUser,
    headerSucursalId: SucursalHeaderValue,
  ): Promise<number | undefined> {
    const vacio =
      headerSucursalId === undefined ||
      headerSucursalId === null ||
      (typeof headerSucursalId === 'string' && headerSucursalId.trim() === '');
    if (vacio) return undefined;
    return this.resolveOperativeSucursalId(user, headerSucursalId);
  }

  /**
   * Un registro (compra, etc.) solo puede modificarse desde la sucursal a la que pertenece.
   * @throws 400 SUCURSAL.RECURSO_OTRA_SUCURSAL
   */
  assertMismaSucursal(
    sucursalIdRecurso: number | null | undefined,
    sucursalIdOperativa: number,
  ): void {
    if (sucursalIdRecurso !== sucursalIdOperativa) {
      this.errorHandler.throwBadRequest(ERRORS.SUCURSAL.RECURSO_OTRA_SUCURSAL, {
        sucursalRegistro: sucursalIdRecurso ?? null,
        sucursalOperativa: sucursalIdOperativa,
      });
    }
  }

  private parseHeader(raw: SucursalHeaderValue): number {
    if (raw === undefined || raw === null) {
      this.errorHandler.throwBadRequest(ERRORS.SUCURSAL.HEADER_REQUERIDO);
    }
    if (Array.isArray(raw)) {
      this.errorHandler.throwBadRequest(ERRORS.SUCURSAL.HEADER_INVALIDO, {
        valor: raw,
      });
    }
    const text = String(raw).trim();
    if (text === '') {
      this.errorHandler.throwBadRequest(ERRORS.SUCURSAL.HEADER_REQUERIDO);
    }
    const value = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(value) || value < 1) {
      this.errorHandler.throwBadRequest(ERRORS.SUCURSAL.HEADER_INVALIDO, {
        valor: text,
      });
    }
    return value;
  }

  private async isAsignada(
    usuarioId: number,
    sucursalId: number,
  ): Promise<boolean> {
    const count = await this.usuarioSucursalRepository.count({
      where: { usuario: { id: usuarioId }, sucursal: { id: sucursalId } },
    });
    return count > 0;
  }
}
