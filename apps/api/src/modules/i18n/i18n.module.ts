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
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';
import { Public } from '../../common/decorators/public.decorator';

class CreateI18nDto {
  @ApiProperty({ example: 'zh' }) @IsString() lang!: string;
  @ApiPropertyOptional({ default: 'translation' }) @IsString() @IsOptional() namespace?: string;
  @ApiProperty({ example: 'common.search' }) @IsString() key!: string;
  @ApiProperty() @IsString() value!: string;
}
class UpdateI18nDto extends PartialType(CreateI18nDto) {}
class QueryI18nDto extends PaginationDto {
  @ApiPropertyOptional() @IsString() @IsOptional() lang?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() namespace?: string;
}

/** 把扁平点号 key 展开为嵌套对象 */
function expand(entries: { key: string; value: string }[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const { key, value } of entries) {
    const parts = key.split('.');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (typeof node[p] !== 'object' || node[p] === null) node[p] = {};
      node = node[p] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}

@Injectable()
export class I18nService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryI18nDto) {
    const where: Prisma.I18nEntryWhereInput = {};
    if (query.lang) where.lang = query.lang;
    if (query.namespace) where.namespace = query.namespace;
    if (query.keyword) {
      where.OR = [
        { key: { contains: query.keyword, mode: 'insensitive' } },
        { value: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    const [list, total] = await this.prisma.$transaction([
      this.prisma.i18nEntry.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.i18nEntry.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  create(dto: CreateI18nDto) {
    return this.prisma.i18nEntry.create({ data: dto });
  }
  update(id: number, dto: UpdateI18nDto) {
    return this.prisma.i18nEntry.update({ where: { id }, data: dto });
  }
  async remove(ids: number[]) {
    await this.prisma.i18nEntry.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }

  /** 供前端动态加载的资源（嵌套对象） */
  async resources(lang: string, namespace = 'translation') {
    const entries = await this.prisma.i18nEntry.findMany({
      where: { lang, namespace },
      select: { key: true, value: true },
    });
    return expand(entries);
  }

  /** 已有语言列表 */
  async langs() {
    const rows = await this.prisma.i18nEntry.findMany({ select: { lang: true }, distinct: ['lang'] });
    return rows.map((r) => r.lang);
  }
}

@ApiTags('国际化')
@ApiBearerAuth()
@Controller('system/i18n')
export class I18nController {
  constructor(private readonly service: I18nService) {}

  @Public()
  @Get('resources')
  @ApiOperation({ summary: '获取某语言的词条资源(前端动态加载，公开)' })
  resources(@Query('lang') lang: string, @Query('namespace') namespace?: string) {
    return this.service.resources(lang || 'zh', namespace || 'translation');
  }

  @Public()
  @Get('langs')
  @ApiOperation({ summary: '已配置的语言列表' })
  langs() {
    return this.service.langs();
  }

  @Get()
  @RequirePermissions('system:i18n:list')
  list(@Query() query: QueryI18nDto) {
    return this.service.list(query);
  }

  @HttpPost()
  @RequirePermissions('system:i18n:add')
  @OperLog({ title: '国际化词条', businessType: 'CREATE' })
  create(@Body() dto: CreateI18nDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:i18n:edit')
  @OperLog({ title: '国际化词条', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateI18nDto) {
    return this.service.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('system:i18n:delete')
  @OperLog({ title: '国际化词条', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.service.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [I18nController],
  providers: [I18nService],
})
export class I18nModule {}
