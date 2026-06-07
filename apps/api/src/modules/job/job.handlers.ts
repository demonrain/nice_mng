import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 定时任务处理器注册表。
 * 新增任务处理逻辑：在此注册 invokeTarget -> handler。
 * 前端创建任务时填写的 invokeTarget 必须命中这里的 key。
 */
@Injectable()
export class JobHandlers {
  private readonly logger = new Logger('JobHandlers');
  private readonly handlers = new Map<string, (params?: string) => Promise<string>>();

  constructor(private readonly prisma: PrismaService) {
    this.register('demoTask', async (params) => {
      this.logger.log(`demoTask 执行，参数: ${params ?? '无'}`);
      return `demoTask 执行成功 @ ${new Date().toISOString()}`;
    });

    this.register('cleanLoginLog', async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const res = await this.prisma.loginLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      return `清理 30 天前登录日志 ${res.count} 条`;
    });

    this.register('cleanOperLog', async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const res = await this.prisma.operLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      return `清理 30 天前操作日志 ${res.count} 条`;
    });
  }

  register(name: string, fn: (params?: string) => Promise<string>) {
    this.handlers.set(name, fn);
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  list(): string[] {
    return [...this.handlers.keys()];
  }

  async invoke(name: string, params?: string): Promise<string> {
    const fn = this.handlers.get(name);
    if (!fn) throw new Error(`未注册的任务处理器: ${name}`);
    return fn(params);
  }
}
