import { Controller, Delete, Get, Injectable, Module, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as si from 'systeminformation';
import * as os from 'os';
import { SystemMetrics } from '@nice-admin/shared';
import { RedisService } from '../../redis/redis.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { NotificationModule } from '../notification/notification.module';
import { NotificationGateway } from '../notification/notification.gateway';
import { PermissionService } from '../auth/permission.service';

@Injectable()
export class MonitorService {
  constructor(
    private readonly redis: RedisService,
    private readonly gateway: NotificationGateway,
    private readonly permissionService: PermissionService,
  ) {}

  async getServerMetrics(): Promise<SystemMetrics & { diskList: unknown[] }> {
    const [cpu, mem, fsSize, currentLoad] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
    ]);
    const mainDisk = fsSize[0] || { size: 0, used: 0 };
    return {
      cpu: { usage: Number(currentLoad.currentLoad.toFixed(2)), cores: cpu.cores },
      memory: {
        total: mem.total,
        used: mem.active,
        usage: Number(((mem.active / mem.total) * 100).toFixed(2)),
      },
      disk: {
        total: mainDisk.size,
        used: mainDisk.used,
        usage: mainDisk.size ? Number(((mainDisk.used / mainDisk.size) * 100).toFixed(2)) : 0,
      },
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      node: { version: process.version, pid: process.pid },
      diskList: fsSize.map((d) => ({ fs: d.fs, type: d.type, size: d.size, used: d.used, use: d.use, mount: d.mount })),
    };
  }

  async getCacheInfo() {
    const client = this.redis.getClient();
    const info = await client.info();
    const dbSize = await client.dbsize();
    const parsed: Record<string, string> = {};
    info.split('\n').forEach((line) => {
      const [k, v] = line.split(':');
      if (k && v) parsed[k.trim()] = v.trim();
    });
    return {
      dbSize,
      version: parsed['redis_version'],
      uptime: parsed['uptime_in_seconds'],
      memoryUsed: parsed['used_memory_human'],
      connectedClients: parsed['connected_clients'],
      commandsProcessed: parsed['total_commands_processed'],
      hitRate:
        parsed['keyspace_hits'] && parsed['keyspace_misses']
          ? Number(
              (
                (Number(parsed['keyspace_hits']) /
                  (Number(parsed['keyspace_hits']) + Number(parsed['keyspace_misses']) || 1)) *
                100
              ).toFixed(2),
            )
          : 0,
    };
  }

  getOnlineUsers() {
    return this.gateway.getOnlineList();
  }

  async forceLogout(socketId: string) {
    const client = this.gateway.getOnlineList().find((c) => c.socketId === socketId);
    if (client) await this.permissionService.clearUserAuth(client.userId);
    const ok = this.gateway.forceLogout(socketId);
    return { success: ok };
  }
}

@ApiTags('系统监控')
@ApiBearerAuth()
@Controller('monitor')
export class MonitorController {
  constructor(private readonly service: MonitorService) {}

  @Get('server')
  @RequirePermissions('monitor:server:view')
  @ApiOperation({ summary: '服务器监控指标' })
  server() {
    return this.service.getServerMetrics();
  }

  @Get('cache')
  @RequirePermissions('monitor:server:view')
  @ApiOperation({ summary: 'Redis 缓存监控' })
  cache() {
    return this.service.getCacheInfo();
  }

  @Get('online')
  @RequirePermissions('monitor:online:list')
  @ApiOperation({ summary: '在线用户列表' })
  online() {
    return this.service.getOnlineUsers();
  }

  @Delete('online/:socketId')
  @RequirePermissions('monitor:online:forceLogout')
  @ApiOperation({ summary: '强制下线' })
  forceLogout(@Param('socketId') socketId: string) {
    return this.service.forceLogout(socketId);
  }
}

@Module({
  imports: [NotificationModule],
  controllers: [MonitorController],
  providers: [MonitorService],
})
export class MonitorModule {}
