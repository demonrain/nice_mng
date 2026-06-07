import {
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';

class QueryLogDto extends PaginationDto {}

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) {}

  async operList(query: QueryLogDto) {
    const where: Prisma.OperLogWhereInput = query.keyword
      ? {
          OR: [
            { title: { contains: query.keyword, mode: 'insensitive' } },
            { operName: { contains: query.keyword, mode: 'insensitive' } },
          ],
        }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.operLog.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.operLog.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async loginList(query: QueryLogDto) {
    const where: Prisma.LoginLogWhereInput = query.keyword
      ? { username: { contains: query.keyword, mode: 'insensitive' } }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.loginLog.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.loginLog.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async removeOper(ids: number[]) {
    await this.prisma.operLog.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
  async removeLogin(ids: number[]) {
    await this.prisma.loginLog.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
}

@ApiTags('日志管理')
@ApiBearerAuth()
@Controller('system/log')
export class LogController {
  constructor(private readonly service: LogService) {}

  @Get('oper')
  @RequirePermissions('system:operlog:list', 'system:operlog:query')
  @ApiOperation({ summary: '操作日志列表' })
  operList(@Query() query: QueryLogDto) {
    return this.service.operList(query);
  }

  @Delete('oper/:ids')
  @RequirePermissions('system:operlog:delete')
  removeOper(@Param('ids') ids: string) {
    return this.service.removeOper(ids.split(',').map((s) => parseInt(s, 10)));
  }

  @Get('login')
  @RequirePermissions('system:loginlog:list', 'system:loginlog:query')
  @ApiOperation({ summary: '登录日志列表' })
  loginList(@Query() query: QueryLogDto) {
    return this.service.loginList(query);
  }

  @Delete('login/:ids')
  @RequirePermissions('system:loginlog:delete')
  removeLogin(@Param('ids') ids: string) {
    return this.service.removeLogin(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [LogController],
  providers: [LogService],
})
export class LogModule {}
