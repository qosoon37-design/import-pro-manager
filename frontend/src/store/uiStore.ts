import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Lang = 'ar' | 'en';
type Theme = 'light' | 'dark';

interface UIState {
  lang: Lang;
  theme: Theme;
  sidebarCollapsed: boolean;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      lang: 'ar',
      theme: 'light',
      sidebarCollapsed: false,

      setLang: (lang) => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        set({ lang });
      },

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'ui-store' }
  )
);
