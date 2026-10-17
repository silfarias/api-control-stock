import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { MovimientoStockDTO } from '../dto/movimiento-stock.dto.js';
import { SearchMovimientoStockRequestDto } from '../dto/search-movimiento-stock-request.dto.js';
import { MovimientoStock } from '../entities/movimiento-stock.entity.js';

@Injectable()
export class MovimientoStockMapper {
  async entity2DTO(movimiento: MovimientoStock): Promise<MovimientoStockDTO> {
    return plainToInstance(MovimientoStockDTO, movimiento, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchMovimientoStockRequestDto,
    page: PageDto<MovimientoStock>,
  ): Promise<PageDto<MovimientoStockDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item)),
    );
    const pageDto = new PageDto<MovimientoStockDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }
}
