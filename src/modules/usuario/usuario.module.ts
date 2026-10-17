import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity.js';
import { UsuarioMapper } from './mappers/usuario.mapper.js';
import { UsuarioRepository } from './repository/usuario.repository.js';
import { UsuarioController } from './usuario.controller.js';
import { UsuarioService } from './usuario.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [UsuarioController],
  providers: [UsuarioService, UsuarioMapper, UsuarioRepository],
  exports: [UsuarioService],
})
export class UsuarioModule {}
