import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: number | null;
  userId?: number;
  isSuperAdmin?: boolean;
}

/**
 * 多租户请求上下文（基于 AsyncLocalStorage）。
 * 业务模块可调用 getTenantId() 取当前租户，并用 tenantWhere() 拼接行级过滤。
 */
export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function runWithTenant<T>(store: TenantStore, fn: () => T): T {
  return tenantStorage.run(store, fn);
}

export function getTenantStore(): TenantStore | undefined {
  return tenantStorage.getStore();
}

export function getTenantId(): number | null {
  return tenantStorage.getStore()?.tenantId ?? null;
}

/**
 * 生成租户过滤条件。超管或未启用租户时返回空对象（不过滤）。
 * 用法：prisma.xxx.findMany({ where: { ...tenantWhere(), ...其他条件 } })
 * 注意：仅对含 tenantId 字段的业务表使用。
 */
export function tenantWhere(): { tenantId?: number } {
  const store = tenantStorage.getStore();
  if (!store || store.isSuperAdmin || store.tenantId == null) return {};
  return { tenantId: store.tenantId };
}
