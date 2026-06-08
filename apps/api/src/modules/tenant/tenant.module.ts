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

class CreateTenantDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactPhone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() expireAt?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() status?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
}
class UpdateTenantDto extends PartialType(CreateTenantDto) {}

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationDto) {
    const where: Prisma.TenantWhereInput = query.keyword
      ? {
          OR: [
            { name: { contains: query.keyword, mode: 'insensitive' } },
            { code: { contains: query.keyword, mode: 'insensitive' } },
          ],
        }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.tenant.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  create(dto: CreateTenantDto) {
    const { expireAt, ...rest } = dto;
    return this.prisma.tenant.create({
      data: { ...rest, expireAt: expireAt ? new Date(expireAt) : null },
    });
  }

  update(id: number, dto: UpdateTenantDto) {
    const { expireAt, ...rest } = dto;
    return this.prisma.tenant.update({
      where: { id },
      data: { ...rest, ...(expireAt !== undefined ? { expireAt: expireAt ? new Date(expireAt) : null } : {}) },
    });
  }

  async remove(ids: number[]) {
    await this.prisma.tenant.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
}

@ApiTags('租户管理')
@ApiBearerAuth()
@Controller('system/tenant')
export class TenantController {
  constructor(private readonly service: TenantService) {}

  @Get()
  @RequirePermissions('system:tenant:list')
  list(@Query() query: PaginationDto) {
    return this.service.list(query);
  }

  @HttpPost()
  @RequirePermissions('system:tenant:add')
  @OperLog({ title: '租户管理', businessType: 'CREATE' })
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:tenant:edit')
  @OperLog({ title: '租户管理', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTenantDto) {
    return this.service.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('system:tenant:delete')
  @OperLog({ title: '租户管理', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.service.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
