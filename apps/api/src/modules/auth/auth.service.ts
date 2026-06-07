import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { JwtUserPayload, ProfileInfo, TokenPair } from '@nice-admin/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CaptchaService } from './captcha.service';
import { PermissionService } from './permission.service';
import { LoginDto } from './dto/login.dto';

interface RequestMeta {
  ip?: string;
  browser?: string;
  os?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly captcha: CaptchaService,
    private readonly permissionService: PermissionService,
  ) {}

  private async signTokens(payload: JwtUserPayload): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessExpires'),
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: payload.sub, username: payload.username },
      {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpires'),
      },
    );
    return { accessToken, refreshToken, expiresIn: 0 };
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<TokenPair> {
    // 验证码：当提供了 captchaId 时强校验
    if (dto.captchaId) {
      const ok = await this.captcha.verify(dto.captchaId, dto.captcha);
      if (!ok) throw new BadRequestException('验证码错误或已过期');
    }

    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    const fail = async (msg: string) => {
      await this.prisma.loginLog.create({
        data: { username: dto.username, ip: meta.ip, browser: meta.browser, os: meta.os, status: 0, message: msg },
      });
      throw new UnauthorizedException(msg);
    };

    if (!user) return fail('用户名或密码错误') as never;
    if (user.status !== 1) return fail('账号已停用') as never;

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) return fail('用户名或密码错误') as never;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: meta.ip },
    });
    await this.prisma.loginLog.create({
      data: {
        userId: user.id,
        username: user.username,
        ip: meta.ip,
        browser: meta.browser,
        os: meta.os,
        status: 1,
        message: '登录成功',
      },
    });

    return this.signTokens({ sub: user.id, username: user.username, isSuperAdmin: user.isSuperAdmin });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = await this.jwt.verifyAsync<{ sub: number; username: string }>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user || user.status !== 1) throw new UnauthorizedException('账号不可用');
      return this.signTokens({ sub: user.id, username: user.username, isSuperAdmin: user.isSuperAdmin });
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async logout(userId: number): Promise<void> {
    await this.permissionService.clearUserAuth(userId);
  }

  async getProfile(userId: number): Promise<ProfileInfo> {
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
    };
  }
}
