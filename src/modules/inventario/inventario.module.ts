import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientoStock } from './entities/movimiento-stock.entity.js';
import { Stock } from './entities/stock.entity.js';
import { InventarioController } from './inventario.controller.js';
import { InventarioService } from './inventario.service.js';
import { MovimientoStockMapper } from './mappers/movimiento-stock.mapper.js';
import { StockMapper } from './mappers/stock.mapper.js';
import { MovimientoStockRepository } from './repository/movimiento-stock.repository.js';
import { StockRepository } from './repository/stock.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, MovimientoStock])],
  controllers: [InventarioController],
  providers: [
    InventarioService,
    StockMapper,
    MovimientoStockMapper,
    StockRepository,
    MovimientoStockRepository,
  ],
  exports: [InventarioService],
})
export class InventarioModule {}
