import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';
type Lang = 'zh' | 'en';
type LayoutMode = 'side' | 'top' | 'mix';

interface AppState {
  collapsed: boolean;
  theme: ThemeMode;
  primaryColor: string;
  lang: Lang;
  layoutMode: LayoutMode;
  compact: boolean;
  toggleCollapsed: () => void;
  setTheme: (theme: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  setLang: (lang: Lang) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setCompact: (compact: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      collapsed: false,
      theme: 'light',
      primaryColor: '#1677ff',
      lang: 'zh',
      layoutMode: 'side',
      compact: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setTheme: (theme) => set({ theme }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setLang: (lang) => set({ lang }),
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setCompact: (compact) => set({ compact }),
    }),
    { name: 'nice-admin-app' },
  ),
);
