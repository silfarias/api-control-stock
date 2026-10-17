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
import { CreateProveedorRequestDto } from './dto/create-proveedor-request.dto.js';
import { ProveedorDTO } from './dto/proveedor.dto.js';
import { SearchProveedorRequestDto } from './dto/search-proveedor-request.dto.js';
import { UpdateProveedorRequestDto } from './dto/update-proveedor-request.dto.js';
import { ProveedorService } from './proveedor.service.js';

@ApiTags('Proveedor')
@Controller('proveedor')
export class ProveedorController {
  constructor(private readonly proveedorService: ProveedorService) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar proveedores' })
  @PaginatedResponse(ProveedorDTO)
  @ApiBadRequestResponse({ description: 'Parámetros inválidos' })
  async search(
    @Query() request: SearchProveedorRequestDto,
  ): Promise<PageDto<ProveedorDTO>> {
    const req = plainToInstance(SearchProveedorRequestDto, request);
    return this.proveedorService.search(req);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Crear proveedor', description: 'Solo ADMIN.' })
  @ApiBody({ type: CreateProveedorRequestDto })
  @ApiOkResponse({ type: ProveedorDTO })
  @ApiBadRequestResponse({ description: 'Validación fallida' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async create(
    @Body() request: CreateProveedorRequestDto,
  ): Promise<ProveedorDTO> {
    return this.proveedorService.create(request);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Actualizar proveedor', description: 'Solo ADMIN.' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateProveedorRequestDto })
  @ApiOkResponse({ type: ProveedorDTO })
  @ApiNotFoundResponse({ description: 'No encontrado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateProveedorRequestDto,
  ): Promise<ProveedorDTO> {
    return this.proveedorService.update(id, request);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ type: ProveedorDTO })
  @ApiNotFoundResponse({ description: 'No encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ProveedorDTO> {
    return this.proveedorService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({ summary: 'Eliminar proveedor', description: 'Soft-delete. Solo ADMIN.' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Eliminado' })
  @ApiNotFoundResponse({ description: 'No encontrado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.proveedorService.remove(id);
  }
}
