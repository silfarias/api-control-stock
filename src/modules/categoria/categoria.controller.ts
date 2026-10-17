import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { PaginatedResponse } from '../../common/decorators/paginated-response.decorator.js';
import { PageDto } from '../../common/dto/page.dto.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CategoriaService } from './categoria.service.js';
import { CategoriaDTO } from './dto/categoria.dto.js';
import { CreateCategoriaRequestDto } from './dto/create-categoria-request.dto.js';
import { SearchCategoriaRequestDto } from './dto/search-categoria-request.dto.js';
import { UpdateCategoriaRequestDto } from './dto/update-categoria-request.dto.js';

@ApiTags('Categoria')
@Controller('categoria')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Buscar categorías',
    description:
      'Busca categorías con filtros opcionales (id, nombre), texto libre `q` y paginación.',
  })
  @PaginatedResponse(CategoriaDTO)
  @ApiBadRequestResponse({
    description: 'Solicitud incorrecta / parámetros inválidos',
  })
  async search(
    @Query() request: SearchCategoriaRequestDto,
  ): Promise<PageDto<CategoriaDTO>> {
    const req = plainToInstance(SearchCategoriaRequestDto, request);
    return this.categoriaService.search(req);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Crear categoría',
    description: 'Crea una categoría (solo ADMIN).',
  })
  @ApiBody({
    type: CreateCategoriaRequestDto,
    description: 'Datos para crear categoría',
  })
  @ApiOkResponse({
    type: CategoriaDTO,
    description: 'Categoría creada correctamente',
  })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta / validación fallida' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async create(
    @Body() request: CreateCategoriaRequestDto,
  ): Promise<CategoriaDTO> {
    return this.categoriaService.create(request);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Actualizar categoría',
    description: 'Actualiza parcialmente una categoría (solo ADMIN).',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID de la categoría', example: 1 })
  @ApiBody({
    type: UpdateCategoriaRequestDto,
    description: 'Campos a actualizar',
  })
  @ApiOkResponse({
    type: CategoriaDTO,
    description: 'Categoría actualizada correctamente',
  })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta / validación fallida' })
  @ApiNotFoundResponse({ description: 'No se encontró la categoría' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateCategoriaRequestDto,
  ): Promise<CategoriaDTO> {
    return this.categoriaService.update(id, request);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener categoría por ID',
    description: 'Devuelve una categoría por su identificador.',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID de la categoría', example: 1 })
  @ApiOkResponse({ type: CategoriaDTO, description: 'Categoría encontrada' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta' })
  @ApiNotFoundResponse({ description: 'No se encontró la categoría' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CategoriaDTO> {
    return this.categoriaService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Eliminar categoría',
    description: 'Soft-delete de la categoría (solo ADMIN).',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID de la categoría', example: 1 })
  @ApiOkResponse({ description: 'Categoría eliminada correctamente' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta' })
  @ApiNotFoundResponse({ description: 'No se encontró la categoría' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.categoriaService.remove(id);
  }
}
