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
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import { RequestUser } from '../../common/interfaces/jwt.interface.js';
import { CreateUsuarioRequestDto } from './dto/create-usuario-request.dto.js';
import { SearchUsuarioRequestDto } from './dto/search-usuario-request.dto.js';
import { UpdateUsuarioRequestDto } from './dto/update-usuario-request.dto.js';
import { UsuarioDTO } from './dto/usuario.dto.js';
import { UsuarioService } from './usuario.service.js';

@ApiTags('Usuario')
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Buscar usuarios',
    description:
      'Busca usuarios con filtros opcionales (id, nombre, email, role), texto libre `q` y paginación.',
  })
  @PaginatedResponse(UsuarioDTO)
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta / parámetros inválidos' })
  async search(
    @Query() request: SearchUsuarioRequestDto,
  ): Promise<PageDto<UsuarioDTO>> {
    const req = plainToInstance(SearchUsuarioRequestDto, request);
    return this.usuarioService.search(req);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Crear usuario',
    description: 'Crea un usuario (solo ADMIN). La contraseña se almacena hasheada.',
  })
  @ApiBody({ type: CreateUsuarioRequestDto, description: 'Datos para crear usuario' })
  @ApiOkResponse({ type: UsuarioDTO, description: 'Usuario creado correctamente' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta / validación fallida' })
  @ApiConflictResponse({ description: 'Email duplicado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async create(@Body() request: CreateUsuarioRequestDto): Promise<UsuarioDTO> {
    return this.usuarioService.create(request);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Actualizar usuario',
    description: 'Actualiza parcialmente un usuario existente (solo ADMIN).',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID del usuario', example: 1 })
  @ApiBody({ type: UpdateUsuarioRequestDto, description: 'Campos a actualizar' })
  @ApiOkResponse({ type: UsuarioDTO, description: 'Usuario actualizado correctamente' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta / validación fallida' })
  @ApiNotFoundResponse({ description: 'No se encontró el usuario' })
  @ApiConflictResponse({ description: 'Email duplicado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async update(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateUsuarioRequestDto,
  ): Promise<UsuarioDTO> {
    return this.usuarioService.update(id, request, req.user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
    description: 'Devuelve un usuario por su identificador. No incluye password.',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID del usuario', example: 1 })
  @ApiOkResponse({ type: UsuarioDTO, description: 'Usuario encontrado' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta' })
  @ApiNotFoundResponse({ description: 'No se encontró el usuario' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UsuarioDTO> {
    return this.usuarioService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Eliminar usuario',
    description:
      'Soft-delete del usuario (solo ADMIN). Renombra el email para liberar la restricción unique.',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID del usuario', example: 1 })
  @ApiOkResponse({ description: 'Usuario eliminado correctamente' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta' })
  @ApiNotFoundResponse({ description: 'No se encontró el usuario' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async remove(
    @Request() req: { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<string> {
    return this.usuarioService.remove(id, req.user);
  }
}
