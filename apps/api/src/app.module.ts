import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { OperLogInterceptor } from './common/interceptors/oper-log.interceptor';
import { HealthController } from './health.controller';

// RBAC
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { MenuModule } from './modules/menu/menu.module';
import { DeptModule } from './modules/dept/dept.module';
import { PostModule } from './modules/post/post.module';

// 系统
import { DictModule } from './modules/dict/dict.module';
import { SysConfigModule } from './modules/config/config.module';
import { LogModule } from './modules/log/log.module';
import { FileModule } from './modules/file/file.module';
import { NoticeModule } from './modules/notice/notice.module';

// 高级
import { GenModule } from './modules/gen/gen.module';
import { FormSchemaModule } from './modules/form/form.module';
import { MonitorModule } from './modules/monitor/monitor.module';
import { JobModule } from './modules/job/job.module';
import { NotificationModule } from './modules/notification/notification.module';

// 二期
import { TenantModule } from './modules/tenant/tenant.module';
import { MessageModule } from './modules/message/message.module';
import { I18nModule } from './modules/i18n/i18n.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MetricsModule } from './modules/observability/metrics.module';
import { TenantInterceptor } from './common/tenant/tenant.interceptor';

/**
 * 可插拔业务模块：通过环境变量 DISABLED_MODULES（逗号分隔类名）按需禁用，
 * 实现轻量“插件/特性开关”机制。核心安全/RBAC 模块不可禁用。
 */
const OPTIONAL_MODULES = [
  TenantModule,
  MessageModule,
  I18nModule,
  WorkflowModule,
  DashboardModule,
];
const DISABLED = (process.env.DISABLED_MODULES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ENABLED_OPTIONAL = OPTIONAL_MODULES.filter((m) => !DISABLED.includes(m.name));

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    RoleModule,
    MenuModule,
    DeptModule,
    PostModule,
    DictModule,
    SysConfigModule,
    LogModule,
    FileModule,
    NoticeModule,
    GenModule,
    FormSchemaModule,
    MonitorModule,
    JobModule,
    NotificationModule,
    MetricsModule,
    ...ENABLED_OPTIONAL,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: OperLogInterceptor },
  ],
})
export class AppModule {}
