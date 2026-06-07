import {
  BadRequestException,
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
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';

class CreateDictTypeDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() type!: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() status?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
}
class UpdateDictTypeDto extends PartialType(CreateDictTypeDto) {}
class QueryDictTypeDto extends PaginationDto {}

class CreateDictDataDto {
  @ApiProperty() @IsInt() dictTypeId!: number;
  @ApiProperty() @IsString() label!: string;
  @ApiProperty() @IsString() value!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() tagType?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() cssClass?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() sort?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isDefault?: boolean;
  @ApiPropertyOptional() @IsInt() @IsOptional() status?: number;
}
class UpdateDictDataDto extends PartialType(CreateDictDataDto) {}

const DICT_CACHE_PREFIX = 'dict:data:';

@Injectable()
export class DictService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ---- 字典类型 ----
  async listType(query: QueryDictTypeDto) {
    const where: Prisma.DictTypeWhereInput = query.keyword
      ? {
          OR: [
            { name: { contains: query.keyword, mode: 'insensitive' } },
            { type: { contains: query.keyword, mode: 'insensitive' } },
          ],
        }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.dictType.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.dictType.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async createType(dto: CreateDictTypeDto) {
    const exists = await this.prisma.dictType.findUnique({ where: { type: dto.type } });
    if (exists) throw new BadRequestException('字典类型已存在');
    return this.prisma.dictType.create({ data: dto });
  }

  async updateType(id: number, dto: UpdateDictTypeDto) {
    return this.prisma.dictType.update({ where: { id }, data: dto });
  }

  async removeType(ids: number[]) {
    await this.prisma.dictType.deleteMany({ where: { id: { in: ids } } });
    await this.clearCache();
    return { count: ids.length };
  }

  // ---- 字典数据 ----
  async listData(dictTypeId: number) {
    return this.prisma.dictData.findMany({ where: { dictTypeId }, orderBy: { sort: 'asc' } });
  }

  /** 按 type 标识获取（带缓存，供前端渲染下拉/标签） */
  async getByType(type: string) {
    const cacheKey = `${DICT_CACHE_PREFIX}${type}`;
    const cached = await this.redis.getJson<unknown[]>(cacheKey);
    if (cached) return cached;
    const dictType = await this.prisma.dictType.findUnique({
      where: { type },
      include: { data: { where: { status: 1 }, orderBy: { sort: 'asc' } } },
    });
    if (!dictType) return [];
    const items = dictType.data.map((d) => ({
      label: d.label,
      value: d.value,
      tagType: d.tagType,
      cssClass: d.cssClass,
    }));
    await this.redis.setJson(cacheKey, items, 3600);
    return items;
  }

  async createData(dto: CreateDictDataDto) {
    const res = await this.prisma.dictData.create({ data: dto });
    await this.clearCache();
    return res;
  }

  async updateData(id: number, dto: UpdateDictDataDto) {
    const res = await this.prisma.dictData.update({ where: { id }, data: dto });
    await this.clearCache();
    return res;
  }

  async removeData(ids: number[]) {
    await this.prisma.dictData.deleteMany({ where: { id: { in: ids } } });
    await this.clearCache();
    return { count: ids.length };
  }

  private async clearCache() {
    const keys = await this.redis.keys(`${DICT_CACHE_PREFIX}*`);
    if (keys.length) await this.redis.del(keys);
  }

  async ensureTypeExists(id: number) {
    const t = await this.prisma.dictType.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('字典类型不存在');
  }
}

@ApiTags('字典管理')
@ApiBearerAuth()
@Controller('system/dict')
export class DictController {
  constructor(private readonly dictService: DictService) {}

  @Get('type')
  @RequirePermissions('system:dict:list', 'system:dict:query')
  listType(@Query() query: QueryDictTypeDto) {
    return this.dictService.listType(query);
  }

  @HttpPost('type')
  @RequirePermissions('system:dict:add')
  @OperLog({ title: '字典类型', businessType: 'CREATE' })
  createType(@Body() dto: CreateDictTypeDto) {
    return this.dictService.createType(dto);
  }

  @Put('type/:id')
  @RequirePermissions('system:dict:edit')
  @OperLog({ title: '字典类型', businessType: 'UPDATE' })
  updateType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictTypeDto) {
    return this.dictService.updateType(id, dto);
  }

  @Delete('type/:ids')
  @RequirePermissions('system:dict:delete')
  @OperLog({ title: '字典类型', businessType: 'DELETE' })
  removeType(@Param('ids') ids: string) {
    return this.dictService.removeType(ids.split(',').map((s) => parseInt(s, 10)));
  }

  @Get('data/type/:type')
  @ApiOperation({ summary: '按字典类型标识获取数据（登录可用）' })
  getByType(@Param('type') type: string) {
    return this.dictService.getByType(type);
  }

  @Get('data')
  @RequirePermissions('system:dict:list', 'system:dict:query')
  listData(@Query('dictTypeId', ParseIntPipe) dictTypeId: number) {
    return this.dictService.listData(dictTypeId);
  }

  @HttpPost('data')
  @RequirePermissions('system:dict:add')
  @OperLog({ title: '字典数据', businessType: 'CREATE' })
  createData(@Body() dto: CreateDictDataDto) {
    return this.dictService.createData(dto);
  }

  @Put('data/:id')
  @RequirePermissions('system:dict:edit')
  @OperLog({ title: '字典数据', businessType: 'UPDATE' })
  updateData(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictDataDto) {
    return this.dictService.updateData(id, dto);
  }

  @Delete('data/:ids')
  @RequirePermissions('system:dict:delete')
  @OperLog({ title: '字典数据', businessType: 'DELETE' })
  removeData(@Param('ids') ids: string) {
    return this.dictService.removeData(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [DictController],
  providers: [DictService],
})
export class DictModule {}
