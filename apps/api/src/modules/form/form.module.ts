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
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';

class CreateFormDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional({ description: '表单 schema JSON 字符串' }) @IsString() @IsOptional() schema?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() status?: number;
}
class UpdateFormDto extends PartialType(CreateFormDto) {}
class QueryFormDto extends PaginationDto {}

@Injectable()
export class FormSchemaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryFormDto) {
    const where: Prisma.FormSchemaWhereInput = query.keyword
      ? {
          OR: [
            { name: { contains: query.keyword, mode: 'insensitive' } },
            { code: { contains: query.keyword, mode: 'insensitive' } },
          ],
        }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.formSchema.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.formSchema.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async findOne(id: number) {
    const item = await this.prisma.formSchema.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('表单不存在');
    return item;
  }

  async getByCode(code: string) {
    return this.prisma.formSchema.findUnique({ where: { code } });
  }

  async create(dto: CreateFormDto) {
    const exists = await this.prisma.formSchema.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException('表单编码已存在');
    return this.prisma.formSchema.create({ data: dto });
  }

  update(id: number, dto: UpdateFormDto) {
    const { code, ...rest } = dto;
    void code;
    return this.prisma.formSchema.update({ where: { id }, data: rest });
  }

  async remove(ids: number[]) {
    await this.prisma.formSchema.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
}

@ApiTags('表单设计器')
@ApiBearerAuth()
@Controller('tool/form')
export class FormSchemaController {
  constructor(private readonly service: FormSchemaService) {}

  @Get()
  @RequirePermissions('tool:form:list', 'tool:form:query')
  list(@Query() query: QueryFormDto) {
    return this.service.list(query);
  }

  @Get('code/:code')
  @ApiOperation({ summary: '按编码获取表单 schema（登录可用）' })
  getByCode(@Param('code') code: string) {
    return this.service.getByCode(code);
  }

  @Get(':id')
  @RequirePermissions('tool:form:query')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @HttpPost()
  @RequirePermissions('tool:form:add')
  @OperLog({ title: '表单设计器', businessType: 'CREATE' })
  create(@Body() dto: CreateFormDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('tool:form:edit')
  @OperLog({ title: '表单设计器', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFormDto) {
    return this.service.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('tool:form:delete')
  @OperLog({ title: '表单设计器', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.service.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [FormSchemaController],
  providers: [FormSchemaService],
})
export class FormSchemaModule {}
