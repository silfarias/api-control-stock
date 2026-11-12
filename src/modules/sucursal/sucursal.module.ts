import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptionalSucursalGuard } from '../../common/guards/optional-sucursal.guard.js';
import { RequireSucursalGuard } from '../../common/guards/require-sucursal.guard.js';
import { Usuario } from '../usuario/entities/usuario.entity.js';
import { Sucursal } from './entities/sucursal.entity.js';
import { UsuarioSucursal } from './entities/usuario-sucursal.entity.js';
import { SucursalMapper } from './mappers/sucursal.mapper.js';
import { SucursalRepository } from './repository/sucursal.repository.js';
import { SucursalAccessService } from './sucursal-access.service.js';
import { SucursalController } from './sucursal.controller.js';
import { SucursalService } from './sucursal.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Sucursal, UsuarioSucursal, Usuario])],
  controllers: [SucursalController],
  providers: [
    SucursalService,
    SucursalMapper,
    SucursalRepository,
    SucursalAccessService,
    RequireSucursalGuard,
    OptionalSucursalGuard,
  ],
  exports: [
    SucursalService,
    SucursalAccessService,
    RequireSucursalGuard,
    OptionalSucursalGuard,
  ],
})
export class SucursalModule {}
