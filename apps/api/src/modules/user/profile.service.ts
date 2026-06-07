import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

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
    const hashed = await bcrypt.hash(newPwd, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return null;
  }
}
