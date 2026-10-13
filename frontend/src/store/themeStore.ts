import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const getInitialTheme = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('overloadguard_theme');
  if (stored) return stored === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useThemeStore = create<ThemeState>((set) => {
  const initialDark = getInitialTheme();
  if (typeof document !== 'undefined') {
    if (initialDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return {
    isDark: initialDark,
    toggleTheme: () => {
      set((state) => {
        const next = !state.isDark;
        localStorage.setItem('overloadguard_theme', next ? 'dark' : 'light');
        if (next) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { isDark: next };
      });
    },
    setTheme: (dark: boolean) => {
      localStorage.setItem('overloadguard_theme', dark ? 'dark' : 'light');
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ isDark: dark });
    },
  };
});
