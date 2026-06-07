import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionService } from '../auth/permission.service';
import { buildPageResult } from '../../common/utils/pagination.util';
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  async list(query: QueryRoleDto) {
    const where: Prisma.RoleWhereInput = {};
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword, mode: 'insensitive' } },
        { code: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    const [list, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { sort: 'asc' },
      }),
      this.prisma.role.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { menus: { select: { menuId: true } }, depts: { select: { deptId: true } } },
    });
    if (!role) throw new NotFoundException('角色不存在');
    return {
      ...role,
      menuIds: role.menus.map((m) => m.menuId),
      deptIds: role.depts.map((d) => d.deptId),
    };
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (exists) throw new BadRequestException('角色名称或标识已存在');
    const { menuIds, deptIds, ...rest } = dto;
    return this.prisma.role.create({
      data: {
        ...rest,
        menus: menuIds?.length ? { create: menuIds.map((menuId) => ({ menuId })) } : undefined,
        depts: deptIds?.length ? { create: deptIds.map((deptId) => ({ deptId })) } : undefined,
      },
    });
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('角色不存在');
    if (role.code === 'super_admin') throw new BadRequestException('超级管理员角色不可修改');

    const { menuIds, deptIds, code, ...rest } = dto;
    void code;
    const data: Prisma.RoleUpdateInput = { ...rest };
    if (menuIds) {
      await this.prisma.roleMenu.deleteMany({ where: { roleId: id } });
      data.menus = { create: menuIds.map((menuId) => ({ menuId })) };
    }
    if (deptIds) {
      await this.prisma.roleDept.deleteMany({ where: { roleId: id } });
      data.depts = { create: deptIds.map((deptId) => ({ deptId })) };
    }
    const updated = await this.prisma.role.update({ where: { id }, data });
    // 权限变更，清空所有用户缓存（简单可靠）
    await this.permissionService.clearUserAuth();
    return updated;
  }

  async remove(ids: number[]) {
    const roles = await this.prisma.role.findMany({ where: { id: { in: ids } } });
    if (roles.some((r) => r.code === 'super_admin')) {
      throw new BadRequestException('超级管理员角色不可删除');
    }
    await this.prisma.role.deleteMany({ where: { id: { in: ids } } });
    await this.permissionService.clearUserAuth();
    return { count: ids.length };
  }
}
