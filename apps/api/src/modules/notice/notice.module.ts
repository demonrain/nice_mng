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
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';

class CreateNoticeDto {
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() type?: string;
  @ApiProperty() @IsString() content!: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() status?: number;
}
class UpdateNoticeDto extends PartialType(CreateNoticeDto) {}
class QueryNoticeDto extends PaginationDto {}

@Injectable()
export class NoticeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryNoticeDto) {
    const where: Prisma.NoticeWhereInput = query.keyword
      ? { title: { contains: query.keyword, mode: 'insensitive' } }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.notice.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.notice.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async recent() {
    return this.prisma.notice.findMany({ where: { status: 1 }, orderBy: { id: 'desc' }, take: 10 });
  }

  create(dto: CreateNoticeDto) {
    return this.prisma.notice.create({ data: dto });
  }
  update(id: number, dto: UpdateNoticeDto) {
    return this.prisma.notice.update({ where: { id }, data: dto });
  }
  async remove(ids: number[]) {
    await this.prisma.notice.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
}

@ApiTags('通知公告')
@ApiBearerAuth()
@Controller('system/notice')
export class NoticeController {
  constructor(private readonly service: NoticeService) {}

  @Get()
  @RequirePermissions('system:notice:list', 'system:notice:query')
  list(@Query() query: QueryNoticeDto) {
    return this.service.list(query);
  }

  @Get('recent')
  @ApiOperation({ summary: '最近公告（登录可用）' })
  recent() {
    return this.service.recent();
  }

  @HttpPost()
  @RequirePermissions('system:notice:add')
  @OperLog({ title: '通知公告', businessType: 'CREATE' })
  create(@Body() dto: CreateNoticeDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:notice:edit')
  @OperLog({ title: '通知公告', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNoticeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('system:notice:delete')
  @OperLog({ title: '通知公告', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.service.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [NoticeController],
  providers: [NoticeService],
})
export class NoticeModule {}
