import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { IsBoolean, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { NotificationModule } from '../notification/notification.module';
import { NotificationGateway } from '../notification/notification.gateway';
import { WS_EVENTS } from '@nice-admin/shared';

/** 审批节点：顺序审批 */
interface WfNode {
  key: string;
  name: string;
  assigneeId?: number;
}

class CreateDefDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() category?: string;
  @ApiPropertyOptional({ description: '节点 JSON 数组字符串' }) @IsString() @IsOptional() nodes?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() status?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
}
class UpdateDefDto extends PartialType(CreateDefDto) {}

class StartDto {
  @ApiProperty() @IsString() defCode!: string;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsObject() @IsOptional() formData?: Record<string, unknown>;
  @ApiPropertyOptional() @IsString() @IsOptional() businessKey?: string;
}
class ActDto {
  @ApiProperty({ description: 'true=通过 false=驳回' }) @IsBoolean() approve!: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() comment?: string;
}

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  private parseNodes(json: string): WfNode[] {
    try {
      const arr = JSON.parse(json || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  // ---------- 流程定义 ----------
  async listDefs(query: PaginationDto) {
    const where: Prisma.WorkflowDefWhereInput = query.keyword
      ? { name: { contains: query.keyword, mode: 'insensitive' } }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.workflowDef.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.workflowDef.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }
  createDef(dto: CreateDefDto) {
    return this.prisma.workflowDef.create({ data: dto });
  }
  updateDef(id: number, dto: UpdateDefDto) {
    return this.prisma.workflowDef.update({ where: { id }, data: dto });
  }
  async removeDefs(ids: number[]) {
    await this.prisma.workflowDef.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }

  // ---------- 流程实例 ----------
  async start(dto: StartDto, initiatorId: number) {
    const def = await this.prisma.workflowDef.findUnique({ where: { code: dto.defCode } });
    if (!def || def.status !== 1) throw new BadRequestException('流程定义不存在或已停用');
    const nodes = this.parseNodes(def.nodes);

    const instance = await this.prisma.workflowInstance.create({
      data: {
        defId: def.id,
        defCode: def.code,
        title: dto.title,
        businessKey: dto.businessKey,
        formData: JSON.stringify(dto.formData ?? {}),
        initiatorId,
        status: nodes.length ? 'RUNNING' : 'APPROVED',
        currentNode: nodes[0]?.key,
        nodeIndex: 0,
      },
    });

    if (nodes.length) await this.createTask(instance.id, nodes[0]);
    return instance;
  }

  private async createTask(instanceId: number, node: WfNode) {
    const task = await this.prisma.workflowTask.create({
      data: { instanceId, nodeKey: node.key, nodeName: node.name, assigneeId: node.assigneeId },
    });
    if (node.assigneeId) {
      this.gateway.sendToUser(node.assigneeId, WS_EVENTS.NOTICE, {
        title: '待办提醒',
        content: `您有一条新的审批任务：${node.name}`,
        type: 'TODO',
        time: Date.now(),
      });
    }
    return task;
  }

  async myTasks(userId: number, query: PaginationDto) {
    const where: Prisma.WorkflowTaskWhereInput = { assigneeId: userId, status: 'PENDING' };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.workflowTask.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { id: 'desc' },
        include: { instance: true },
      }),
      this.prisma.workflowTask.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async act(taskId: number, user: AuthUser, dto: ActDto) {
    const task = await this.prisma.workflowTask.findUnique({ where: { id: taskId }, include: { instance: true } });
    if (!task) throw new NotFoundException('任务不存在');
    if (task.status !== 'PENDING') throw new BadRequestException('任务已处理');
    if (!user.isSuperAdmin && task.assigneeId && task.assigneeId !== user.sub) {
      throw new ForbiddenException('无权处理该任务');
    }

    await this.prisma.workflowTask.update({
      where: { id: taskId },
      data: {
        status: dto.approve ? 'APPROVED' : 'REJECTED',
        comment: dto.comment,
        actedAt: new Date(),
        assigneeId: task.assigneeId ?? user.sub,
      },
    });

    const instance = task.instance;
    if (!dto.approve) {
      await this.prisma.workflowInstance.update({ where: { id: instance.id }, data: { status: 'REJECTED' } });
      this.notifyInitiator(instance.initiatorId, instance.title, false);
      return { status: 'REJECTED' };
    }

    const def = await this.prisma.workflowDef.findUnique({ where: { id: instance.defId } });
    const nodes = this.parseNodes(def?.nodes ?? '[]');
    const nextIndex = instance.nodeIndex + 1;
    if (nextIndex >= nodes.length) {
      await this.prisma.workflowInstance.update({ where: { id: instance.id }, data: { status: 'APPROVED', currentNode: null } });
      this.notifyInitiator(instance.initiatorId, instance.title, true);
      return { status: 'APPROVED' };
    }

    await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { nodeIndex: nextIndex, currentNode: nodes[nextIndex].key },
    });
    await this.createTask(instance.id, nodes[nextIndex]);
    return { status: 'RUNNING', nextNode: nodes[nextIndex].name };
  }

  private notifyInitiator(initiatorId: number, title: string, approved: boolean) {
    this.gateway.sendToUser(initiatorId, WS_EVENTS.NOTICE, {
      title: '审批结果',
      content: `您发起的「${title}」已${approved ? '审批通过' : '被驳回'}`,
      type: approved ? 'NOTICE' : 'ALERT',
      time: Date.now(),
    });
  }

  async listInstances(query: PaginationDto, user: AuthUser) {
    const where: Prisma.WorkflowInstanceWhereInput = {};
    if (!user.isSuperAdmin) where.initiatorId = user.sub;
    if (query.keyword) where.title = { contains: query.keyword, mode: 'insensitive' };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.workflowInstance.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.workflowInstance.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async instanceDetail(id: number) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id },
      include: { tasks: { orderBy: { id: 'asc' } } },
    });
    if (!instance) throw new NotFoundException('流程实例不存在');
    return instance;
  }
}

