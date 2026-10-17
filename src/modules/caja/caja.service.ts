import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PageDto } from '../../common/dto/page.dto.js';
import { EstadoCaja } from '../../common/enums/estado-caja.enum.js';
import { TipoMovimientoCaja } from '../../common/enums/tipo-movimiento-caja.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { Usuario } from '../usuario/entities/usuario.entity.js';
import { AbrirCajaRequestDto } from './dto/abrir-caja-request.dto.js';
import { CajaDTO } from './dto/caja.dto.js';
import { CerrarCajaRequestDto } from './dto/cerrar-caja-request.dto.js';
import { CierreCajaResponseDto } from './dto/cierre-caja-response.dto.js';
import { CreateMovimientoCajaRequestDto } from './dto/create-movimiento-caja-request.dto.js';
import { MovimientoCajaDTO } from './dto/movimiento-caja.dto.js';
import { SearchCajaRequestDto } from './dto/search-caja-request.dto.js';
import { SearchMovimientoCajaRequestDto } from './dto/search-movimiento-caja-request.dto.js';
import { Caja } from './entities/caja.entity.js';
import { MovimientoCaja } from './entities/movimiento-caja.entity.js';
import { CajaMapper } from './mappers/caja.mapper.js';
import { MovimientoCajaMapper } from './mappers/movimiento-caja.mapper.js';
import { CajaRepository } from './repository/caja.repository.js';
import { MovimientoCajaRepository } from './repository/movimiento-caja.repository.js';

@Injectable()
export class CajaService {
  constructor(
    private readonly cajaRepository: CajaRepository,
    private readonly movimientoCajaRepository: MovimientoCajaRepository,
    private readonly cajaMapper: CajaMapper,
    private readonly movimientoCajaMapper: MovimientoCajaMapper,
    private readonly errorHandler: ErrorHandlerService,
  ) {}

  async search(request: SearchCajaRequestDto): Promise<PageDto<CajaDTO>> {
    const page = await this.cajaRepository.search(request);
    return this.cajaMapper.page2Dto(request, page);
  }

  async findOne(id: number): Promise<CajaDTO> {
    const caja = await this.cajaRepository.findByIdWithUsuario(id);
    if (!caja) {
      this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, { id });
    }
    return this.cajaMapper.entity2DTO(caja);
  }

  async getAbierta(): Promise<CajaDTO> {
    const caja = await this.cajaRepository.findAbierta();
    if (!caja) {
      this.errorHandler.throwNotFound(ERRORS.CAJA.NO_ABIERTA);
    }
    return this.cajaMapper.entity2DTO(caja);
  }

  async abrir(
    request: AbrirCajaRequestDto,
    actor: RequestUser,
  ): Promise<CajaDTO> {
    try {
      const abierta = await this.cajaRepository.findAbierta();
      if (abierta) {
        this.errorHandler.throwBadRequest(ERRORS.CAJA.YA_ABIERTA, {
          cajaId: abierta.id,
        });
      }

      const caja = new Caja();
      caja.usuario = Usuario.fromId(actor.id);
      caja.montoApertura = request.montoApertura;
      caja.abiertaEn = new Date();
      caja.estado = EstadoCaja.ABIERTA;

      const saved = await this.cajaRepository.save(caja);
      return this.findOne(saved.id);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async cerrar(
    id: number,
    request: CerrarCajaRequestDto,
    _actor: RequestUser,
  ): Promise<CierreCajaResponseDto> {
    try {
      const caja = await this.cajaRepository.findByIdWithUsuario(id);
      if (!caja) {
        this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
          id,
        });
      }
      if (caja.estado !== EstadoCaja.ABIERTA) {
        this.errorHandler.throwBadRequest(ERRORS.CAJA.YA_CERRADA, { id });
      }

      const montos = await this.movimientoCajaRepository.sumarPorCaja(id);
      const montoEsperado = Number(
        (
          Number(caja.montoApertura) +
          montos.ventas +
          montos.ingresos -
          montos.egresos
        ).toFixed(2),
      );

      caja.montoEsperado = montoEsperado;
      caja.montoCierre = request.montoCierre;
      caja.cerradaEn = new Date();
      caja.estado = EstadoCaja.CERRADA;
      await this.cajaRepository.save(caja);

      const cajaDto = await this.cajaMapper.entity2DTO(
        (await this.cajaRepository.findByIdWithUsuario(id))!,
      );

      return {
        caja: cajaDto,
        montoEsperado,
        montoCierre: request.montoCierre,
        diferencia: Number((request.montoCierre - montoEsperado).toFixed(2)),
      };
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async crearMovimientoManual(
    request: CreateMovimientoCajaRequestDto,
    actor: RequestUser,
  ): Promise<MovimientoCajaDTO> {
    try {
      const caja = await this.cajaRepository.findAbierta();
      if (!caja) {
        this.errorHandler.throwBadRequest(ERRORS.CAJA.NO_ABIERTA);
      }

      const movimiento = new MovimientoCaja();
      movimiento.caja = Caja.fromId(caja.id);
      movimiento.tipo = request.tipo;
      movimiento.monto = request.monto;
      movimiento.descripcion = request.descripcion.trim();
      movimiento.referenciaId = request.referenciaId;
      movimiento.usuario = Usuario.fromId(actor.id);

      const saved = await this.movimientoCajaRepository.save(movimiento);
      const completo = await this.movimientoCajaRepository.findOneOrFail({
        where: { id: saved.id },
        relations: { usuario: true, caja: true },
      });
      return this.movimientoCajaMapper.entity2DTO(completo);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  async searchMovimientos(
    request: SearchMovimientoCajaRequestDto,
  ): Promise<PageDto<MovimientoCajaDTO>> {
    const page = await this.movimientoCajaRepository.search(request);
    return this.movimientoCajaMapper.page2Dto(request, page);
  }

  async searchMovimientosByCaja(
    cajaId: number,
    request: SearchMovimientoCajaRequestDto,
  ): Promise<PageDto<MovimientoCajaDTO>> {
    const caja = await this.cajaRepository.findByIdWithUsuario(cajaId);
    if (!caja) {
      this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
        id: cajaId,
      });
    }
    request.cajaId = cajaId;
    return this.searchMovimientos(request);
  }

  /**
   * Registra un movimiento VENTA en la caja abierta (solo efectivo).
   * Debe llamarse dentro de la transacción de alta de venta.
   */
  async registrarVentaEfectivo(
    params: {
      ventaId: number;
      monto: number;
      usuarioId: number;
    },
    manager: EntityManager,
  ): Promise<MovimientoCaja> {
    const cajaRepo = manager.getRepository(Caja);
    const movimientoRepo = manager.getRepository(MovimientoCaja);

    const caja = await cajaRepo.findOne({
      where: { estado: EstadoCaja.ABIERTA },
    });

    if (!caja) {
      this.errorHandler.throwBadRequest(ERRORS.CAJA.NO_ABIERTA, {
        mensaje: 'Se requiere caja abierta para ventas en efectivo',
      });
    }

    const movimiento = movimientoRepo.create({
      caja: Caja.fromId(caja.id),
      tipo: TipoMovimientoCaja.VENTA,
      monto: params.monto,
      descripcion: `Venta #${params.ventaId}`,
      referenciaId: params.ventaId,
      usuario: Usuario.fromId(params.usuarioId),
    });

    return movimientoRepo.save(movimiento);
  }
}
