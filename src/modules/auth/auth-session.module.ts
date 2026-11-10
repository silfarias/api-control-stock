import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getAccessTokenSecret } from '../../config/auth-secrets.js';
import { AuthSession } from './entities/auth-session.entity.js';
import { AuthSessionRepository } from './repository/auth-session.repository.js';
import { AuthSessionService } from './services/auth-session.service.js';

/**
 * Sesiones JWT sin depender de UsuarioModule (evita ciclo Auth ↔ Usuario).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AuthSession]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getAccessTokenSecret(),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  providers: [AuthSessionService, AuthSessionRepository],
  exports: [AuthSessionService, AuthSessionRepository, JwtModule],
})
export class AuthSessionModule {}
