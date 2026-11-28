import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

export function useThemeMode() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem('theme_mode') as ThemeMode;
      if (storedMode === 'system' || storedMode === 'light' || storedMode === 'dark') {
        return storedMode;
      }
      // Backward compatibility check for old 'theme' key
      const oldTheme = localStorage.getItem('theme');
      if (oldTheme === 'dark') return 'dark';
      if (oldTheme === 'light') return 'light';
      
      return 'system'; // default to system preference sync
    }
    return 'system';
  });

  const [isDarkApplied, setIsDarkApplied] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem('theme_mode') as ThemeMode;
      if (storedMode === 'dark') return true;
      if (storedMode === 'light') return false;
      
      const oldTheme = localStorage.getItem('theme');
      if (oldTheme === 'dark') return true;
      if (oldTheme === 'light') return false;

      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Function to set theme mode and notify other instances with smooth crossfade
  const setThemeMode = (mode: ThemeMode) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.add('theme-transitioning');
      window.setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 450);
    }
    localStorage.setItem('theme_mode', mode);
    setThemeModeState(mode);
    
    // Dispatch custom event to notify other components/hooks
    window.dispatchEvent(new Event('studyweb_theme_mode_updated'));
  };

  useEffect(() => {
    const applyTheme = () => {
      let activeDark = false;
      if (themeMode === 'system') {
        activeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        activeDark = themeMode === 'dark';
      }

      setIsDarkApplied(activeDark);

      if (activeDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark'); // keeps old keys synchronized
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    };

    applyTheme();

    // Set up system theme listener if in system mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e: MediaQueryListEvent) => {
        setIsDarkApplied(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
      };

      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [themeMode]);

  // Listen to global theme updates from other instances (like profile tab)
  useEffect(() => {
    const handleGlobalUpdate = () => {
      const storedMode = (localStorage.getItem('theme_mode') as ThemeMode) || 'system';
      setThemeModeState(storedMode);
    };

    window.addEventListener('studyweb_theme_mode_updated', handleGlobalUpdate);
    return () => window.removeEventListener('studyweb_theme_mode_updated', handleGlobalUpdate);
  }, []);

  const toggleTheme = useCallback(() => {
    // Toggling theme manually overrides system sync to explicit choice
    const nextMode = isDarkApplied ? 'light' : 'dark';
    setThemeMode(nextMode);
  }, [isDarkApplied]);

  return {
    themeMode,
    isDarkApplied,
    setThemeMode,
    toggleTheme
  };
}
