import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { EstadoTransferencia } from '../../../common/enums/estado-transferencia.enum.js';
import { Producto } from '../../producto/entities/producto.entity.js';
import { Sucursal } from '../../sucursal/entities/sucursal.entity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import { CreateItemTransferenciaRequestDto } from '../dto/create-item-transferencia-request.dto.js';
import { CreateTransferenciaRequestDto } from '../dto/create-transferencia-request.dto.js';
import { SearchTransferenciaRequestDto } from '../dto/search-transferencia-request.dto.js';
import { TransferenciaDTO } from '../dto/transferencia.dto.js';
import { ItemTransferencia } from '../entities/item-transferencia.entity.js';
import { Transferencia } from '../entities/transferencia.entity.js';

@Injectable()
export class TransferenciaMapper {
  async entity2DTO(transferencia: Transferencia): Promise<TransferenciaDTO> {
    return plainToInstance(TransferenciaDTO, transferencia, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchTransferenciaRequestDto,
    page: PageDto<Transferencia>,
  ): Promise<PageDto<TransferenciaDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<TransferenciaDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }

  buildItems(itemsDto: CreateItemTransferenciaRequestDto[]): ItemTransferencia[] {
    return itemsDto.map((itemDto) => {
      const item = new ItemTransferencia();
      item.producto = Producto.fromId(itemDto.productoId);
      item.cantidad = itemDto.cantidad;
      return item;
    });
  }

  createDTO2Entity(
    request: CreateTransferenciaRequestDto,
    usuarioId: number,
  ): Transferencia {
    const transferencia = new Transferencia();
    transferencia.sucursalOrigen = Sucursal.fromId(request.sucursalOrigenId);
    transferencia.sucursalDestino = Sucursal.fromId(request.sucursalDestinoId);
    transferencia.usuario = Usuario.fromId(usuarioId);
    transferencia.observacion = request.observacion?.trim() || null;
    transferencia.estado = EstadoTransferencia.BORRADOR;
    transferencia.items = this.buildItems(request.items);
    return transferencia;
  }
}
