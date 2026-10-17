import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './entities/producto.entity.js';
import { ProductoMapper } from './mappers/producto.mapper.js';
import { ProductoController } from './producto.controller.js';
import { ProductoService } from './producto.service.js';
import { ProductoRepository } from './repository/producto.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([Producto])],
  controllers: [ProductoController],
  providers: [ProductoService, ProductoMapper, ProductoRepository],
  exports: [ProductoService],
})
export class ProductoModule {}
