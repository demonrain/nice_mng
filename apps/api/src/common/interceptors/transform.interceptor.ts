import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, BizCode } from '@nice-admin/shared';

/** 统一响应信封：{ code, message, data, timestamp } */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: BizCode.SUCCESS,
        message: 'ok',
        data: data as T,
        timestamp: Date.now(),
      })),
    );
  }
}
