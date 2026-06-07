import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { MfaSetupResult } from '@nice-admin/shared';
import { PrismaService } from '../../prisma/prisma.service';

const BACKUP_CODE_COUNT = 8;

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** 生成密钥与二维码（绑定第一步，尚未启用） */
  async setup(userId: number, username: string): Promise<MfaSetupResult> {
    const secret = authenticator.generateSecret();
    const issuer = this.config.get<string>('security.mfaIssuer') || 'nice-admin';
    const otpauthUrl = authenticator.keyuri(username, issuer, secret);
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    const qrcode = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrcode };
  }

  /** 校验一次性码并启用 MFA，返回一次性备用码（明文，仅此一次展示） */
  async enable(userId: number, code: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new BadRequestException('请先获取绑定二维码');
    if (!authenticator.verify({ token: code, secret: user.mfaSecret })) {
      throw new BadRequestException('验证码错误');
    }
    const plainCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => this.genBackupCode());
    const hashed = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true, mfaBackupCodes: JSON.stringify(hashed) },
    });
    return plainCodes;
  }

  /** 关闭 MFA（需校验 TOTP 或备用码） */
  async disable(userId: number, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabled) throw new BadRequestException('未开启二次验证');
    const ok = await this.verify(user, code);
    if (!ok) throw new BadRequestException('验证码错误');
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: null },
    });
  }

  /** 校验 TOTP 或备用码（备用码一次性，命中后消费） */
  async verify(user: Pick<User, 'id' | 'mfaSecret' | 'mfaBackupCodes'>, code: string): Promise<boolean> {
    if (!code) return false;
    if (user.mfaSecret && authenticator.verify({ token: code, secret: user.mfaSecret })) {
      return true;
    }
    // 备用码
    if (user.mfaBackupCodes) {
      const hashes: string[] = JSON.parse(user.mfaBackupCodes);
      for (let i = 0; i < hashes.length; i++) {
        if (await bcrypt.compare(code, hashes[i])) {
          hashes.splice(i, 1);
          await this.prisma.user.update({
            where: { id: user.id },
            data: { mfaBackupCodes: JSON.stringify(hashes) },
          });
          return true;
        }
      }
    }
    return false;
  }

  private genBackupCode(): string {
    // 10 位大写字母+数字，中间加分隔符，便于人工输入
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  }
}
