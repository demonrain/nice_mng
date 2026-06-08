import { useEffect } from 'react';
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import i18n, { loadRemoteI18n } from '@/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/router/AppRoutes';
import { useAppStore } from '@/store/app';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export default function App() {
  const { theme, primaryColor, lang, compact } = useAppStore();

  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
    void loadRemoteI18n(lang);
  }, [lang]);

  const algorithm = [
    theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    ...(compact ? [antdTheme.compactAlgorithm] : []),
  ];

  return (
    <ConfigProvider
      locale={lang === 'zh' ? zhCN : enUS}
      theme={{
        algorithm,
        token: { colorPrimary: primaryColor, borderRadius: 6 },
      }}
    >
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
