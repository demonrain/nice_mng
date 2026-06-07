import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';
import { CreateRoleDto, QueryRoleDto, UpdateRoleDto } from './dto/role.dto';

@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('system/role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions('system:role:list', 'system:role:query')
  @ApiOperation({ summary: '角色列表' })
  list(@Query() query: QueryRoleDto) {
    return this.roleService.list(query);
  }

  @Get(':id')
  @RequirePermissions('system:role:query')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Post()
  @RequirePermissions('system:role:add')
  @OperLog({ title: '角色管理', businessType: 'CREATE' })
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:role:edit')
  @OperLog({ title: '角色管理', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('system:role:delete')
  @OperLog({ title: '角色管理', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.roleService.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}
