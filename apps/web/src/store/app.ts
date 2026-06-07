import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';
type Lang = 'zh' | 'en';

interface AppState {
  collapsed: boolean;
  theme: ThemeMode;
  primaryColor: string;
  lang: Lang;
  toggleCollapsed: () => void;
  setTheme: (theme: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  setLang: (lang: Lang) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      collapsed: false,
      theme: 'light',
      primaryColor: '#1677ff',
      lang: 'zh',
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setTheme: (theme) => set({ theme }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'nice-admin-app' },
  ),
);
