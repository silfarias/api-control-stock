import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { BaseSearchDto } from '../dto/base-search.dto.js';

function resolveSortableColumn<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  field: string,
): string | null {
  const token = field.trim();
  if (!token) return null;

  const aliases = queryBuilder.expressionMap.aliases.filter((a) => Boolean(a.metadata));
  if (!aliases.length) return null;

  const matches: string[] = [];
  for (const alias of aliases) {
    const column = alias.metadata.columns.find(
      (c) =>
        c.propertyName === token ||
        c.propertyPath === token ||
        c.databaseName === token,
    );
    if (column) {
      matches.push(`${alias.name}.${column.propertyPath}`);
    }
  }

  if (!matches.length) return null;
  if (matches.length === 1) return matches[0];

  const mainAliasName = queryBuilder.expressionMap.mainAlias?.name;
  const mainAliasMatch = matches.find((m) => m.startsWith(`${mainAliasName}.`));
  return mainAliasMatch ?? matches[0];
}

export function applySearchQueryOptions<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  request: BaseSearchDto,
  defaultSortField: string = 'id',
): void {
  const requestedSortField = request.getOrderBy(defaultSortField);
  const sortColumn =
    resolveSortableColumn(queryBuilder, requestedSortField) ??
    resolveSortableColumn(queryBuilder, defaultSortField) ??
    `${queryBuilder.expressionMap.mainAlias?.name ?? 'id'}.id`;

  queryBuilder.orderBy(sortColumn, request.getOrderDirection());

  const groupFields = request
    .getGroupByFields()
    .map((field) => resolveSortableColumn(queryBuilder, field))
    .filter((field): field is string => Boolean(field));

  if (groupFields.length > 0) {
    queryBuilder.groupBy(groupFields[0]);
    groupFields.slice(1).forEach((field) => queryBuilder.addGroupBy(field));
  }

  queryBuilder.skip(request.getOffset()).take(request.getTake());
}

export function applyTextSearch<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  q: string | undefined,
  searchableFields: string[],
): void {
  const term = q?.trim();
  if (!term || searchableFields.length === 0) {
    return;
  }

  const where = searchableFields
    .map((field) => `LOWER(${field}) LIKE LOWER(:q)`)
    .join(' OR ');

  queryBuilder.andWhere(`(${where})`, { q: `%${term}%` });
}