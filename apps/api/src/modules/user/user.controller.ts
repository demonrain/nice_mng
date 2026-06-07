import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { ProfileService } from './profile.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import {
  ChangeStatusDto,
  CreateUserDto,
  QueryUserDto,
  ResetPwdDto,
  UpdateUserDto,
} from './dto/user.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/profile.dto';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('system/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly profileService: ProfileService,
  ) {}

  // ---------- 个人中心（无需额外权限，登录即可） ----------
  @Put('profile')
  @ApiOperation({ summary: '更新个人信息' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.sub, dto);
  }

  @Put('profile/password')
  @ApiOperation({ summary: '修改密码' })
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(user.sub, dto.oldPassword, dto.newPassword);
  }

  // ---------- 用户管理 ----------
  @Get()
  @RequirePermissions('system:user:list', 'system:user:query')
  @ApiOperation({ summary: '用户列表' })
  list(@Query() query: QueryUserDto, @CurrentUser() user: AuthUser) {
    return this.userService.list(query, user);
  }

  @Get(':id')
  @RequirePermissions('system:user:query')
  @ApiOperation({ summary: '用户详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Post()
  @RequirePermissions('system:user:add')
  @OperLog({ title: '用户管理', businessType: 'CREATE' })
  @ApiOperation({ summary: '新增用户' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:user:edit')
  @OperLog({ title: '用户管理', businessType: 'UPDATE' })
  @ApiOperation({ summary: '修改用户' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('system:user:delete')
  @OperLog({ title: '用户管理', businessType: 'DELETE' })
  @ApiOperation({ summary: '删除用户（支持逗号分隔批量）' })
  remove(@Param('ids') ids: string) {
    return this.userService.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }

  @Put(':id/password')
  @RequirePermissions('system:user:resetPwd')
  @OperLog({ title: '用户管理', businessType: 'UPDATE' })
  @ApiOperation({ summary: '重置密码' })
  resetPwd(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetPwdDto) {
    return this.userService.resetPwd(id, dto);
  }

  @Put(':id/status')
  @RequirePermissions('system:user:edit')
  @OperLog({ title: '用户管理', businessType: 'UPDATE' })
  @ApiOperation({ summary: '修改状态' })
  changeStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeStatusDto) {
    return this.userService.changeStatus(id, dto);
  }
}
