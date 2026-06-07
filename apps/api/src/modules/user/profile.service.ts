import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionService } from '../auth/permission.service';
import { validatePasswordStrength, PasswordPolicy } from '../../common/utils/password.util';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly permissionService: PermissionService,
  ) {}

  private get passwordPolicy(): PasswordPolicy {
    return {
      minLength: this.config.get<number>('security.pwdMinLength') ?? 8,
      requireUpper: this.config.get<boolean>('security.pwdRequireUpper') ?? true,
      requireLower: this.config.get<boolean>('security.pwdRequireLower') ?? true,
      requireNumber: this.config.get<boolean>('security.pwdRequireNumber') ?? true,
      requireSpecial: this.config.get<boolean>('security.pwdRequireSpecial') ?? false,
    };
  }

  async updateProfile(
    userId: number,
    data: { nickname?: string; email?: string; phone?: string; gender?: number; avatar?: string },
  ) {
    await this.prisma.user.update({ where: { id: userId }, data });
    return null;
  }

  async changePassword(userId: number, oldPwd: string, newPwd: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');
    const match = await bcrypt.compare(oldPwd, user.password);
    if (!match) throw new BadRequestException('原密码错误');

    const errors = validatePasswordStrength(newPwd, this.passwordPolicy);
    if (errors.length) throw new BadRequestException(`密码强度不足：${errors.join('，')}`);

    const hashed = await bcrypt.hash(newPwd, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, pwdUpdatedAt: new Date() },
    });
    // 改密后使所有旧会话失效
    await this.permissionService.invalidateUserSessions(userId);
    return null;
  }
}
