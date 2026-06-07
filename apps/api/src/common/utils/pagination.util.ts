import { PageResult } from '@nice-admin/shared';

export function buildPageResult<T>(
  list: T[],
  total: number,
  page: number,
  pageSize: number,
): PageResult<T> {
  return { list, total, page, pageSize };
}

/** 构建 Prisma orderBy 对象 */
export function buildOrderBy(orderBy?: string, order: 'asc' | 'desc' = 'desc') {
  if (!orderBy) return { id: order } as Record<string, 'asc' | 'desc'>;
  return { [orderBy]: order } as Record<string, 'asc' | 'desc'>;
}
