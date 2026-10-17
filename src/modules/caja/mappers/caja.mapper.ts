import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PageDto } from '../../../common/dto/page.dto.js';
import { CajaDTO } from '../dto/caja.dto.js';
import { SearchCajaRequestDto } from '../dto/search-caja-request.dto.js';
import { Caja } from '../entities/caja.entity.js';

@Injectable()
export class CajaMapper {
  async entity2DTO(caja: Caja): Promise<CajaDTO> {
    return plainToInstance(CajaDTO, caja, {
      excludeExtraneousValues: true,
    });
  }

  async page2Dto(
    request: SearchCajaRequestDto,
    page: PageDto<Caja>,
  ): Promise<PageDto<CajaDTO>> {
    const dtos = await Promise.all(page.data.map((item) => this.entity2DTO(item)));
    const pageDto = new PageDto<CajaDTO>(dtos, page.metadata.count);
    pageDto.metadata.setPaginationData(
      request.getPageNumber(),
      request.getTake(),
    );
    pageDto.metadata.sortBy = request.getOrderBy('id');
    return pageDto;
  }
}