@ApiTags('工作流')
@ApiBearerAuth()
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  // 流程定义
  @Get('def')
  @RequirePermissions('workflow:def:list')
  listDefs(@Query() query: PaginationDto) {
    return this.service.listDefs(query);
  }
  @HttpPost('def')
  @RequirePermissions('workflow:def:add')
  @OperLog({ title: '流程定义', businessType: 'CREATE' })
  createDef(@Body() dto: CreateDefDto) {
    return this.service.createDef(dto);
  }
  @Put('def/:id')
  @RequirePermissions('workflow:def:edit')
  @OperLog({ title: '流程定义', businessType: 'UPDATE' })
  updateDef(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDefDto) {
    return this.service.updateDef(id, dto);
  }
  @Delete('def/:ids')
  @RequirePermissions('workflow:def:delete')
  @OperLog({ title: '流程定义', businessType: 'DELETE' })
  removeDef(@Param('ids') ids: string) {
    return this.service.removeDefs(ids.split(',').map((s) => parseInt(s, 10)));
  }

  // 实例与任务（登录可用）
  @HttpPost('start')
  @ApiOperation({ summary: '发起流程' })
  start(@Body() dto: StartDto, @CurrentUser() user: AuthUser) {
    return this.service.start(dto, user.sub);
  }

  @Get('task/mine')
  @ApiOperation({ summary: '我的待办' })
  myTasks(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.service.myTasks(user.sub, query);
  }

  @HttpPost('task/:id/act')
  @OperLog({ title: '审批任务', businessType: 'OTHER' })
  @ApiOperation({ summary: '审批(通过/驳回)' })
  act(@Param('id', ParseIntPipe) id: number, @Body() dto: ActDto, @CurrentUser() user: AuthUser) {
    return this.service.act(id, user, dto);
  }

  @Get('instance')
  @ApiOperation({ summary: '流程实例列表' })
  listInstances(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.service.listInstances(query, user);
  }

  @Get('instance/:id')
  @ApiOperation({ summary: '流程实例详情' })
  instanceDetail(@Param('id', ParseIntPipe) id: number) {
    return this.service.instanceDetail(id);
  }
}

@Module({
  imports: [NotificationModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
})
export class WorkflowModule {}
