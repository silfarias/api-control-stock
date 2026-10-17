import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { SearchStockRequestDto } from '../dto/search-stock-request.dto.js';
import { StockDTO } from '../dto/stock.dto.js';
import { Stock } from '../entities/stock.entity.js';

@Injectable()
export class StockMapper {
  async entity2DTO(stock: Stock): Promise<StockDTO> {
    return plainToInstance(StockDTO, stock, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchStockRequestDto,
    page: PageDto<Stock>,
  ): Promise<PageDto<StockDTO>> {
    const dtos = await Promise.all(page.data.map((item) => this.entity2DTO(item)));
    const pageDto = new PageDto<StockDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }
}
