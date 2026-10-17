import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class BaseSearchDto {
  static DEFAULT_PAGE_NUMBER = 1;
  static DEFAULT_PAGE_SIZE = 30;
  static MAX_PAGE_SIZE_ALLOWED = 100;
  static DEFAULT_ORDER_BY = 'id';
  static DEFAULT_ORDER_DIRECTION: 'ASC' | 'DESC' = 'DESC';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sortBy: string;

  @ApiPropertyOptional({
    required: false,
    description: 'Campo por el que se ordena (opcional).',
  })
  @IsString()
  @IsOptional()
  orderBy?: string;

  @ApiPropertyOptional({
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Dirección de ordenamiento (opcional).',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  orderDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';

  @ApiPropertyOptional({
    required: false,
    description: 'Campos para agrupar separados por coma. Ej: "entity,action"',
  })
  @IsString()
  @IsOptional()
  groupBy?: string;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  pageSize: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  pageNumber: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  q: string;

  getPageNumber(): number {
    return this.pageNumber || BaseSearchDto.DEFAULT_PAGE_NUMBER;
  }

  getOffset(): number {
    const pageSize = this.getTake();
    return (this.getPageNumber() - 1) * pageSize;
  }

  getTake(): number {
    return Math.min(
      this.pageSize || BaseSearchDto.DEFAULT_PAGE_SIZE,
      BaseSearchDto.MAX_PAGE_SIZE_ALLOWED,
    );
  }

  getOrderBy(defaultField: string = BaseSearchDto.DEFAULT_ORDER_BY): string {
    const raw = (this.orderBy || this.sortBy || defaultField || '').toString().trim();
    return raw || defaultField;
  }

  getOrderDirection(): 'ASC' | 'DESC' {
    const direction = (this.orderDirection || BaseSearchDto.DEFAULT_ORDER_DIRECTION)
      .toString()
      .toUpperCase();
    return direction === 'ASC' ? 'ASC' : 'DESC';
  }

  getGroupByFields(): string[] {
    if (!this.groupBy) return [];
    return this.groupBy
      .split(',')
      .map((field) => field.trim())
      .filter((field) => field.length > 0);
  }
}
