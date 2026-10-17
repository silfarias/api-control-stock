import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proveedor } from './entities/proveedor.entity.js';
import { ProveedorMapper } from './mappers/proveedor.mapper.js';
import { ProveedorController } from './proveedor.controller.js';
import { ProveedorService } from './proveedor.service.js';
import { ProveedorRepository } from './repository/proveedor.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([Proveedor])],
  controllers: [ProveedorController],
  providers: [ProveedorService, ProveedorMapper, ProveedorRepository],
  exports: [ProveedorService],
})
export class ProveedorModule {}
