import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';

interface AccessProps {
  /** 需要的权限标识，满足其一即可 */
  perm: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** 按钮级权限控制：无权限则不渲染 children */
export function Access({ perm, children, fallback = null }: AccessProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return hasPermission(perm) ? <>{children}</> : <>{fallback}</>;
}

/** Hook 形式 */
export function useAccess() {
  return useAuthStore((s) => s.hasPermission);
}
