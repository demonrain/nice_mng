import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PageResult } from '@nice-admin/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionService } from '../auth/permission.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { buildPageResult } from '../../common/utils/pagination.util';
import {
  ChangeStatusDto,
  CreateUserDto,
  QueryUserDto,
  ResetPwdDto,
  UpdateUserDto,
} from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  private sanitize<T extends { password?: string }>(user: T): Omit<T, 'password'> {
    const { password, ...rest } = user;
    void password;
    return rest;
  }

  /** 根据数据权限计算可见部门 id 列表；返回 null 表示不限制 */
  async resolveViewableDeptIds(current: AuthUser): Promise<number[] | null> {
    if (current.isSuperAdmin) return null;
    const scopes = current.dataScopes ?? [];
    if (scopes.includes('ALL')) return null;

    const ids = new Set<number>();
    if (scopes.includes('CUSTOM')) {
      const customs = await this.prisma.roleDept.findMany({
        where: { role: { users: { some: { userId: current.sub } } } },
        select: { deptId: true },
      });
      customs.forEach((c) => ids.add(c.deptId));
    }
    if (current.deptId != null) {
      if (scopes.includes('DEPT') || scopes.includes('DEPT_AND_CHILD')) ids.add(current.deptId);
      if (scopes.includes('DEPT_AND_CHILD')) {
        const children = await this.getDescendantDeptIds(current.deptId);
        children.forEach((id) => ids.add(id));
      }
    }
    return [...ids];
  }

  private async getDescendantDeptIds(rootId: number): Promise<number[]> {
    const all = await this.prisma.dept.findMany({ select: { id: true, parentId: true } });
    const result: number[] = [];
    const collect = (pid: number) => {
      for (const d of all) {
        if (d.parentId === pid) {
          result.push(d.id);
          collect(d.id);
        }
      }
    };
    collect(rootId);
    return result;
  }

  async list(query: QueryUserDto, current: AuthUser): Promise<PageResult<unknown>> {
    const where: Prisma.UserWhereInput = {};
    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword, mode: 'insensitive' } },
        { nickname: { contains: query.keyword, mode: 'insensitive' } },
        { phone: { contains: query.keyword } },
      ];
    }
    if (query.status != null) where.status = query.status;
    if (query.deptId != null) where.deptId = query.deptId;

    const viewable = await this.resolveViewableDeptIds(current);
    if (viewable !== null) {
      where.AND = [{ OR: [{ deptId: { in: viewable } }, { id: current.sub }] }];
    }

    const [list, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.orderBy || 'id']: query.order || 'desc' },
        include: { dept: { select: { name: true } }, roles: { select: { roleId: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPageResult(
      list.map((u) => ({ ...this.sanitize(u), roleIds: u.roles.map((r) => r.roleId) })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { select: { roleId: true } }, posts: { select: { postId: true } } },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return {
      ...this.sanitize(user),
      roleIds: user.roles.map((r) => r.roleId),
      postIds: user.posts.map((p) => p.postId),
    };
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new BadRequestException('用户名已存在');
    const hashed = await bcrypt.hash(dto.password, 10);
    const { roleIds, postIds, password, ...rest } = dto;
    void password;
    const user = await this.prisma.user.create({
      data: {
        ...rest,
        password: hashed,
        nickname: dto.nickname || dto.username,
        roles: roleIds?.length ? { create: roleIds.map((roleId) => ({ roleId })) } : undefined,
        posts: postIds?.length ? { create: postIds.map((postId) => ({ postId })) } : undefined,
      },
    });
    return this.sanitize(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.ensureExists(id);
    const { roleIds, postIds, password, username, ...rest } = dto;
    void username; // 用户名不允许修改
    const data: Prisma.UserUpdateInput = { ...rest };
    if (password) data.password = await bcrypt.hash(password, 10);

    if (roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      data.roles = { create: roleIds.map((roleId) => ({ roleId })) };
    }
    if (postIds) {
      await this.prisma.userPost.deleteMany({ where: { userId: id } });
      data.posts = { create: postIds.map((postId) => ({ postId })) };
    }
    const user = await this.prisma.user.update({ where: { id }, data });
    await this.permissionService.clearUserAuth(id);
    return this.sanitize(user);
  }

  async remove(ids: number[]) {
    await this.prisma.user.deleteMany({ where: { id: { in: ids }, isSuperAdmin: false } });
    await Promise.all(ids.map((id) => this.permissionService.clearUserAuth(id)));
    return { count: ids.length };
  }

  async resetPwd(id: number, dto: ResetPwdDto) {
    await this.ensureExists(id);
    const hashed = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({ where: { id }, data: { password: hashed } });
    return null;
  }

  async changeStatus(id: number, dto: ChangeStatusDto) {
    await this.ensureExists(id);
    await this.prisma.user.update({ where: { id }, data: { status: dto.status } });
    await this.permissionService.clearUserAuth(id);
    return null;
  }

  private async ensureExists(id: number) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('用户不存在');
    return exists;
  }
}
