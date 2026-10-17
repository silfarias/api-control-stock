import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaController } from './categoria.controller.js';
import { CategoriaService } from './categoria.service.js';
import { Categoria } from './entities/categoria.entity.js';
import { CategoriaMapper } from './mappers/categoria.mapper.js';
import { CategoriaRepository } from './repository/categoria.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([Categoria])],
  controllers: [CategoriaController],
  providers: [CategoriaService, CategoriaMapper, CategoriaRepository],
  exports: [CategoriaService],
})
export class CategoriaModule {}
