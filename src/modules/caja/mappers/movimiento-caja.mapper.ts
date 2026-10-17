import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { MovimientoCajaDTO } from '../dto/movimiento-caja.dto.js';
import { SearchMovimientoCajaRequestDto } from '../dto/search-movimiento-caja-request.dto.js';
import { MovimientoCaja } from '../entities/movimiento-caja.entity.js';

@Injectable()
export class MovimientoCajaMapper {
  async entity2DTO(movimiento: MovimientoCaja): Promise<MovimientoCajaDTO> {
    return plainToInstance(MovimientoCajaDTO, movimiento, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchMovimientoCajaRequestDto,
    page: PageDto<MovimientoCaja>,
  ): Promise<PageDto<MovimientoCajaDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<MovimientoCajaDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }
}
