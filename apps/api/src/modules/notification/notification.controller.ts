import { Body, Controller, Injectable, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { NotificationGateway } from './notification.gateway';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

class BroadcastDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() content!: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() type?: string;
}

@Injectable()
export class NotificationService {
  constructor(private readonly gateway: NotificationGateway) {}

  broadcast(dto: BroadcastDto) {
    this.gateway.broadcastNotice(dto);
    return { sent: this.gateway.getOnlineList().length };
  }
}

@ApiTags('实时通知')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post('broadcast')
  @RequirePermissions('system:notice:add')
  @ApiOperation({ summary: '广播通知给所有在线用户' })
  broadcast(@Body() dto: BroadcastDto) {
    return this.service.broadcast(dto);
  }
}
