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
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: OperLogInterceptor },
  ],
})
export class AppModule {}
