import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaModule } from '../caja/caja.module.js';
import { InventarioModule } from '../inventario/inventario.module.js';
import { ItemVenta } from './entities/item-venta.entity.js';
import { Venta } from './entities/venta.entity.js';
import { VentaMapper } from './mappers/venta.mapper.js';
import { VentaRepository } from './repository/venta.repository.js';
import { VentaController } from './venta.controller.js';
import { VentaService } from './venta.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, ItemVenta]),
    InventarioModule,
    CajaModule,
  ],
  controllers: [VentaController],
  providers: [VentaService, VentaMapper, VentaRepository],
  exports: [VentaService],
})
export class VentaModule {}
