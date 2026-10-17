import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from '../inventario/entities/stock.entity.js';
import { ItemVenta } from '../venta/entities/item-venta.entity.js';
import { Venta } from '../venta/entities/venta.entity.js';
import { ReporteController } from './reporte.controller.js';
import { ReporteService } from './reporte.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Venta, ItemVenta, Stock])],
  controllers: [ReporteController],
  providers: [ReporteService],
  exports: [ReporteService],
})
export class ReporteModule {}
