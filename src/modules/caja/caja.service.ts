import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PageDto } from '../../common/dto/page.dto.js';
import { EstadoCaja } from '../../common/enums/estado-caja.enum.js';
import { TipoMovimientoCaja } from '../../common/enums/tipo-movimiento-caja.enum.js';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { ERRORS } from '../../common/errors/errors-codes.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { ErrorHandlerService } from '../../common/services/error-handler.service.js';
import { SucursalAccessService } from '../sucursal/sucursal-access.service.js';
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

/** Nombre del UNIQUE que garantiza una sola caja abierta por sucursal. */
const UQ_CAJA_ABIERTA_POR_SUCURSAL = 'uq_caja_abierta_por_sucursal';

/**
 * Cajas multisucursal.
 *
 * - Una caja ABIERTA por sucursal (chequeo en servicio + UNIQUE sobre la columna generada
 *   `abierta_lock` como red de seguridad en la DB).
 * - Numeración: el `numero` de caja es GLOBAL (un único contador `caja_numeracion`
 *   compartido por todas las sucursales); no se reinicia por sucursal.
 */
@Injectable()
export class CajaService implements OnModuleInit {
  constructor(
    private readonly cajaRepository: CajaRepository,
    private readonly movimientoCajaRepository: MovimientoCajaRepository,
    private readonly cajaMapper: CajaMapper,
    private readonly movimientoCajaMapper: MovimientoCajaMapper,
    private readonly errorHandler: ErrorHandlerService,
    private readonly sucursalAccess: SucursalAccessService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.cajaRepository.syncNumeracion();
  }

  /** Cajas de la sucursal operativa (header `x-sucursal-id`). */
  async search(
    request: SearchCajaRequestDto,
    sucursalId: number,
  ): Promise<PageDto<CajaDTO>> {
    const page = await this.cajaRepository.search(request, sucursalId);
    return this.cajaMapper.page2Dto(request, page);
  }

  /**
   * Detalle de una caja. ADMIN: cualquiera; EMPLEADO: solo de sucursales asignadas.
   * No requiere header: la sucursal sale de la propia caja.
   */
  async findOne(id: number, viewer: RequestUser): Promise<CajaDTO> {
    const caja = await this.getCajaConAcceso(id, viewer);
    return this.cajaMapper.entity2DTO(caja);
  }

  /** Caja abierta de la sucursal operativa. */
  async getAbierta(sucursalId: number): Promise<CajaDTO> {
    const caja = await this.cajaRepository.findAbierta(sucursalId);
    if (!caja) {
      this.errorHandler.throwNotFound(ERRORS.CAJA.NO_ABIERTA, { sucursalId });
    }
    return this.cajaMapper.entity2DTO(caja);
  }

  /**
   * Abre caja con monto inicial en la sucursal operativa.
   * Serializa aperturas concurrentes con el FOR UPDATE de numeración (global) +
   * chequeo de ABIERTA en ESA sucursal dentro de la misma TX. Si aun así dos aperturas
   * colisionan, el UNIQUE `uq_caja_abierta_por_sucursal` lo rechaza y se traduce a YA_ABIERTA.
   */
  async abrir(
    request: AbrirCajaRequestDto,
    actor: RequestUser,
    sucursalId: number,
  ): Promise<CajaDTO> {
    try {
      const sucursal = await this.sucursalAccess.assertActiva(sucursalId);

      const savedId = await this.cajaRepository.manager.transaction(
        async (manager) => {
          // Lock de numeración (GLOBAL): serializa aperturas concurrentes.
          const numero = await this.cajaRepository.allocateNumero(manager);

          const abierta = await manager
            .getRepository(Caja)
            .createQueryBuilder('caja')
            .setLock('pessimistic_write')
            .where('caja.estado = :estado', { estado: EstadoCaja.ABIERTA })
            .andWhere('caja.sucursal_id = :sucursalId', { sucursalId })
            .getOne();

          if (abierta) {
            this.throwYaAbierta(abierta.id, sucursalId, sucursal.nombre);
          }

          const caja = new Caja();
          caja.usuario = Usuario.fromId(actor.id);
          caja.sucursal = sucursal;
          caja.montoApertura = request.montoApertura;
          caja.abiertaEn = new Date();
          caja.estado = EstadoCaja.ABIERTA;
          caja.numero = numero;
          const saved = await manager.getRepository(Caja).save(caja);
          return saved.id;
        },
      );
      const creada = await this.cajaRepository.findByIdWithUsuario(savedId);
      return this.cajaMapper.entity2DTO(creada!);
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      if (this.isDuplicateCajaAbierta(error)) {
        this.throwYaAbierta(undefined, sucursalId);
      }
      this.errorHandler.handleError(error);
    }
  }

