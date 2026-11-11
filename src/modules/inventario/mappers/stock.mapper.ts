import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { UsuarioRole } from '../../../common/enums/usuario-role.enum.js';
import { applyNestedProductoEconomicVisibility } from '../../producto/utils/producto-economic-visibility.util.js';
import { SearchStockRequestDto } from '../dto/search-stock-request.dto.js';
import { StockDTO } from '../dto/stock.dto.js';
import { Stock } from '../entities/stock.entity.js';

@Injectable()
export class StockMapper {
  async entity2DTO(stock: Stock, viewerRole?: UsuarioRole): Promise<StockDTO> {
    const dto = plainToInstance(StockDTO, stock, {
      excludeExtraneousValues: true,
    });
    applyNestedProductoEconomicVisibility(dto.producto, viewerRole);
    return dto;
  }

  async page2Dto(
    request: SearchStockRequestDto,
    page: PageDto<Stock>,
    viewerRole?: UsuarioRole,
  ): Promise<PageDto<StockDTO>> {
    const dtos = await Promise.all(
      page.data.map((item) => this.entity2DTO(item, viewerRole)),
    );
    const pageDto = new PageDto<StockDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }
}
