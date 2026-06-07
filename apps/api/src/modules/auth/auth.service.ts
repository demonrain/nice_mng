import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { JwtUserPayload, LoginResult, ProfileInfo, TokenPair } from '@nice-admin/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CaptchaService } from './captcha.service';
import { PermissionService } from './permission.service';
import { MfaService } from './mfa.service';
import { LoginDto } from './dto/login.dto';

interface RequestMeta {
  ip?: string;
  browser?: string;
  os?: string;
}

const LOCK_PREFIX = 'login:lock:';
const FAIL_PREFIX = 'login:fail:';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly captcha: CaptchaService,
    private readonly permissionService: PermissionService,
    private readonly mfa: MfaService,
  ) {}

  private async signTokens(user: Pick<User, 'id' | 'username' | 'isSuperAdmin' | 'tokenVersion'>): Promise<TokenPair> {
    const payload: JwtUserPayload = {
      sub: user.id,
      username: user.username,
      isSuperAdmin: user.isSuperAdmin,
      ver: user.tokenVersion,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessExpires'),
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, username: user.username, ver: user.tokenVersion },
      {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpires'),
      },
    );
    return { accessToken, refreshToken, expiresIn: 0 };
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<LoginResult> {
    if (dto.captchaId) {
      const ok = await this.captcha.verify(dto.captchaId, dto.captcha);
      if (!ok) throw new BadRequestException('验证码错误或已过期');
    }

    // 1. 账号锁定检查
    const lockKey = `${LOCK_PREFIX}${dto.username}`;
    const lockTtl = await this.redis.getClient().ttl(lockKey);
    if (lockTtl > 0) {
      throw new ForbiddenException(`账号已锁定，请 ${Math.ceil(lockTtl / 60)} 分钟后重试`);
    }

    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });

    // 2. 校验用户与密码
    if (!user) return this.handleFail(dto.username, meta, '用户名或密码错误');
    if (user.status !== 1) {
      await this.writeLoginLog(user.id, dto.username, meta, 0, '账号已停用');
      throw new UnauthorizedException('账号已停用');
    }
    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) return this.handleFail(dto.username, meta, '用户名或密码错误');

    // 3. 登录成功，清理失败计数
    await this.redis.del([lockKey, `${FAIL_PREFIX}${dto.username}`]);

    // 4. 若开启 MFA，返回二次验证挑战令牌
    if (user.mfaEnabled) {
      const mfaToken = await this.jwt.signAsync(
        { sub: user.id, username: user.username, stage: 'mfa' },
        {
          secret: this.config.get('jwt.accessSecret'),
          expiresIn: this.config.get('security.mfaChallengeExpires') || '5m',
        },
      );
      return { mfaRequired: true, mfaToken };
    }

    return this.finalizeLogin(user, meta);
  }

  /** MFA 二次验证后换取正式令牌 */
  async loginMfa(mfaToken: string, code: string, meta: RequestMeta): Promise<TokenPair> {
    let decoded: { sub: number; stage?: string };
    try {
      decoded = await this.jwt.verifyAsync(mfaToken, {
        secret: this.config.get('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('验证会话已过期，请重新登录');
    }
    if (decoded.stage !== 'mfa') throw new UnauthorizedException('无效的验证会话');

    const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.status !== 1) throw new UnauthorizedException('账号不可用');

    const ok = await this.mfa.verify(user, code);
    if (!ok) {
      await this.writeLoginLog(user.id, user.username, meta, 0, '二次验证失败');
      throw new UnauthorizedException('二次验证码错误');
    }
    return this.finalizeLogin(user, meta, true);
  }

  private async finalizeLogin(user: User, meta: RequestMeta, viaMfa = false): Promise<TokenPair> {
    // 异地登录检测
    const isAnomalous = !!user.lastLoginIp && !!meta.ip && user.lastLoginIp !== meta.ip;
    const message = `${viaMfa ? '二次验证登录成功' : '登录成功'}${isAnomalous ? '（异地登录提醒）' : ''}`;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: meta.ip },
    });
    await this.writeLoginLog(user.id, user.username, meta, 1, message);

    return this.signTokens(user);
  }

  /** 记录失败次数，达到阈值则锁定 */
  private async handleFail(username: string, meta: RequestMeta, msg: string): Promise<never> {
    const maxFail = this.config.get<number>('security.loginMaxFail') || 5;
    const windowSec = (this.config.get<number>('security.loginFailWindowMin') || 15) * 60;
    const lockSec = (this.config.get<number>('security.loginLockMin') || 15) * 60;
    const failKey = `${FAIL_PREFIX}${username}`;
    const client = this.redis.getClient();

    const count = await client.incr(failKey);
    if (count === 1) await client.expire(failKey, windowSec);

    let finalMsg = msg;
    if (count >= maxFail) {
      await client.set(`${LOCK_PREFIX}${username}`, '1', 'EX', lockSec);
      await client.del(failKey);
      finalMsg = `连续失败 ${count} 次，账号已锁定 ${Math.ceil(lockSec / 60)} 分钟`;
    }
    await this.writeLoginLog(null, username, meta, 0, finalMsg);
    throw new UnauthorizedException(finalMsg);
  }

  private async writeLoginLog(
    userId: number | null,
    username: string,
    meta: RequestMeta,
    status: number,
    message: string,
  ): Promise<void> {
    await this.prisma.loginLog.create({
      data: {
        userId: userId ?? undefined,
        username,
        ip: meta.ip,
        browser: meta.browser,
        os: meta.os,
        status,
        message,
      },
    });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = await this.jwt.verifyAsync<{ sub: number; ver?: number }>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user || user.status !== 1) throw new UnauthorizedException('账号不可用');
      if ((decoded.ver ?? 0) !== user.tokenVersion) {
        throw new UnauthorizedException('登录状态已失效');
      }
      return this.signTokens(user);
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async logout(userId: number): Promise<void> {
    await this.permissionService.clearUserAuth(userId);
  }

  async getProfile(userId: number): Promise<ProfileInfo & { mfaEnabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { dept: true },
    });
    if (!user) throw new UnauthorizedException();
    const auth = await this.permissionService.loadUserAuth(userId);
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      deptId: user.deptId,
      deptName: user.dept?.name ?? null,
      roles: auth.roles,
      permissions: auth.permissions,
      mfaEnabled: user.mfaEnabled,
    };
  }
}
