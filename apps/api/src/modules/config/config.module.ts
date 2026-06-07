import {
  BadRequestException,
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

class CreateConfigDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() key!: string;
  @ApiProperty() @IsString() value!: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() builtin?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
}
class UpdateConfigDto extends PartialType(CreateConfigDto) {}
class QueryConfigDto extends PaginationDto {}

@Injectable()
export class SysConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryConfigDto) {
    const where: Prisma.ConfigWhereInput = query.keyword
      ? {
          OR: [
            { name: { contains: query.keyword, mode: 'insensitive' } },
            { key: { contains: query.keyword, mode: 'insensitive' } },
          ],
        }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.config.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.config.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async getByKey(key: string) {
    const cfg = await this.prisma.config.findUnique({ where: { key } });
    return cfg?.value ?? null;
  }

  async create(dto: CreateConfigDto) {
    const exists = await this.prisma.config.findUnique({ where: { key: dto.key } });
    if (exists) throw new BadRequestException('参数键名已存在');
    return this.prisma.config.create({ data: dto });
  }

  async update(id: number, dto: UpdateConfigDto) {
    const { key, ...rest } = dto;
    void key;
    return this.prisma.config.update({ where: { id }, data: rest });
  }

  async remove(ids: number[]) {
    const builtins = await this.prisma.config.findMany({ where: { id: { in: ids }, builtin: true } });
    if (builtins.length) throw new BadRequestException('内置参数不可删除');
    await this.prisma.config.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
}

@ApiTags('参数配置')
@ApiBearerAuth()
@Controller('system/config')
export class SysConfigController {
  constructor(private readonly service: SysConfigService) {}

  @Get()
  @RequirePermissions('system:config:list', 'system:config:query')
  list(@Query() query: QueryConfigDto) {
    return this.service.list(query);
  }

  @Get('key/:key')
  @ApiOperation({ summary: '按键名获取参数值（登录可用）' })
  getByKey(@Param('key') key: string) {
    return this.service.getByKey(key);
  }

  @HttpPost()
  @RequirePermissions('system:config:add')
  @OperLog({ title: '参数配置', businessType: 'CREATE' })
  create(@Body() dto: CreateConfigDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:config:edit')
  @OperLog({ title: '参数配置', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConfigDto) {
    return this.service.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('system:config:delete')
  @OperLog({ title: '参数配置', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.service.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [SysConfigController],
  providers: [SysConfigService],
  exports: [SysConfigService],
})
export class SysConfigModule {}
