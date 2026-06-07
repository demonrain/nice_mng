/** 业务响应码 */
export enum BizCode {
  SUCCESS = 0,
  ERROR = 1,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  VALIDATION = 422,
  SERVER_ERROR = 500,
}

/** 通用启用/停用状态 */
export enum CommonStatus {
  ENABLED = 1,
  DISABLED = 0,
}

/** 性别 */
export enum Gender {
  UNKNOWN = 0,
  MALE = 1,
  FEMALE = 2,
}

export const SUPER_ADMIN_ROLE = 'super_admin';

/** WebSocket 事件名 */
export const WS_EVENTS = {
  NOTICE: 'notice',
  ONLINE_COUNT: 'online_count',
} as const;
