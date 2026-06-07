import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';

@ApiTags('菜单管理')
@ApiBearerAuth()
@Controller('system/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('routes')
  @ApiOperation({ summary: '获取当前用户的动态路由' })
  routes(@CurrentUser() user: AuthUser) {
    return this.menuService.getUserRoutes(user);
  }

  @Get('tree')
  @RequirePermissions('system:menu:list', 'system:menu:query')
  @ApiOperation({ summary: '完整菜单树' })
  tree() {
    return this.menuService.tree();
  }

  @Get(':id')
  @RequirePermissions('system:menu:query')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findOne(id);
  }

  @Post()
  @RequirePermissions('system:menu:add')
  @OperLog({ title: '菜单管理', businessType: 'CREATE' })
  create(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:menu:edit')
  @OperLog({ title: '菜单管理', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMenuDto) {
    return this.menuService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('system:menu:delete')
  @OperLog({ title: '菜单管理', businessType: 'DELETE' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.remove(id);
  }
}
