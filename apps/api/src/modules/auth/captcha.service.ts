import { Injectable } from '@nestjs/common';
import * as svgCaptcha from 'svg-captcha';
import { randomUUID } from 'crypto';
import { RedisService } from '../../redis/redis.service';

const CAPTCHA_PREFIX = 'captcha:';
const CAPTCHA_TTL = 120; // 秒

@Injectable()
export class CaptchaService {
  constructor(private readonly redis: RedisService) {}

  async generate(): Promise<{ id: string; svg: string }> {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
      ignoreChars: '0o1ilI',
      background: '#f0f2f5',
    });
    const id = randomUUID();
    await this.redis.set(`${CAPTCHA_PREFIX}${id}`, captcha.text.toLowerCase(), CAPTCHA_TTL);
    return { id, svg: captcha.data };
  }

  async verify(id?: string, value?: string): Promise<boolean> {
    if (!id || !value) return false;
    const key = `${CAPTCHA_PREFIX}${id}`;
    const stored = await this.redis.get(key);
    await this.redis.del(key); // 一次性
    if (!stored) return false;
    return stored === value.toLowerCase();
  }
}
