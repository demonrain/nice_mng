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
import { IsArray, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OperLog } from '../../common/decorators/oper-log.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { NotificationModule } from '../notification/notification.module';
import { NotificationGateway } from '../notification/notification.gateway';
import { WS_EVENTS } from '@nice-admin/shared';
import { MessageChannelService } from './message.channels';

class CreateTemplateDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() code!: string;
  @ApiPropertyOptional({ description: 'INTERNAL/EMAIL/SMS/WEBHOOK' }) @IsString() @IsOptional() channel?: string;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty({ description: '支持 {{var}} 占位' }) @IsString() content!: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() status?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() remark?: string;
}
class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}

class SendMessageDto {
  @ApiPropertyOptional({ description: '直接发送的标题（不使用模板时）' })
  @IsString() @IsOptional() title?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() content?: string;
  @ApiPropertyOptional({ description: '模板 code（优先于 title/content）' })
  @IsString() @IsOptional() templateCode?: string;
  @ApiPropertyOptional({ description: '模板变量' })
  @IsObject() @IsOptional() variables?: Record<string, unknown>;
  @ApiPropertyOptional({ description: '通道，默认 INTERNAL' })
  @IsString() @IsOptional() channel?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() type?: string;
  @ApiPropertyOptional({ description: '目标用户 id 列表；为空=全员' })
  @IsArray() @IsOptional() userIds?: number[];
}

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly channels: MessageChannelService,
    private readonly gateway: NotificationGateway,
  ) {}

  // ---------- 模板 ----------
  async listTemplates(query: PaginationDto) {
    const where: Prisma.MessageTemplateWhereInput = query.keyword
      ? { name: { contains: query.keyword, mode: 'insensitive' } }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.messageTemplate.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.messageTemplate.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }
  createTemplate(dto: CreateTemplateDto) {
    return this.prisma.messageTemplate.create({ data: dto });
  }
  updateTemplate(id: number, dto: UpdateTemplateDto) {
    return this.prisma.messageTemplate.update({ where: { id }, data: dto });
  }
  async removeTemplates(ids: number[]) {
    await this.prisma.messageTemplate.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }

  // ---------- 发送 ----------
  async send(dto: SendMessageDto, senderId: number) {
    let title = dto.title ?? '';
    let content = dto.content ?? '';
    let channel = dto.channel ?? 'INTERNAL';

    if (dto.templateCode) {
      const tpl = await this.prisma.messageTemplate.findUnique({ where: { code: dto.templateCode } });
      if (tpl) {
        title = MessageChannelService.render(tpl.title, dto.variables);
        content = MessageChannelService.render(tpl.content, dto.variables);
        channel = tpl.channel;
      }
    }

    // 目标用户
    const targets = dto.userIds?.length
      ? await this.prisma.user.findMany({ where: { id: { in: dto.userIds } } })
      : await this.prisma.user.findMany({ where: { status: 1 } });

    const message = await this.prisma.message.create({
      data: { title, content, type: dto.type ?? 'NOTICE', channel, senderId },
    });

    // 站内信回执 + 实时推送
    if (targets.length) {
      await this.prisma.messageReceipt.createMany({
        data: targets.map((u) => ({ messageId: message.id, userId: u.id })),
      });
      for (const u of targets) {
        this.gateway.sendToUser(u.id, WS_EVENTS.NOTICE, { title, content, type: dto.type ?? 'NOTICE', time: Date.now() });
      }
    }

    // 外部通道（非 INTERNAL）
    let channelResult: { ok: boolean; message?: string } = { ok: true };
    if (channel !== 'INTERNAL') {
      const to = targets.map((u) => u.email).filter(Boolean).join(',');
      channelResult = await this.channels.dispatch(channel, { title, content, to });
    }

    return { messageId: message.id, receivers: targets.length, channel, channelResult };
  }

  // ---------- 我的站内信 ----------
  async myMessages(userId: number, query: PaginationDto) {
    const where: Prisma.MessageReceiptWhereInput = { userId };
    const [list, total] = await this.prisma.$transaction([
      this.prisma.messageReceipt.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { id: 'desc' },
        include: { message: true },
      }),
      this.prisma.messageReceipt.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async unreadCount(userId: number) {
    const count = await this.prisma.messageReceipt.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markRead(userId: number, receiptId: number) {
    await this.prisma.messageReceipt.updateMany({
      where: { id: receiptId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    return null;
  }

  async markAllRead(userId: number) {
    await this.prisma.messageReceipt.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return null;
  }
}

@ApiTags('消息中心')
@ApiBearerAuth()
@Controller('system/message')
export class MessageController {
  constructor(private readonly service: MessageService) {}

  @Get('template')
  @RequirePermissions('system:message:list')
  listTemplates(@Query() query: PaginationDto) {
    return this.service.listTemplates(query);
  }

  @HttpPost('template')
  @RequirePermissions('system:message:add')
  @OperLog({ title: '消息模板', businessType: 'CREATE' })
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Put('template/:id')
  @RequirePermissions('system:message:edit')
  @OperLog({ title: '消息模板', businessType: 'UPDATE' })
  updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(id, dto);
  }

  @Delete('template/:ids')
  @RequirePermissions('system:message:delete')
  @OperLog({ title: '消息模板', businessType: 'DELETE' })
  removeTemplate(@Param('ids') ids: string) {
    return this.service.removeTemplates(ids.split(',').map((s) => parseInt(s, 10)));
  }

  @HttpPost('send')
  @RequirePermissions('system:message:send')
  @OperLog({ title: '发送消息', businessType: 'OTHER' })
  @ApiOperation({ summary: '发送消息(站内/邮件/webhook)' })
  send(@Body() dto: SendMessageDto, @CurrentUser() user: AuthUser) {
    return this.service.send(dto, user.sub);
  }

  // —— 个人收件箱（登录可用） ——
  @Get('mine')
  @ApiOperation({ summary: '我的站内信' })
  mine(@Query() query: PaginationDto, @CurrentUser() user: AuthUser) {
    return this.service.myMessages(user.sub, query);
  }

  @Get('unread')
  @ApiOperation({ summary: '未读数' })
  unread(@CurrentUser() user: AuthUser) {
    return this.service.unreadCount(user.sub);
  }

  @Put('read/:id')
  @ApiOperation({ summary: '标记已读' })
  read(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.markRead(user.sub, id);
  }

  @Put('read-all')
  @ApiOperation({ summary: '全部已读' })
  readAll(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user.sub);
  }
}

@Module({
  imports: [NotificationModule],
  controllers: [MessageController],
  providers: [MessageService, MessageChannelService],
})
export class MessageModule {}
