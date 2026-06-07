/** 统一响应信封 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/** 分页查询入参 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  /** 排序字段 */
  orderBy?: string;
  /** asc | desc */
  order?: 'asc' | 'desc';
  keyword?: string;
}

/** 分页结果 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
