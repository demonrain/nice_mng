/** 菜单类型：目录 / 菜单 / 按钮 */
export type MenuType = 'DIR' | 'MENU' | 'BUTTON';

/** 数据权限范围 */
export type DataScope =
  | 'ALL' // 全部数据
  | 'CUSTOM' // 自定义部门
  | 'DEPT' // 本部门
  | 'DEPT_AND_CHILD' // 本部门及以下
  | 'SELF'; // 仅本人

export interface MenuMeta {
  title: string;
  icon?: string | null;
  /** 是否在菜单中隐藏 */
  hidden?: boolean;
  /** 是否缓存页面 */
  keepAlive?: boolean;
  /** 外链地址 */
  link?: string | null;
}

/** 前端动态路由节点（由后端菜单生成） */
export interface RouteItem {
  id: number;
  parentId: number | null;
  path: string;
  name: string;
  /** 前端组件路径，如 'system/user/index' */
  component?: string | null;
  redirect?: string | null;
  meta: MenuMeta;
  /** 权限标识（BUTTON 类型用） */
  perm?: string | null;
  type: MenuType;
  children?: RouteItem[];
}

export interface TreeNode<T> {
  id: number;
  parentId: number | null;
  children?: T[];
}
