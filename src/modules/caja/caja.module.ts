import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajaController } from './caja.controller.js';
import { CajaService } from './caja.service.js';
import { CajaNumeracion } from './entities/caja-numeracion.entity.js';
import { Caja } from './entities/caja.entity.js';
import { MovimientoCaja } from './entities/movimiento-caja.entity.js';
import { CajaMapper } from './mappers/caja.mapper.js';
import { MovimientoCajaMapper } from './mappers/movimiento-caja.mapper.js';
import { CajaRepository } from './repository/caja.repository.js';
import { MovimientoCajaRepository } from './repository/movimiento-caja.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([Caja, MovimientoCaja, CajaNumeracion])],
  controllers: [CajaController],
  providers: [
    CajaService,
    CajaMapper,
    MovimientoCajaMapper,
    CajaRepository,
    MovimientoCajaRepository,
  ],
  exports: [CajaService],
})
export class CajaModule {}
