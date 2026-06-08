import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthUser } from '../decorators/current-user.decorator';
import { runWithTenant } from './tenant.context';

/**
 * 将当前登录用户的租户信息注入到 AsyncLocalStorage，
 * 使后续 Service 可通过 tenantWhere() 做行级隔离。
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;
    return runWithTenant(
      {
        tenantId: user?.tenantId ?? null,
        userId: user?.sub,
        isSuperAdmin: user?.isSuperAdmin ?? false,
      },
      () => next.handle(),
    );
  }
}
