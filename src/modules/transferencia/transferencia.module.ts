import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioModule } from '../inventario/inventario.module.js';
import { SucursalModule } from '../sucursal/sucursal.module.js';
import { ItemTransferencia } from './entities/item-transferencia.entity.js';
import { TransferenciaNumeracion } from './entities/transferencia-numeracion.entity.js';
import { Transferencia } from './entities/transferencia.entity.js';
import { TransferenciaMapper } from './mappers/transferencia.mapper.js';
import { TransferenciaRepository } from './repository/transferencia.repository.js';
import { TransferenciaController } from './transferencia.controller.js';
import { TransferenciaService } from './transferencia.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transferencia,
      ItemTransferencia,
      TransferenciaNumeracion,
    ]),
    InventarioModule,
    SucursalModule,
  ],
  controllers: [TransferenciaController],
  providers: [
    TransferenciaService,
    TransferenciaMapper,
    TransferenciaRepository,
  ],
  exports: [TransferenciaService],
})
export class TransferenciaModule {}
