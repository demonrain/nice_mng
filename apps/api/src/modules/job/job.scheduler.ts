import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Job } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JobHandlers } from './job.handlers';

@Injectable()
export class JobScheduler implements OnModuleInit {
  private readonly logger = new Logger('JobScheduler');

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: SchedulerRegistry,
    private readonly handlers: JobHandlers,
  ) {}

  async onModuleInit() {
    const jobs = await this.prisma.job.findMany({ where: { status: 1 } });
    for (const job of jobs) {
      try {
        this.schedule(job);
      } catch (e) {
        this.logger.error(`恢复任务失败 #${job.id}: ${(e as Error).message}`);
      }
    }
    this.logger.log(`已恢复 ${jobs.length} 个定时任务`);
  }

  private cronKey(id: number) {
    return `job_${id}`;
  }

  schedule(job: Job) {
    this.unschedule(job.id);
    const cronJob = new CronJob(job.cron, () => {
      void this.execute(job.id);
    });
    this.registry.addCronJob(this.cronKey(job.id), cronJob as never);
    cronJob.start();
  }

  unschedule(id: number) {
    const key = this.cronKey(id);
    try {
      if (this.registry.doesExist('cron', key)) {
        this.registry.deleteCronJob(key);
      }
    } catch {
      // 忽略不存在
    }
  }

  /** 立即执行一次并记录日志 */
  async execute(id: number): Promise<void> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) return;
    const start = Date.now();
    let status = 1;
    let message = '';
    try {
      message = await this.handlers.invoke(job.invokeTarget);
    } catch (e) {
      status = 0;
      message = (e as Error).message;
    }
    await this.prisma.jobLog.create({
      data: {
        jobId: job.id,
        jobName: job.name,
        invokeTarget: job.invokeTarget,
        status,
        message: message.slice(0, 2000),
        costMs: Date.now() - start,
      },
    });
  }
}
