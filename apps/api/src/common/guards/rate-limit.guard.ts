import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { RedisService } from '../../redis/redis.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { getClientIp } from '../utils/request.util';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 未显式标注时，按全局默认兜底；默认为 0 表示不限流
    const defaultLimit = this.config.get<number>('security.rateLimitDefault') || 0;
    const limit = options?.limit ?? defaultLimit;
    if (!limit || limit <= 0) return true;

    const windowSec =
      options?.windowSec ?? this.config.get<number>('security.rateLimitWindowSec') ?? 60;
    const keyBy = options?.keyBy ?? 'ip';

    const req = context.switchToHttp().getRequest();
    const ip = getClientIp(req) || 'unknown';
    const user = req.user as AuthUser | undefined;
    const userPart = user?.sub ?? req.body?.username ?? 'anon';
    const dimension =
      keyBy === 'user' ? `u:${userPart}` : keyBy === 'ip-user' ? `${ip}:${userPart}` : `ip:${ip}`;
    const route = `${req.method}:${req.route?.path ?? req.url}`;
    const key = `ratelimit:${route}:${dimension}`;

    const client = this.redis.getClient();
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, windowSec);

    if (count > limit) {
      const ttl = await client.ttl(key);
      throw new HttpException(
        { code: 429, message: `请求过于频繁，请 ${ttl > 0 ? ttl : windowSec} 秒后再试` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
