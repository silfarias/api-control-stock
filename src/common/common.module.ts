import { Global, Module } from '@nestjs/common';
import { AdminGuard } from './guards/admin.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { ErrorHandlerService } from './services/error-handler.service.js';
import { GetEntityService } from './services/get-entity.service.js';

/**
 * Módulo global: servicios compartidos y guards con DI (DataSource en JwtAuthGuard).
 */
@Global()
@Module({
  providers: [
    ErrorHandlerService,
    GetEntityService,
    JwtAuthGuard,
    AdminGuard,
  ],
  exports: [
    ErrorHandlerService,
    GetEntityService,
    JwtAuthGuard,
    AdminGuard,
  ],
})
export class CommonModule {}