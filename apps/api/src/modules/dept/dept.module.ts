import { Body, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, ParseIntPipe, Post as HttpPost, Put, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { listToTree } from '../../common/utils/tree.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';

class CreateDeptDto {
  @ApiPropertyOptional() @IsInt() @IsOptional() parentId?: number;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() sort?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() leader?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() status?: number;
}
class UpdateDeptDto extends PartialType(CreateDeptDto) {}

@Injectable()
export class DeptService {
  constructor(private readonly prisma: PrismaService) {}

  async tree() {
    const list = await this.prisma.dept.findMany({ orderBy: { sort: 'asc' } });
    return listToTree(list as never[]);
  }

  async create(dto: CreateDeptDto) {
    return this.prisma.dept.create({ data: dto });
  }

  async update(id: number, dto: UpdateDeptDto) {
    if (dto.parentId === id) throw new BadRequestException('上级部门不能是自身');
    const exists = await this.prisma.dept.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('部门不存在');
    return this.prisma.dept.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const children = await this.prisma.dept.count({ where: { parentId: id } });
    if (children > 0) throw new BadRequestException('存在下级部门，无法删除');
    const userCount = await this.prisma.user.count({ where: { deptId: id } });
    if (userCount > 0) throw new BadRequestException('部门下存在用户，无法删除');
    await this.prisma.dept.delete({ where: { id } });
    return null;
  }
}

@ApiTags('部门管理')
@ApiBearerAuth()
@Controller('system/dept')
export class DeptController {
  constructor(private readonly deptService: DeptService) {}

  @Get('tree')
  @RequirePermissions('system:dept:list', 'system:dept:query')
  @ApiOperation({ summary: '部门树' })
  tree() {
    return this.deptService.tree();
  }

  @HttpPost()
  @RequirePermissions('system:dept:add')
  @OperLog({ title: '部门管理', businessType: 'CREATE' })
  create(@Body() dto: CreateDeptDto) {
    return this.deptService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:dept:edit')
  @OperLog({ title: '部门管理', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDeptDto) {
    return this.deptService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('system:dept:delete')
  @OperLog({ title: '部门管理', businessType: 'DELETE' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deptService.remove(id);
  }
}

@Module({
  controllers: [DeptController],
  providers: [DeptService],
})
export class DeptModule {}
