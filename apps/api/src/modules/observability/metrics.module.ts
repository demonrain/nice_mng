import {
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  Header,
  Injectable,
  Module,
  NestInterceptor,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  private readonly httpRequests: Counter<string>;
  private readonly httpDuration: Histogram<string>;
  private startedAt = Date.now();

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'HTTP 请求总数',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP 请求耗时(秒)',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
      registers: [this.registry],
    });
  }

  record(method: string, route: string, status: number, durationMs: number) {
    this.httpRequests.inc({ method, route, status });
    this.httpDuration.observe({ method, route }, durationMs / 1000);
  }

  metrics() {
    return this.registry.metrics();
  }

  async summary() {
    const json = await this.registry.getMetricsAsJSON();
    const total = json.find((m) => m.name === 'http_requests_total');
    const requestCount = total?.values?.reduce((s, v) => s + (v.value || 0), 0) ?? 0;
    return {
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      requestCount,
      metricNames: json.map((m) => m.name),
    };
  }
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const route = req.route?.path ?? req.url?.split('?')[0] ?? 'unknown';
        this.metrics.record(req.method, route, res.statusCode, Date.now() - start);
      }),
    );
  }
}

@ApiTags('可观测性')
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Prometheus 指标(公开，可加白名单/网关保护)' })
  prometheus() {
    return this.metrics.metrics();
  }

  @Get('monitor/metrics/summary')
  @RequirePermissions('monitor:server:view')
  @ApiOperation({ summary: '指标概览(健康看板用)' })
  summary() {
    return this.metrics.summary();
  }
}

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
