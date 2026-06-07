import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { Layout, Breadcrumb, Button, Dropdown, Avatar, Switch, Select, Badge, Spin, theme as antdTheme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import SiderMenu from './SiderMenu';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { useMenuStore } from '@/store/menu';
import { useSocket } from '@/hooks/useSocket';

const { Header, Sider, Content } = Layout;

export default function MainLayout({ children }: { children?: ReactNode }) {
  const { collapsed, toggleCollapsed, theme, setTheme, lang, setLang } = useAppStore();
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const flatMenus = useMenuStore((s) => s.flatMenus);
  const navigate = useNavigate();
  const location = useLocation();
  const [onlineCount, setOnlineCount] = useState(0);
  const { token } = antdTheme.useToken();

  useSocket(setOnlineCount);

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
        <Header
          style={{
            padding: '0 16px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
            />
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Badge count={onlineCount} size="small" title="在线用户" showZero>
              <BellOutlined style={{ fontSize: 18 }} />
            </Badge>
            <BulbOutlined />
            <Switch
              checked={theme === 'dark'}
              checkedChildren="暗"
              unCheckedChildren="亮"
              onChange={(c) => setTheme(c ? 'dark' : 'light')}
            />
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
        </Header>
        <Content style={{ margin: 16, padding: 16, background: token.colorBgContainer, borderRadius: 8 }}>
          <Suspense fallback={<Spin style={{ width: '100%', marginTop: 80 }} />}>
            {children}
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  );
}
