'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}>({ theme: 'light', mode: 'system', setMode: () => {}, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  };

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null;
    const m = savedMode || 'system';
    setModeState(m);
    if (m === 'system') {
      applyTheme(getSystemTheme());
    } else {
      applyTheme(m);
    }

    // 시스템 테마 변경 감지
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const currentMode = localStorage.getItem('themeMode') || 'system';
      if (currentMode === 'system') applyTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem('themeMode', m);
    if (m === 'system') {
      applyTheme(getSystemTheme());
    } else {
      applyTheme(m);
    }
  };

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setMode(next);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
