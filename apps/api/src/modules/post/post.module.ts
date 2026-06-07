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
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';

class CreatePostDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() sort?: number;
  @ApiPropertyOptional() @IsInt() @IsOptional() status?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
}
class UpdatePostDto extends PartialType(CreatePostDto) {}
class QueryPostDto extends PaginationDto {}

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryPostDto) {
    const where: Prisma.PostWhereInput = query.keyword
      ? {
          OR: [
            { name: { contains: query.keyword, mode: 'insensitive' } },
            { code: { contains: query.keyword, mode: 'insensitive' } },
          ],
        }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({ where, skip: query.skip, take: query.take, orderBy: { sort: 'asc' } }),
      this.prisma.post.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async create(dto: CreatePostDto) {
    const exists = await this.prisma.post.findUnique({ where: { code: dto.code } });
    if (exists) throw new BadRequestException('岗位标识已存在');
    return this.prisma.post.create({ data: dto });
  }

  async update(id: number, dto: UpdatePostDto) {
    return this.prisma.post.update({ where: { id }, data: dto });
  }

  async remove(ids: number[]) {
    await this.prisma.post.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
}

@ApiTags('岗位管理')
@ApiBearerAuth()
@Controller('system/post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @RequirePermissions('system:post:list', 'system:post:query')
  @ApiOperation({ summary: '岗位列表' })
  list(@Query() query: QueryPostDto) {
    return this.postService.list(query);
  }

  @HttpPost()
  @RequirePermissions('system:post:add')
  @OperLog({ title: '岗位管理', businessType: 'CREATE' })
  create(@Body() dto: CreatePostDto) {
    return this.postService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:post:edit')
  @OperLog({ title: '岗位管理', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
    return this.postService.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('system:post:delete')
  @OperLog({ title: '岗位管理', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.postService.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
