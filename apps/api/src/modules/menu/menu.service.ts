import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Menu } from '@prisma/client';
import { RouteItem } from '@nice-admin/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { listToTree } from '../../common/utils/tree.util';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /** 完整菜单树（管理用） */
  async tree() {
    const menus = await this.prisma.menu.findMany({ orderBy: { sort: 'asc' } });
    return listToTree(menus as never[]);
  }

  /** 当前用户可见的动态路由树 */
  async getUserRoutes(user: AuthUser): Promise<RouteItem[]> {
    let menus: Menu[];
    if (user.isSuperAdmin) {
      menus = await this.prisma.menu.findMany({
        where: { type: { in: ['DIR', 'MENU'] }, status: 1 },
        orderBy: { sort: 'asc' },
      });
    } else {
      menus = await this.prisma.menu.findMany({
        where: {
          type: { in: ['DIR', 'MENU'] },
          status: 1,
          roles: { some: { role: { users: { some: { userId: user.sub } }, status: 1 } } },
        },
        orderBy: { sort: 'asc' },
        distinct: ['id'],
      });
    }
    const items: RouteItem[] = menus.map((m) => ({
      id: m.id,
      parentId: m.parentId,
      path: m.path || '',
      name: m.name,
      component: m.component,
      redirect: m.redirect,
      type: m.type as RouteItem['type'],
      perm: m.perm,
      meta: {
        title: m.title,
        icon: m.icon,
        hidden: !m.visible,
        keepAlive: m.keepAlive,
        link: m.link,
      },
    }));
    return listToTree(items as never[]) as RouteItem[];
  }

  async findOne(id: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('菜单不存在');
    return menu;
  }

  async create(dto: CreateMenuDto) {
    return this.prisma.menu.create({ data: dto });
  }

  async update(id: number, dto: UpdateMenuDto) {
    await this.findOne(id);
    if (dto.parentId === id) throw new BadRequestException('上级菜单不能是自身');
    return this.prisma.menu.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const childCount = await this.prisma.menu.count({ where: { parentId: id } });
    if (childCount > 0) throw new BadRequestException('存在子菜单，无法删除');
    await this.prisma.menu.delete({ where: { id } });
    return null;
  }
}
