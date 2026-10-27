import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from '../hooks/useThemeMode';
import { triggerGlobalNotification } from './ToastContainer';

export default function ThemeToggle() {
  const { themeMode, isDarkApplied, toggleTheme } = useThemeMode();

  const handleToggle = () => {
    toggleTheme();
    const newIsDark = !isDarkApplied;
    triggerGlobalNotification({
      title: newIsDark ? 'Dark Mode Activated' : 'Light Mode Activated',
      badge: 'Theme Synchronized',
      message: `Display theme overridden to ${newIsDark ? 'Dark' : 'Light'} mode across your StudyWeb workspace.`,
      type: 'info',
      duration: 2400,
    });
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-full text-brand-text-light hover:text-brand-primary hover:bg-brand-primary/10 transition-colors flex items-center justify-center focus:outline-none cursor-pointer"
      aria-label="Toggle theme"
      title={themeMode === 'system' ? 'System Theme (Sync active)' : `Theme override: ${themeMode}`}
    >
      {isDarkApplied ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
    </button>
  );
}