  /**
   * Cierra la caja. ADMIN cualquier caja abierta; EMPLEADO solo la que abrió
   * y solo si tiene acceso a la sucursal de la caja.
   * Sin responsable de apertura acreditado, EMPLEADO no puede cerrar.
   */
  async cerrar(
    id: number,
    request: CerrarCajaRequestDto,
    actor: RequestUser,
  ): Promise<CierreCajaResponseDto> {
    try {
      // Acceso a la sucursal de la caja (lectura sin lock; la sucursal de una caja no cambia).
      await this.getCajaConAcceso(id, actor);

      const result = await this.cajaRepository.manager.transaction(
        async (manager) => {
          const caja = await manager
            .getRepository(Caja)
            .createQueryBuilder('caja')
            .setLock('pessimistic_write')
            .leftJoinAndSelect('caja.usuario', 'usuario')
            .where('caja.id = :id', { id })
            .getOne();

          if (!caja) {
            this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, {
              id,
            });
          }
          if (caja.estado !== EstadoCaja.ABIERTA) {
            this.errorHandler.throwBadRequest(ERRORS.CAJA.YA_CERRADA, { id });
          }

          this.assertPuedeCerrar(caja, actor);

          const montos = await this.movimientoCajaRepository.sumarPorCaja(
            id,
            manager,
          );
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
          caja.usuarioCierre = Usuario.fromId(actor.id);
          await manager.getRepository(Caja).save(caja);

          return { montoEsperado, montoCierre: request.montoCierre };
        },
      );

      const cajaDto = await this.cajaMapper.entity2DTO(
        (await this.cajaRepository.findByIdWithUsuario(id))!,
      );

      return {
        caja: cajaDto,
        montoEsperado: result.montoEsperado,
        montoCierre: result.montoCierre,
        diferencia: Number(
          (result.montoCierre - result.montoEsperado).toFixed(2),
        ),
      };
    } catch (error) {
      if (this.errorHandler.isHttpException(error)) throw error;
      this.errorHandler.handleError(error);
    }
  }

  /** Movimiento manual sobre la caja abierta de la sucursal operativa. */
  async crearMovimientoManual(
    request: CreateMovimientoCajaRequestDto,
    actor: RequestUser,
    sucursalId: number,
  ): Promise<MovimientoCajaDTO> {
    try {
      const caja = await this.cajaRepository.findAbierta(sucursalId);
      if (!caja) {
        this.errorHandler.throwBadRequest(ERRORS.CAJA.NO_ABIERTA, {
          sucursalId,
        });
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

  /** Movimientos de cajas de la sucursal operativa (header `x-sucursal-id`). */
  async searchMovimientos(
    request: SearchMovimientoCajaRequestDto,
    sucursalId: number,
  ): Promise<PageDto<MovimientoCajaDTO>> {
    const page = await this.movimientoCajaRepository.search(
      request,
      sucursalId,
    );
    return this.movimientoCajaMapper.page2Dto(request, page);
  }

  /** Movimientos de una caja concreta (acceso validado contra la sucursal de la caja). */
  async searchMovimientosByCaja(
    cajaId: number,
    request: SearchMovimientoCajaRequestDto,
    viewer: RequestUser,
  ): Promise<PageDto<MovimientoCajaDTO>> {
    await this.getCajaConAcceso(cajaId, viewer);
    request.cajaId = cajaId;
    const page = await this.movimientoCajaRepository.search(request);
    return this.movimientoCajaMapper.page2Dto(request, page);
  }

  /**
   * Registra un movimiento VENTA en la caja abierta de la sucursal de la venta (solo efectivo).
   * Debe llamarse dentro de la transacción de alta de venta.
   */
  async registrarVentaEfectivo(
    params: {
      ventaId: number;
      monto: number;
      usuarioId: number;
      sucursalId: number;
    },
    manager: EntityManager,
  ): Promise<MovimientoCaja> {
    const cajaRepo = manager.getRepository(Caja);
    const movimientoRepo = manager.getRepository(MovimientoCaja);

    const caja = await cajaRepo.findOne({
      where: {
        estado: EstadoCaja.ABIERTA,
        sucursal: { id: params.sucursalId },
      },
    });

    if (!caja) {
      this.errorHandler.throwBadRequest(ERRORS.CAJA.NO_ABIERTA, {
        mensaje:
          'Se requiere caja abierta en la sucursal para ventas en efectivo',
        sucursalId: params.sucursalId,
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

  /**
   * Egreso por anulación de una venta en efectivo. Nunca mezcla sucursales:
   * - Si la caja que cobró sigue abierta, el egreso va ahí.
   * - Si ya cerró, va a la caja abierta de esa MISMA sucursal (no se modifica el cierre anterior).
   * - Si no hay caja abierta en esa sucursal, error.
   */
  async registrarAnulacionEfectivo(
    params: {
      ventaId: number;
      numero: number | null;
      monto: number;
      usuarioId: number;
      /** Sucursal de la venta (NO la del header del actor). */
      sucursalId: number;
    },
    manager: EntityManager,
  ): Promise<MovimientoCaja> {
    const cajaRepo = manager.getRepository(Caja);
    const movimientoRepo = manager.getRepository(MovimientoCaja);

    const movimientoVenta = await movimientoRepo.findOne({
      where: {
        referenciaId: params.ventaId,
        tipo: TipoMovimientoCaja.VENTA,
      },
      relations: { caja: { sucursal: true } },
    });

    if (!movimientoVenta?.caja) {
      this.errorHandler.throwBadRequest(ERRORS.CAJA.NO_ABIERTA, {
        mensaje: 'No se encontró el movimiento de caja de la venta en efectivo',
      });
    }

    const sucursalCajaOriginal = movimientoVenta.caja.sucursal?.id;
    if (
      sucursalCajaOriginal !== undefined &&
      sucursalCajaOriginal !== params.sucursalId
    ) {
      // Inconsistencia de datos: la caja que cobró no es de la sucursal de la venta.
      this.errorHandler.throwBadRequest(ERRORS.CAJA.ESTADO_INVALIDO, {
        mensaje: 'La caja que cobró la venta pertenece a otra sucursal',
        ventaId: params.ventaId,
        sucursalVenta: params.sucursalId,
        sucursalCaja: sucursalCajaOriginal,
      });
    }

    let cajaDestino = movimientoVenta.caja;
    const cajaOriginalCerrada = cajaDestino.estado !== EstadoCaja.ABIERTA;

    if (cajaOriginalCerrada) {
      const abierta = await cajaRepo.findOne({
        where: {
          estado: EstadoCaja.ABIERTA,
          sucursal: { id: params.sucursalId },
        },
      });
      if (!abierta) {
        this.errorHandler.throwBadRequest(ERRORS.CAJA.NO_ABIERTA, {
          mensaje:
            'La caja de la venta está cerrada y no hay otra caja abierta en la misma sucursal para registrar la anulación',
          sucursalId: params.sucursalId,
        });
      }
      cajaDestino = abierta;
    }

    const etiqueta = params.numero ?? params.ventaId;
    const movimiento = movimientoRepo.create({
      caja: Caja.fromId(cajaDestino.id),
      tipo: TipoMovimientoCaja.EGRESO,
      monto: params.monto,
      descripcion: cajaOriginalCerrada
        ? `Anulación venta #${etiqueta} (la caja original ya estaba cerrada)`
        : `Anulación venta #${etiqueta}`,
      referenciaId: params.ventaId,
      usuario: Usuario.fromId(params.usuarioId),
    });

    return movimientoRepo.save(movimiento);
  }

  /**
   * Carga una caja y valida que el usuario tenga acceso a su sucursal
   * (ADMIN siempre; EMPLEADO solo sucursales asignadas).
   */
  private async getCajaConAcceso(
    id: number,
    user: RequestUser,
  ): Promise<Caja> {
    const caja = await this.cajaRepository.findByIdWithUsuario(id);
    if (!caja) {
      this.errorHandler.throwNotFound(ERRORS.DATABASE.RECORD_NOT_FOUND, { id });
    }
    await this.sucursalAccess.assertUsuarioTieneAcceso(user, caja.sucursal.id);
    return caja;
  }

  private throwYaAbierta(
    cajaId: number | undefined,
    sucursalId: number,
    sucursalNombre?: string,
  ): never {
    this.errorHandler.throwBadRequest(ERRORS.CAJA.YA_ABIERTA, {
      mensaje: sucursalNombre
        ? `Ya hay una caja abierta en la sucursal ${sucursalNombre}`
        : 'Ya hay una caja abierta en la sucursal',
      cajaId,
      sucursalId,
      ...(sucursalNombre ? { sucursal: sucursalNombre } : {}),
    });
  }

  private isDuplicateCajaAbierta(error: unknown): boolean {
    const driver = (
      error as {
        driverError?: { code?: string; errno?: number; sqlMessage?: string };
      }
    )?.driverError;
    const esDuplicado = driver?.code === 'ER_DUP_ENTRY' || driver?.errno === 1062;
    return Boolean(
      esDuplicado && driver?.sqlMessage?.includes(UQ_CAJA_ABIERTA_POR_SUCURSAL),
    );
  }

  /**
   * ADMIN cierra cualquier caja. EMPLEADO solo si acredita ser el opener
   * (`usuario.id`). Sin opener, no se inventa responsable ni se autoriza.
   */
  private assertPuedeCerrar(caja: Caja, actor: RequestUser): void {
    if (actor.role === UsuarioRole.ADMIN) {
      return;
    }

    const openerId = caja.usuario?.id;
    if (!openerId || openerId !== actor.id) {
      this.errorHandler.throwForbidden(ERRORS.CAJA.CIERRE_NO_AUTORIZADO, {
        cajaId: caja.id,
        openerId: openerId ?? null,
        actorId: actor.id,
      });
    }
  }
}
