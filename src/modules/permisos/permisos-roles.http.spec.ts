import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { SucursalAccessService } from '../sucursal/sucursal-access.service.js';
import { CajaController } from '../caja/caja.controller.js';
import { CajaService } from '../caja/caja.service.js';
import { CompraController } from '../compra/compra.controller.js';
import { CompraService } from '../compra/compra.service.js';
import { InventarioController } from '../inventario/inventario.controller.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { ProductoController } from '../producto/producto.controller.js';
import { ProductoService } from '../producto/producto.service.js';
import { ReporteController } from '../reporte/reporte.controller.js';
import { ReporteService } from '../reporte/reporte.service.js';
import { TicketController } from '../ticket/ticket.controller.js';
import { TicketService } from '../ticket/ticket.service.js';
import { VentaController } from '../venta/venta.controller.js';
import { VentaService } from '../venta/venta.service.js';

type RoleMode = 'empleado' | 'admin' | 'anon';

const SUCURSAL_ID = 1;

describe('Permisos HTTP ADMIN / EMPLEADO', () => {
  let app: INestApplication;
  let roleMode: RoleMode = 'empleado';

  const empleadoUser: RequestUser = {
    id: 2,
    sub: 2,
    email: 'empleado@test.com',
    role: UsuarioRole.EMPLEADO,
    sid: 'sid-emp',
  };

  const adminUser: RequestUser = {
    id: 1,
    sub: 1,
    email: 'admin@test.com',
    role: UsuarioRole.ADMIN,
    sid: 'sid-adm',
  };

  const ventaService = {
    create: vi.fn(async () => ({ id: 10, total: 100 })),
    cancelar: vi.fn(async () => ({ id: 10, estado: 'CANCELADA' })),
    search: vi.fn(async () => ({ data: [], metadata: {} })),
    findOne: vi.fn(async () => ({ id: 10 })),
  };

  const compraService = {
    search: vi.fn(async () => ({ data: [], metadata: {} })),
    findOne: vi.fn(async () => ({ id: 1 })),
    create: vi.fn(),
    update: vi.fn(),
    confirmar: vi.fn(),
    cancelar: vi.fn(),
    remove: vi.fn(),
  };

  const reporteService = {
    ventas: vi.fn(async () => ({})),
    ventasDiario: vi.fn(async () => []),
    productosTop: vi.fn(async () => []),
    stockBajo: vi.fn(async () => []),
    inventario: vi.fn(async () => ({})),
  };

  const ticketService = {
    get: vi.fn(async () => ({ id: 1, paperMm: 80 })),
    update: vi.fn(async () => ({ id: 1, paperMm: 58 })),
  };

  const productoService = {
    search: vi.fn(async (_q: unknown, viewer?: RequestUser) => ({
      data: [
        {
          id: 1,
          nombre: 'Agua',
          precioVenta: 250,
          ...(viewer?.role === UsuarioRole.ADMIN
            ? { precioCosto: 150 }
            : {}),
        },
      ],
      metadata: { count: 1 },
    })),
    findOne: vi.fn(async (_id: number, viewer?: RequestUser) => ({
      id: 1,
      nombre: 'Agua',
      precioVenta: 250,
      ...(viewer?.role === UsuarioRole.ADMIN ? { precioCosto: 150 } : {}),
    })),
    create: vi.fn(),
    createBulk: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const inventarioService = {
    search: vi.fn(async (_q: unknown, viewer?: RequestUser) => ({
      data: [
        {
          id: 1,
          cantidad: 5,
          producto: {
            id: 1,
            precioVenta: 250,
            ...(viewer?.role === UsuarioRole.ADMIN
              ? { precioCosto: 150 }
              : {}),
          },
        },
      ],
      metadata: { count: 1 },
    })),
    findByProductoId: vi.fn(),
    searchMovimientos: vi.fn(),
    searchMovimientosByProducto: vi.fn(),
    crearAjuste: vi.fn(),
  };

  const cajaService = {
    search: vi.fn(async () => ({ data: [], metadata: {} })),
    getAbierta: vi.fn(async () => ({ id: 1, estado: 'ABIERTA' })),
    findOne: vi.fn(async () => ({ id: 1 })),
    searchMovimientos: vi.fn(async () => ({ data: [], metadata: {} })),
    searchMovimientosByCaja: vi.fn(async () => ({ data: [], metadata: {} })),
    abrir: vi.fn(async () => ({ id: 1, estado: 'ABIERTA' })),
    cerrar: vi.fn(async () => ({
      caja: { id: 1, estado: 'CERRADA' },
      montoEsperado: 100,
      montoCierre: 100,
      diferencia: 0,
    })),
    crearMovimientoManual: vi.fn(),
  };

  /** Cliente HTTP que envía siempre el header x-sucursal-id (salvo que se use raw()). */
  const raw = () => request(app.getHttpServer());
  const api = () => {
    const server = raw();
    const wrap =
      (method: 'get' | 'post' | 'patch') =>
      (url: string) =>
        server[method](url).set('x-sucursal-id', String(SUCURSAL_ID));
    return { get: wrap('get'), post: wrap('post'), patch: wrap('patch') };
  };

  /** Simula la resolución del header (la validación real está en sucursal-access.service.spec). */
  const sucursalAccess = {
    resolveOperativeSucursalId: vi.fn(async (_user: unknown, header?: string) => {
      if (!header) throw new BadRequestException('Falta x-sucursal-id');
      return Number(header);
    }),
    resolveOptionalOperativeSucursalId: vi.fn(
      async (_user: unknown, header?: string) =>
        header ? Number(header) : undefined,
    ),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        VentaController,
        CompraController,
        ReporteController,
        TicketController,
        ProductoController,
        InventarioController,
        CajaController,
      ],
      providers: [
        { provide: VentaService, useValue: ventaService },
        { provide: CompraService, useValue: compraService },
        { provide: ReporteService, useValue: reporteService },
        { provide: TicketService, useValue: ticketService },
        { provide: ProductoService, useValue: productoService },
        { provide: InventarioService, useValue: inventarioService },
        { provide: CajaService, useValue: cajaService },
        { provide: SucursalAccessService, useValue: sucursalAccess },
        AdminGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user?: RequestUser } };
        }) => {
          if (roleMode === 'anon') {
            return false;
          }
          const req = context.switchToHttp().getRequest();
          req.user = roleMode === 'admin' ? adminUser : empleadoUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('como EMPLEADO', () => {
    beforeAll(() => {
      roleMode = 'empleado';
    });

    it('puede registrar ventas', async () => {
      await api()
        .post('/venta')
        .send({
          metodoPago: 'EFECTIVO',
          items: [{ productoId: 1, cantidad: 1 }],
        })
        .expect(201);
      expect(ventaService.create).toHaveBeenCalled();
    });

    it('la venta se registra en la sucursal del header', async () => {
      ventaService.create.mockClear();
      await api()
        .post('/venta')
        .send({
          metodoPago: 'EFECTIVO',
          items: [{ productoId: 1, cantidad: 1 }],
        })
        .expect(201);
      expect((ventaService.create.mock.calls[0] as unknown[])[2]).toBe(
        SUCURSAL_ID,
      );
    });

    it('operaciones por sucursal sin x-sucursal-id responden 400', async () => {
      await raw()
        .post('/venta')
        .send({
          metodoPago: 'EFECTIVO',
          items: [{ productoId: 1, cantidad: 1 }],
        })
        .expect(400);
      await raw().get('/inventario/search').expect(400);
      await raw().get('/caja/activa').expect(400);
      await raw().post('/caja/abrir').send({ montoApertura: 1 }).expect(400);
    });

    it('producto/search funciona sin header (stockCantidad queda sin sucursal)', async () => {
      await raw().get('/producto/search').expect(200);
    });

    it('no puede cancelar ventas (403)', async () => {
      await api().post('/venta/10/cancelar').expect(403);
      expect(ventaService.cancelar).not.toHaveBeenCalled();
    });

    it('no puede consultar compras (403)', async () => {
      await api().get('/compra/search').expect(403);
      await api().get('/compra/1').expect(403);
    });

    it('no puede consultar reportes (403)', async () => {
      await api().get('/reporte/ventas').expect(403);
      await api().get('/reporte/inventario').expect(403);
    });

    it('no puede modificar ticket (403)', async () => {
      await api()
        .patch('/ticket')
        .send({ paperMm: 58 })
        .expect(403);
      expect(ticketService.update).not.toHaveBeenCalled();
    });

    it('puede consultar ticket', async () => {
      await api().get('/ticket').expect(200);
    });

    it('consulta productos sin precioCosto', async () => {
      const res = await api()
        .get('/producto/search')
        .expect(200);
      expect(res.body.data[0].precioVenta).toBe(250);
      expect(res.body.data[0].precioCosto).toBeUndefined();
    });

    it('consulta inventario sin precioCosto anidado', async () => {
      const res = await api()
        .get('/inventario/search')
        .expect(200);
      expect(res.body.data[0].producto.precioCosto).toBeUndefined();
      expect(res.body.data[0].cantidad).toBe(5);
    });

    it('puede abrir caja, consultar historial y no registrar movimientos manuales', async () => {
      await api()
        .post('/caja/abrir')
        .send({ montoApertura: 1000 })
        .expect(201);
      expect(cajaService.abrir).toHaveBeenCalled();

      await api().get('/caja/activa').expect(200);
      await api().get('/caja/search').expect(200);
      await api().get('/caja/1').expect(200);
      await api()
        .get('/caja/movimientos/search')
        .expect(200);

      await api()
        .post('/caja/movimientos')
        .send({
          tipo: 'INGRESO',
          monto: 100,
          descripcion: 'test',
        })
        .expect(403);
      expect(cajaService.crearMovimientoManual).not.toHaveBeenCalled();
    });

    it('puede cerrar caja vía endpoint (reglas de ownership en servicio)', async () => {
      await api()
        .post('/caja/1/cerrar')
        .send({ montoCierre: 1000 })
        .expect(201);
      expect(cajaService.cerrar).toHaveBeenCalled();
    });
  });

  describe('como ADMIN', () => {
    beforeAll(() => {
      roleMode = 'admin';
      vi.clearAllMocks();
    });

    it('puede cancelar ventas', async () => {
      await api().post('/venta/10/cancelar').expect(201);
      expect(ventaService.cancelar).toHaveBeenCalled();
    });

    it('puede consultar compras y reportes', async () => {
      await api().get('/compra/search').expect(200);
      await api().get('/reporte/ventas').expect(200);
    });

    it('puede modificar ticket', async () => {
      await api()
        .patch('/ticket')
        .send({ paperMm: 58 })
        .expect(200);
    });

    it('recibe precioCosto en productos', async () => {
      const res = await api()
        .get('/producto/1')
        .expect(200);
      expect(res.body.precioCosto).toBe(150);
    });

    it('puede consultar historial de caja', async () => {
      await api().get('/caja/search').expect(200);
      await api().get('/caja/1').expect(200);
    });
  });
});
