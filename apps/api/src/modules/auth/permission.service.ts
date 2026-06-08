import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface UserAuthInfo {
  roles: string[];
  permissions: string[];
  dataScopes: string[];
  isSuperAdmin: boolean;
  deptId: number | null;
  tenantId: number | null;
  /** 会话版本号，用于使旧 token 失效 */
  tokenVersion: number;
}

const CACHE_PREFIX = 'user:auth:';
const CACHE_TTL = 60 * 30; // 30 分钟

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** 加载用户角色 + 权限标识（带缓存） */
  async loadUserAuth(userId: number): Promise<UserAuthInfo> {
    const cacheKey = `${CACHE_PREFIX}${userId}`;
    const cached = await this.redis.getJson<UserAuthInfo>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { menus: { include: { menu: true } } } } } },
      },
    });

    if (!user) {
      return {
        roles: [],
        permissions: [],
        dataScopes: [],
        isSuperAdmin: false,
        deptId: null,
        tenantId: null,
        tokenVersion: 0,
      };
    }

    const roles = user.roles.map((ur) => ur.role.code);
    const dataScopes = user.roles.map((ur) => ur.role.dataScope);
    const permSet = new Set<string>();

    if (user.isSuperAdmin) {
      permSet.add('*:*:*');
    } else {
      for (const ur of user.roles) {
        for (const rm of ur.role.menus) {
          if (rm.menu.perm) permSet.add(rm.menu.perm);
        }
      }
    }

    const info: UserAuthInfo = {
      roles,
      permissions: [...permSet],
      dataScopes,
      isSuperAdmin: user.isSuperAdmin,
      deptId: user.deptId,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    };
    await this.redis.setJson(cacheKey, info, CACHE_TTL);
    return info;
  }

  /** 使该用户所有已签发的 token 失效（改密 / 强制下线）：tokenVersion +1 并清缓存 */
  async invalidateUserSessions(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await this.clearUserAuth(userId);
  }

  /** 清除用户权限缓存（角色/菜单变更后调用） */
  async clearUserAuth(userId?: number): Promise<void> {
    if (userId) {
      await this.redis.del(`${CACHE_PREFIX}${userId}`);
    } else {
      const keys = await this.redis.keys(`${CACHE_PREFIX}*`);
      if (keys.length) await this.redis.del(keys);
    }
  }
}
