import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
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
import { AssignUsuarioSucursalesRequestDto } from './dto/assign-usuario-sucursales-request.dto.js';
import { CreateSucursalRequestDto } from './dto/create-sucursal-request.dto.js';
import { SearchSucursalRequestDto } from './dto/search-sucursal-request.dto.js';
import { SucursalDTO } from './dto/sucursal.dto.js';
import { UpdateSucursalRequestDto } from './dto/update-sucursal-request.dto.js';
import { SucursalService } from './sucursal.service.js';

/**
 * Las rutas estáticas (`search`, `me`, `usuario/...`) se declaran ANTES de `:id`
 * para que Nest no las interprete como un id.
 */
@ApiTags('Sucursal')
@Controller('sucursal')
export class SucursalController {
  constructor(private readonly sucursalService: SucursalService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Buscar sucursales',
    description:
      'ADMIN ve todas las sucursales; EMPLEADO solo las que tiene asignadas.',
  })
  @PaginatedResponse(SucursalDTO)
  @ApiBadRequestResponse({ description: 'Parámetros inválidos' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async search(
    @Query() request: SearchSucursalRequestDto,
    @Request() req: { user: RequestUser },
  ): Promise<PageDto<SucursalDTO>> {
    const dto = plainToInstance(SearchSucursalRequestDto, request);
    return this.sucursalService.search(dto, req.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Mis sucursales',
    description:
      'Sucursales activas en las que puede operar el usuario autenticado (ADMIN: todas las activas; EMPLEADO: las activas asignadas).',
  })
  @ApiOkResponse({ type: [SucursalDTO] })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async me(@Request() req: { user: RequestUser }): Promise<SucursalDTO[]> {
    return this.sucursalService.findMine(req.user);
  }

  @Get('usuario/:usuarioId/asignaciones')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Listar sucursales asignadas a un usuario',
    description: 'Solo ADMIN.',
  })
  @ApiParam({ name: 'usuarioId', example: 2 })
  @ApiOkResponse({ type: [SucursalDTO] })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async getAsignaciones(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ): Promise<SucursalDTO[]> {
    return this.sucursalService.getAsignaciones(usuarioId);
  }

  @Put('usuario/:usuarioId/asignaciones')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Reemplazar sucursales asignadas a un usuario',
    description:
      'Reemplaza todas las asignaciones del usuario por las indicadas en `sucursalIds` (puede ser vacío). Solo ADMIN.',
  })
  @ApiParam({ name: 'usuarioId', example: 2 })
  @ApiBody({ type: AssignUsuarioSucursalesRequestDto })
  @ApiOkResponse({ type: [SucursalDTO] })
  @ApiBadRequestResponse({ description: 'Validación fallida' })
  @ApiNotFoundResponse({ description: 'Usuario o sucursal no encontrados' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async replaceAsignaciones(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() request: AssignUsuarioSucursalesRequestDto,
  ): Promise<SucursalDTO[]> {
    return this.sucursalService.replaceAsignaciones(usuarioId, request);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Crear sucursal', description: 'Solo ADMIN.' })
  @ApiBody({ type: CreateSucursalRequestDto })
  @ApiOkResponse({ type: SucursalDTO })
  @ApiBadRequestResponse({ description: 'Validación fallida' })
  @ApiConflictResponse({ description: 'Código de sucursal duplicado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async create(
    @Body() request: CreateSucursalRequestDto,
  ): Promise<SucursalDTO> {
    return this.sucursalService.create(request);
  }

  @Post(':id/activar')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Activar sucursal',
    description: 'Marca la sucursal como activa. Solo ADMIN.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: SucursalDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async activar(@Param('id', ParseIntPipe) id: number): Promise<SucursalDTO> {
    return this.sucursalService.activar(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Actualizar sucursal',
    description: 'Permite también cambiar `activo`. Solo ADMIN.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateSucursalRequestDto })
  @ApiOkResponse({ type: SucursalDTO })
  @ApiBadRequestResponse({ description: 'Validación fallida' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiConflictResponse({ description: 'Código de sucursal duplicado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateSucursalRequestDto,
  ): Promise<SucursalDTO> {
    return this.sucursalService.update(id, request);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Obtener sucursal por ID',
    description: 'ADMIN: cualquiera. EMPLEADO: solo si la tiene asignada.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: SucursalDTO })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Sin acceso a la sucursal' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: RequestUser },
  ): Promise<SucursalDTO> {
    return this.sucursalService.findOne(id, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Eliminar sucursal',
    description:
      'Soft-delete (nunca borrado físico): marca `activo=false` y `deleted_date`. La sucursal CASA-CENTRAL no puede eliminarse. Solo ADMIN.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Eliminada' })
  @ApiBadRequestResponse({ description: 'La sucursal no puede eliminarse' })
  @ApiNotFoundResponse({ description: 'No encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.sucursalService.remove(id);
  }
}