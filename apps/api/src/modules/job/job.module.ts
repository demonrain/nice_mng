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
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';
import { JobHandlers } from './job.handlers';
import { JobScheduler } from './job.scheduler';

class CreateJobDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() group?: string;
  @ApiProperty({ description: '处理器名称' }) @IsString() invokeTarget!: string;
  @ApiProperty({ description: 'cron 表达式' }) @IsString() cron!: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() concurrent?: boolean;
  @ApiPropertyOptional({ description: '1 运行 0 暂停' }) @IsInt() @IsOptional() status?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
}
class UpdateJobDto extends PartialType(CreateJobDto) {}
class QueryJobDto extends PaginationDto {}

@Injectable()
export class JobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handlers: JobHandlers,
    private readonly scheduler: JobScheduler,
  ) {}

  handlerList() {
    return this.handlers.list();
  }

  async list(query: QueryJobDto) {
    const where: Prisma.JobWhereInput = query.keyword
      ? { name: { contains: query.keyword, mode: 'insensitive' } }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.job.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async create(dto: CreateJobDto) {
    if (!this.handlers.has(dto.invokeTarget)) {
      throw new BadRequestException(`未注册的处理器: ${dto.invokeTarget}，可用: ${this.handlers.list().join(', ')}`);
    }
    const job = await this.prisma.job.create({ data: dto });
    if (job.status === 1) this.scheduler.schedule(job);
    return job;
  }

  async update(id: number, dto: UpdateJobDto) {
    if (dto.invokeTarget && !this.handlers.has(dto.invokeTarget)) {
      throw new BadRequestException(`未注册的处理器: ${dto.invokeTarget}`);
    }
    const job = await this.prisma.job.update({ where: { id }, data: dto });
    this.scheduler.unschedule(id);
    if (job.status === 1) this.scheduler.schedule(job);
    return job;
  }

  async changeStatus(id: number, status: number) {
    const job = await this.prisma.job.update({ where: { id }, data: { status } });
    this.scheduler.unschedule(id);
    if (status === 1) this.scheduler.schedule(job);
    return job;
  }

  async runOnce(id: number) {
    await this.scheduler.execute(id);
    return null;
  }

  async remove(ids: number[]) {
    ids.forEach((id) => this.scheduler.unschedule(id));
    await this.prisma.job.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }

  async logs(jobId: number, query: PaginationDto) {
    const where = jobId ? { jobId } : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.jobLog.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.jobLog.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }
}

@ApiTags('定时任务')
@ApiBearerAuth()
@Controller('monitor/job')
export class JobController {
  constructor(private readonly service: JobService) {}

  @Get('handlers')
  @RequirePermissions('monitor:job:list')
  @ApiOperation({ summary: '可用处理器列表' })
  handlers() {
    return this.service.handlerList();
  }

  @Get('logs')
  @RequirePermissions('monitor:job:list')
  logs(@Query('jobId') jobId: string, @Query() query: PaginationDto) {
    return this.service.logs(jobId ? parseInt(jobId, 10) : 0, query);
  }

  @Get()
  @RequirePermissions('monitor:job:list', 'monitor:job:query')
  list(@Query() query: QueryJobDto) {
    return this.service.list(query);
  }

  @HttpPost()
  @RequirePermissions('monitor:job:add')
  @OperLog({ title: '定时任务', businessType: 'CREATE' })
  create(@Body() dto: CreateJobDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('monitor:job:edit')
  @OperLog({ title: '定时任务', businessType: 'UPDATE' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJobDto) {
    return this.service.update(id, dto);
  }

  @Put(':id/status/:status')
  @RequirePermissions('monitor:job:changeStatus')
  @OperLog({ title: '定时任务', businessType: 'UPDATE' })
  changeStatus(@Param('id', ParseIntPipe) id: number, @Param('status', ParseIntPipe) status: number) {
    return this.service.changeStatus(id, status);
  }

  @HttpPost(':id/run')
  @RequirePermissions('monitor:job:run')
  @OperLog({ title: '定时任务', businessType: 'OTHER' })
  runOnce(@Param('id', ParseIntPipe) id: number) {
    return this.service.runOnce(id);
  }

  @Delete(':ids')
  @RequirePermissions('monitor:job:delete')
  @OperLog({ title: '定时任务', businessType: 'DELETE' })
  remove(@Param('ids') ids: string) {
    return this.service.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [JobController],
  providers: [JobService, JobHandlers, JobScheduler],
})
export class JobModule {}
