import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { Layout, Breadcrumb, Button, Dropdown, Avatar, Select, Spin, theme as antdTheme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import SiderMenu from './SiderMenu';
import SettingsDrawer from './SettingsDrawer';
import MessageBell from './MessageBell';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { useMenuStore } from '@/store/menu';
import { useSocket } from '@/hooks/useSocket';

const { Header, Sider, Content } = Layout;

export default function MainLayout({ children }: { children?: ReactNode }) {
  const { collapsed, toggleCollapsed, lang, setLang, layoutMode } = useAppStore();
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const flatMenus = useMenuStore((s) => s.flatMenus);
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { token } = antdTheme.useToken();

  useSocket(() => {});

  const breadcrumbItems = useMemo(() => {
    const current = flatMenus.find((m) => m.path === location.pathname);
    const items = [{ title: '首页' }];
    if (current) items.push({ title: current.meta.title });
    return items;
  }, [flatMenus, location.pathname]);

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'profile') navigate('/profile');
      if (key === 'logout') {
        logout();
        navigate('/login');
      }
    },
  };

  const brand = (
    <div className="nice-logo" style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
      <span style={{ color: token.colorPrimary, fontSize: 22 }}>◆</span>
      {(!collapsed || layoutMode !== 'side') && <span>nice-admin</span>}
    </div>
  );

  const rightTools = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <MessageBell />
      <SettingOutlined style={{ fontSize: 16, cursor: 'pointer' }} onClick={() => setSettingsOpen(true)} />
      <Select
        size="small"
        value={lang}
        style={{ width: 90 }}
        onChange={(v) => setLang(v)}
        options={[
          { label: '简体中文', value: 'zh' },
          { label: 'English', value: 'en' },
        ]}
      />
      <Dropdown menu={userMenu}>
        <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size="small" src={profile?.avatar || undefined} icon={<UserOutlined />} />
          {profile?.nickname || profile?.username}
        </span>
      </Dropdown>
    </div>
  );

  const headerBase = {
    padding: '0 16px',
    background: token.colorBgContainer,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
  } as const;

  const contentWrap = (
    <Content style={{ margin: 16, padding: 16, background: token.colorBgContainer, borderRadius: 8 }}>
      <Suspense fallback={<Spin style={{ width: '100%', marginTop: 80 }} />}>{children}</Suspense>
    </Content>
  );

  // 顶部布局：水平菜单，无侧边栏
  if (layoutMode === 'top') {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ ...headerBase, padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, minWidth: 0 }}>
            {brand}
            <SiderMenu mode="horizontal" theme="light" />
          </div>
          {rightTools}
        </Header>
        {contentWrap}
        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Layout>
    );
  }

  // 侧边 / 混合布局
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={220} theme="dark">
        <div className="nice-logo">
          <span style={{ color: token.colorPrimary, fontSize: 22 }}>◆</span>
          {!collapsed && <span>nice-admin</span>}
        </div>
        <SiderMenu />
      </Sider>
      <Layout>
        <Header style={headerBase}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
            />
            <Breadcrumb items={breadcrumbItems} />
          </div>
          {rightTools}
        </Header>
        {contentWrap}
      </Layout>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Layout>
  );
}
