import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioModule } from '../inventario/inventario.module.js';
import { CompraController } from './compra.controller.js';
import { CompraService } from './compra.service.js';
import { Compra } from './entities/compra.entity.js';
import { ItemCompra } from './entities/item-compra.entity.js';
import { CompraMapper } from './mappers/compra.mapper.js';
import { CompraRepository } from './repository/compra.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compra, ItemCompra]),
    InventarioModule,
  ],
  controllers: [CompraController],
  providers: [CompraService, CompraMapper, CompraRepository],
  exports: [CompraService],
})
export class CompraModule {}
