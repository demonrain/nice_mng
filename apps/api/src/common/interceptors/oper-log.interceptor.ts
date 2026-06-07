import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { OPER_LOG_KEY, OperLogOptions } from '../decorators/oper-log.decorator';
import { AuthUser } from '../decorators/current-user.decorator';
import { getClientIp } from '../utils/request.util';

@Injectable()
export class OperLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<OperLogOptions>(OPER_LOG_KEY, context.getHandler());
    if (!options) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUser | undefined;
    const start = Date.now();
    const baseData = {
      title: options.title,
      businessType: options.businessType || 'OTHER',
      method: `${context.getClass().name}.${context.getHandler().name}`,
      requestMethod: req.method,
      url: req.originalUrl,
      ip: getClientIp(req),
      params: this.safeStringify({ body: req.body, query: req.query, params: req.params }),
      operatorId: user?.sub,
      operName: user?.username,
    };

    return next.handle().pipe(
      tap((result) => {
        void this.write({
          ...baseData,
          status: 1,
          result: this.safeStringify(result),
          costMs: Date.now() - start,
        });
      }),
      catchError((err) => {
        void this.write({
          ...baseData,
          status: 0,
          errorMsg: (err as Error)?.message?.slice(0, 2000),
          costMs: Date.now() - start,
        });
        return throwError(() => err);
      }),
    );
  }

  private safeStringify(obj: unknown): string {
    try {
      const str = JSON.stringify(obj);
      return str.length > 4000 ? str.slice(0, 4000) : str;
    } catch {
      return '';
    }
  }

  private async write(data: Record<string, unknown>) {
    try {
      await this.prisma.operLog.create({ data: data as never });
    } catch {
      // 日志写入失败不影响主流程
    }
  }
}
