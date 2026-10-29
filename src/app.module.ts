import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module.js';
import { DataSourceConfig } from './config/data-source.config.js';
import { HealthModule } from './core/health/health.module.js';
import { LoggingMiddleware } from './middlewares/log-middleware.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CajaModule } from './modules/caja/caja.module.js';
import { CategoriaModule } from './modules/categoria/categoria.module.js';
import { CompraModule } from './modules/compra/compra.module.js';
import { InventarioModule } from './modules/inventario/inventario.module.js';
import { ProductoModule } from './modules/producto/producto.module.js';
import { ProveedorModule } from './modules/proveedor/proveedor.module.js';
import { ReporteModule } from './modules/reporte/reporte.module.js';
import { TicketModule } from './modules/ticket/ticket.module.js';
import { UsuarioModule } from './modules/usuario/usuario.module.js';
import { VentaModule } from './modules/venta/venta.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_MS) || 60_000,
        limit: Number(process.env.THROTTLE_LIMIT) || 100,
      },
    ]),
    TypeOrmModule.forRoot({ ...DataSourceConfig, autoLoadEntities: true }),
    CommonModule,
    HealthModule,
    UsuarioModule,
    AuthModule,
    CategoriaModule,
    InventarioModule,
    ProductoModule,
    ProveedorModule,
    CompraModule,
    CajaModule,
    VentaModule,
    ReporteModule,
    TicketModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}