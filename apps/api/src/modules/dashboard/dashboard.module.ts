import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post as HttpPost,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  PartialType,
} from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';

class CreateDashboardDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional({ description: '组件卡片 JSON 数组字符串' }) @IsString() @IsOptional() layout?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isDefault?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
}
class UpdateDashboardDto extends PartialType(CreateDashboardDto) {}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationDto) {
    const where: Prisma.DashboardWhereInput = query.keyword
      ? { name: { contains: query.keyword, mode: 'insensitive' } }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.dashboard.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.dashboard.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async getDefault() {
    const dash = await this.prisma.dashboard.findFirst({ where: { isDefault: true } });
    return dash ?? this.prisma.dashboard.findFirst({ orderBy: { id: 'asc' } });
  }

  async create(dto: CreateDashboardDto) {
    if (dto.isDefault) await this.prisma.dashboard.updateMany({ data: { isDefault: false } });
    return this.prisma.dashboard.create({ data: dto });
  }

  async update(id: number, dto: UpdateDashboardDto) {
    if (dto.isDefault) await this.prisma.dashboard.updateMany({ data: { isDefault: false } });
    return this.prisma.dashboard.update({ where: { id }, data: dto });
  }

  async remove(ids: number[]) {
    await this.prisma.dashboard.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
}

@ApiTags('数据报表')
@ApiBearerAuth()
@Controller('system/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('default')
  @ApiOperation({ summary: '默认仪表盘配置(登录可用)' })
  getDefault() {
    return this.service.getDefault();
  }

  @Get()
  @RequirePermissions('system:dashboard:list')
  list(@Query() query: PaginationDto) {
    return this.service.list(query);
  }

  @HttpPost()
  @RequirePermissions('system:dashboard:add')
  @OperLog({ title: '数据报表', businessType: 'CREATE' })
  create(@Body() dto: CreateDashboardDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:dashboard:edit')
  @OperLog({ title: '数据报表', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDashboardDto) {
    return this.service.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('system:dashboard:delete')
  @OperLog({ title: '数据报表', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.service.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
