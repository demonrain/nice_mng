import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** 窗口内允许的最大请求数 */
  limit: number;
  /** 时间窗口(秒) */
  windowSec: number;
  /** 限流维度：ip(默认) | user | ip-user */
  keyBy?: 'ip' | 'user' | 'ip-user';
}

/**
 * 接口限流。基于 Redis 计数器，超过阈值返回 429。
 * 示例：@RateLimit({ limit: 5, windowSec: 60, keyBy: 'ip-user' })
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
