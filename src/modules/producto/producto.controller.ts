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
import { CreateProductoRequestDto } from './dto/create-producto-request.dto.js';
import { CreateProductosBulkRequestDto } from './dto/create-productos-bulk-request.dto.js';
import { ProductoDTO } from './dto/producto.dto.js';
import { SearchProductoRequestDto } from './dto/search-producto-request.dto.js';
import { UpdateProductoRequestDto } from './dto/update-producto-request.dto.js';
import { ProductoService } from './producto.service.js';

@ApiTags('Producto')
@Controller('producto')
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Buscar productos',
    description:
      'Busca productos con filtros (id, nombre, codigo, codigoBarras, categoriaId), texto libre `q` y paginación. Requiere autenticación (ADMIN o EMPLEADO).',
  })
  @PaginatedResponse(ProductoDTO)
  @ApiBadRequestResponse({
    description: 'Solicitud incorrecta / parámetros inválidos',
  })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async search(
    @Query() request: SearchProductoRequestDto,
  ): Promise<PageDto<ProductoDTO>> {
    const req = plainToInstance(SearchProductoRequestDto, request);
    return this.productoService.search(req);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Crear productos en lote',
    description:
      'Crea hasta 100 productos en una transacción. Cada ítem admite stock inicial opcional (solo ADMIN).',
  })
  @ApiBody({ type: CreateProductosBulkRequestDto })
  @ApiOkResponse({
    type: [ProductoDTO],
    description: 'Productos creados correctamente',
  })
  @ApiBadRequestResponse({
    description: 'Validación fallida / códigos duplicados en el lote',
  })
  @ApiConflictResponse({ description: 'Código o código de barras duplicado' })
  @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async createBulk(
    @Request() req: { user: RequestUser },
    @Body() request: CreateProductosBulkRequestDto,
  ): Promise<ProductoDTO[]> {
    return this.productoService.createBulk(request, req.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Crear producto',
    description:
      'Crea un producto asociado a una categoría. Stock inicial opcional vía `stock.cantidad` (solo ADMIN).',
  })
  @ApiBody({
    type: CreateProductoRequestDto,
    description: 'Datos para crear producto',
  })
  @ApiOkResponse({ type: ProductoDTO, description: 'Producto creado correctamente' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta / validación fallida' })
  @ApiConflictResponse({ description: 'Código o código de barras duplicado' })
  @ApiNotFoundResponse({ description: 'Categoría no encontrada' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async create(
    @Request() req: { user: RequestUser },
    @Body() request: CreateProductoRequestDto,
  ): Promise<ProductoDTO> {
    return this.productoService.create(request, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Actualizar producto',
    description: 'Actualiza parcialmente un producto (solo ADMIN).',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID del producto', example: 1 })
  @ApiBody({ type: UpdateProductoRequestDto, description: 'Campos a actualizar' })
  @ApiOkResponse({
    type: ProductoDTO,
    description: 'Producto actualizado correctamente',
  })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta / validación fallida' })
  @ApiNotFoundResponse({ description: 'Producto o categoría no encontrada' })
  @ApiConflictResponse({ description: 'Código o código de barras duplicado' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateProductoRequestDto,
  ): Promise<ProductoDTO> {
    return this.productoService.update(id, request);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Obtener producto por ID',
    description:
      'Devuelve un producto con su categoría. Requiere autenticación (ADMIN o EMPLEADO).',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID del producto', example: 1 })
  @ApiOkResponse({ type: ProductoDTO, description: 'Producto encontrado' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta' })
  @ApiNotFoundResponse({ description: 'No se encontró el producto' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductoDTO> {
    return this.productoService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('authorization')
  @ApiOperation({
    summary: 'Eliminar producto',
    description:
      'Soft-delete del producto (solo ADMIN). Renombra codigo y codigoBarras para liberar uniques.',
  })
  @ApiParam({ name: 'id', required: true, description: 'ID del producto', example: 1 })
  @ApiOkResponse({ description: 'Producto eliminado correctamente' })
  @ApiBadRequestResponse({ description: 'Solicitud incorrecta' })
  @ApiNotFoundResponse({ description: 'No se encontró el producto' })
  @ApiUnauthorizedResponse({ description: 'No autorizado' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return this.productoService.remove(id);
  }
}
