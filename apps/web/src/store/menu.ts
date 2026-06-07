import { create } from 'zustand';
import type { RouteItem } from '@nice-admin/shared';
import { authApi } from '@/api/endpoints';

interface MenuState {
  routes: RouteItem[];
  flatMenus: RouteItem[];
  loaded: boolean;
  loading: boolean;
  loadRoutes: () => Promise<void>;
  reset: () => void;
}

/** 收集所有可渲染的菜单节点（MENU 类型且有 component） */
function flatten(items: RouteItem[], acc: RouteItem[] = []): RouteItem[] {
  for (const item of items) {
    if (item.type === 'MENU' && item.component) acc.push(item);
    if (item.children?.length) flatten(item.children, acc);
  }
  return acc;
}

export const useMenuStore = create<MenuState>((set) => ({
  routes: [],
  flatMenus: [],
  loaded: false,
  loading: false,

  loadRoutes: async () => {
    set({ loading: true });
    try {
      const routes = await authApi.routes();
      set({ routes, flatMenus: flatten(routes), loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ routes: [], flatMenus: [], loaded: false }),
}));
