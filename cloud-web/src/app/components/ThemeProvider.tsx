'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useUIStore } from '@/stores/uiStore';

type Theme = 'dark' | 'light' | 'sepia' | 'high-contrast' | 'ocean' | 'midnight';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme: storeTheme, resolvedTheme, setTheme: storeSetTheme, toggleTheme } = useUIStore();

  const theme = storeTheme as Theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    root.classList.remove('dark', 'light', 'sepia', 'high-contrast', 'ocean', 'midnight');
    root.classList.add(resolvedTheme);
    const timer = setTimeout(() => root.classList.remove('theme-transitioning'), 300);
    return () => clearTimeout(timer);
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle: toggleTheme, setTheme: storeSetTheme as (t: Theme) => void }}>
      {children}
    </ThemeContext.Provider>
  );
}
