import { lazy, type ComponentType } from 'react';

// 预收集所有页面组件，按后端返回的 component 路径动态匹配
const modules = import.meta.glob('../pages/**/*.tsx');

/**
 * 将后端菜单的 component 字段（如 'system/user/index'）映射为懒加载组件。
 * 约定页面位于 src/pages 下。
 */
export function resolvePageComponent(component?: string | null): ComponentType {
  if (!component) {
    return lazy(() => import('../pages/common/Blank'));
  }
  const normalized = component.replace(/^\//, '');
  const key = `../pages/${normalized}.tsx`;
  const indexKey = `../pages/${normalized}/index.tsx`;
  const loader = modules[key] || modules[indexKey];
  if (!loader) {
    return lazy(() => import('../pages/common/NotFound'));
  }
  return lazy(loader as () => Promise<{ default: ComponentType }>);
}
