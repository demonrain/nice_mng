import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import MainLayout from '@/layout/MainLayout';
import Login from '@/pages/login';
import NotFound from '@/pages/common/NotFound';
import Profile from '@/pages/profile';
import { useAuthStore } from '@/store/auth';
import { useMenuStore } from '@/store/menu';
import { resolvePageComponent } from './lazy-pages';

/** 鉴权 + 数据加载守卫（pathless layout route） */
function AuthGuard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const { loaded, loadRoutes } = useMenuStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        if (!profile) await fetchProfile();
        if (!loaded) await loadRoutes();
      } catch {
        navigate('/login', { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (!accessToken) return <Navigate to="/login" replace />;
  if (!profile || !loaded) return <Spin style={{ width: '100%', marginTop: 120 }} tip="加载中..." />;

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

export default function AppRoutes() {
  const flatMenus = useMenuStore((s) => s.flatMenus);
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AuthGuard />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/profile" element={<Profile />} />
        {flatMenus.map((m) => {
          const Page = resolvePageComponent(m.component);
          return <Route key={m.id} path={m.path} element={<Page />} />;
        })}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
