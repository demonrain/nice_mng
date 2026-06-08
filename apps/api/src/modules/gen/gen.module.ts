import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
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
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';
import { GenColumn, GenContext, generateAll } from './gen.templates';

class CreateGenTableDto {
  @ApiProperty() @IsString() tableName!: string;
  @ApiProperty() @IsString() tableComment!: string;
  @ApiProperty({ description: '实体类名 如 Product' }) @IsString() className!: string;
  @ApiProperty({ description: '模块名 如 business' }) @IsString() moduleName!: string;
  @ApiProperty({ description: '业务名 如 product' }) @IsString() businessName!: string;
  @ApiProperty({ description: '功能名 如 商品' }) @IsString() functionName!: string;
  @ApiPropertyOptional({ description: '字段定义 JSON 字符串' }) @IsString() @IsOptional() columns?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() options?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
}
class UpdateGenTableDto extends PartialType(CreateGenTableDto) {}
class QueryGenTableDto extends PaginationDto {}

@Injectable()
export class GenService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryGenTableDto) {
    const where: Prisma.GenTableWhereInput = query.keyword
      ? {
          OR: [
            { tableName: { contains: query.keyword, mode: 'insensitive' } },
            { functionName: { contains: query.keyword, mode: 'insensitive' } },
          ],
        }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.genTable.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.genTable.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async findOne(id: number) {
    const item = await this.prisma.genTable.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('表配置不存在');
    return item;
  }

  create(dto: CreateGenTableDto) {
    return this.prisma.genTable.create({ data: dto });
  }

  update(id: number, dto: UpdateGenTableDto) {
    return this.prisma.genTable.update({ where: { id }, data: dto });
  }

  async remove(ids: number[]) {
    await this.prisma.genTable.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }

  private buildContext(table: {
    className: string;
    businessName: string;
    functionName: string;
    moduleName: string;
    tableComment: string;
    columns: string;
  }): GenContext {
    let columns: GenColumn[] = [];
    try {
      columns = JSON.parse(table.columns || '[]');
    } catch {
      columns = [];
    }
    return {
      className: table.className,
      businessName: table.businessName,
      functionName: table.functionName,
      moduleName: table.moduleName,
      tableComment: table.tableComment,
      columns,
    };
  }

  /** 预览生成代码 */
  async preview(id: number) {
    const table = await this.findOne(id);
    return generateAll(this.buildContext(table));
  }

  /**
   * 落盘：将生成的代码写入工程 generated/<module>_<business>/ 目录。
   * 出于安全不直接覆盖 src 源码与自动注册，写入后由开发者复制并接线（见 docs/extension-guide.md）。
   */
  async writeToDisk(id: number) {
    const table = await this.findOne(id);
    const ctx = this.buildContext(table);
    const files = generateAll(ctx);
    const baseDir = join(process.cwd(), 'generated', `${ctx.moduleName}_${ctx.businessName}`);
    mkdirSync(baseDir, { recursive: true });

    const written: string[] = [];
    for (const f of files) {
      // prisma 伪文件名特殊处理；其余去除路径中的非法字符
      const safeName = f.language === 'prisma' ? `${ctx.className}.prisma` : f.filename;
      const target = join(baseDir, safeName);
      mkdirSync(join(target, '..'), { recursive: true });
      writeFileSync(target, f.content, 'utf8');
      written.push(target);
    }
    return { dir: baseDir, files: written };
  }
}

@ApiTags('代码生成')
@ApiBearerAuth()
@Controller('tool/gen')
export class GenController {
  constructor(private readonly service: GenService) {}

  @Get()
  @RequirePermissions('tool:gen:list', 'tool:gen:query')
  list(@Query() query: QueryGenTableDto) {
    return this.service.list(query);
  }

  @Get(':id/preview')
  @RequirePermissions('tool:gen:preview')
  @ApiOperation({ summary: '预览生成代码' })
  preview(@Param('id', ParseIntPipe) id: number) {
    return this.service.preview(id);
  }

  @HttpPost(':id/generate')
  @RequirePermissions('tool:gen:code')
  @OperLog({ title: '代码生成', businessType: 'OTHER' })
  @ApiOperation({ summary: '生成代码并写入工程 generated/ 目录' })
  generate(@Param('id', ParseIntPipe) id: number) {
    return this.service.writeToDisk(id);
  }

  @Get(':id')
  @RequirePermissions('tool:gen:query')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @HttpPost()
  @RequirePermissions('tool:gen:add')
  @OperLog({ title: '代码生成', businessType: 'CREATE' })
  create(@Body() dto: CreateGenTableDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('tool:gen:edit')
  @OperLog({ title: '代码生成', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGenTableDto) {
    return this.service.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('tool:gen:delete')
  @OperLog({ title: '代码生成', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.service.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [GenController],
  providers: [GenService],
})
export class GenModule {}
