import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { UsuarioRole } from '../../common/enums/usuario-role.enum.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
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
    abrir: vi.fn(),
    cerrar: vi.fn(),
    crearMovimientoManual: vi.fn(),
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
      await request(app.getHttpServer())
        .post('/venta')
        .send({
          metodoPago: 'EFECTIVO',
          items: [{ productoId: 1, cantidad: 1 }],
        })
        .expect(201);
      expect(ventaService.create).toHaveBeenCalled();
    });

    it('no puede cancelar ventas (403)', async () => {
      await request(app.getHttpServer()).post('/venta/10/cancelar').expect(403);
      expect(ventaService.cancelar).not.toHaveBeenCalled();
    });

    it('no puede consultar compras (403)', async () => {
      await request(app.getHttpServer()).get('/compra/search').expect(403);
      await request(app.getHttpServer()).get('/compra/1').expect(403);
    });

    it('no puede consultar reportes (403)', async () => {
      await request(app.getHttpServer()).get('/reporte/ventas').expect(403);
      await request(app.getHttpServer()).get('/reporte/inventario').expect(403);
    });

    it('no puede modificar ticket (403)', async () => {
      await request(app.getHttpServer())
        .patch('/ticket')
        .send({ paperMm: 58 })
        .expect(403);
      expect(ticketService.update).not.toHaveBeenCalled();
    });

    it('puede consultar ticket', async () => {
      await request(app.getHttpServer()).get('/ticket').expect(200);
    });

    it('consulta productos sin precioCosto', async () => {
      const res = await request(app.getHttpServer())
        .get('/producto/search')
        .expect(200);
      expect(res.body.data[0].precioVenta).toBe(250);
      expect(res.body.data[0].precioCosto).toBeUndefined();
    });

    it('consulta inventario sin precioCosto anidado', async () => {
      const res = await request(app.getHttpServer())
        .get('/inventario/search')
        .expect(200);
      expect(res.body.data[0].producto.precioCosto).toBeUndefined();
      expect(res.body.data[0].cantidad).toBe(5);
    });

    it('puede consultar caja activa pero no historiales', async () => {
      await request(app.getHttpServer()).get('/caja/activa').expect(200);
      await request(app.getHttpServer()).get('/caja/search').expect(403);
      await request(app.getHttpServer()).get('/caja/1').expect(403);
      await request(app.getHttpServer())
        .get('/caja/movimientos/search')
        .expect(403);
    });
  });

  describe('como ADMIN', () => {
    beforeAll(() => {
      roleMode = 'admin';
      vi.clearAllMocks();
    });

    it('puede cancelar ventas', async () => {
      await request(app.getHttpServer()).post('/venta/10/cancelar').expect(201);
      expect(ventaService.cancelar).toHaveBeenCalled();
    });

    it('puede consultar compras y reportes', async () => {
      await request(app.getHttpServer()).get('/compra/search').expect(200);
      await request(app.getHttpServer()).get('/reporte/ventas').expect(200);
    });

    it('puede modificar ticket', async () => {
      await request(app.getHttpServer())
        .patch('/ticket')
        .send({ paperMm: 58 })
        .expect(200);
    });

    it('recibe precioCosto en productos', async () => {
      const res = await request(app.getHttpServer())
        .get('/producto/1')
        .expect(200);
      expect(res.body.precioCosto).toBe(150);
    });

    it('puede consultar historial de caja', async () => {
      await request(app.getHttpServer()).get('/caja/search').expect(200);
      await request(app.getHttpServer()).get('/caja/1').expect(200);
    });
  });
});
