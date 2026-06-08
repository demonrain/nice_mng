import { useMemo } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import type { RouteItem } from '@nice-admin/shared';
import { useMenuStore } from '@/store/menu';
import { renderIcon } from '@/utils/icon';

type MenuItem = Required<MenuProps>['items'][number];

function buildItems(routes: RouteItem[]): MenuItem[] {
  return routes
    .filter((r) => r.type !== 'BUTTON' && !r.meta.hidden)
    .map((r) => {
      const children = r.children ? buildItems(r.children) : [];
      return {
        key: r.path,
        icon: renderIcon(r.meta.icon),
        label: r.meta.title,
        children: children.length ? children : undefined,
      } as MenuItem;
    });
}

interface SiderMenuProps {
  mode?: 'inline' | 'horizontal';
  theme?: 'dark' | 'light';
}

export default function SiderMenu({ mode = 'inline', theme = 'dark' }: SiderMenuProps) {
  const routes = useMenuStore((s) => s.routes);
  const navigate = useNavigate();
  const location = useLocation();

  const items = useMemo(() => buildItems(routes), [routes]);
  const openKeys = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts.map((_, i) => '/' + parts.slice(0, i + 1).join('/'));
  }, [location.pathname]);

  return (
    <Menu
      mode={mode}
      theme={theme}
      selectedKeys={[location.pathname]}
      defaultOpenKeys={mode === 'inline' ? openKeys : undefined}
      items={items}
      onClick={({ key }) => navigate(key)}
      style={{ borderInlineEnd: 'none', flex: mode === 'horizontal' ? 1 : undefined, minWidth: 0 }}
    />
  );
}
