import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { getAccessTokenSecret } from '../../config/auth-secrets.js';
import { UsuarioModule } from '../usuario/usuario.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

const accessTokenExpiresIn: SignOptions['expiresIn'] =
  (process.env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn']) ?? '1d';

@Module({
  imports: [
    UsuarioModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getAccessTokenSecret(),
        signOptions: { expiresIn: accessTokenExpiresIn },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
