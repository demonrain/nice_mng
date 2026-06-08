import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  sub: number;
  username: string;
  isSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
  deptId?: number | null;
  dataScopes?: string[];
  tenantId?: number | null;
}

/** 从请求中取出当前登录用户（由 JwtStrategy 注入） */
export const CurrentUser = createParamDecorator((data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as AuthUser;
  return data ? user?.[data] : user;
});
