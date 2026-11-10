import { Module } from '@nestjs/common';
import { UsuarioModule } from '../usuario/usuario.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthSessionModule } from './auth-session.module.js';

@Module({
  imports: [UsuarioModule, AuthSessionModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, AuthSessionModule],
})
export class AuthModule {}
