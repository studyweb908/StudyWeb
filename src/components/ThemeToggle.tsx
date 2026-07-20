import { Moon, Sun, Check } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeMode } from '../hooks/useThemeMode';

export default function ThemeToggle() {
  const { themeMode, isDarkApplied, toggleTheme } = useThemeMode();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToggle = () => {
    toggleTheme();
    const newIsDark = !isDarkApplied;
    setToastMessage(`Theme overridden to ${newIsDark ? 'Dark' : 'Light'} mode`);
    
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className="p-2 rounded-full text-brand-text-light hover:text-brand-primary hover:bg-brand-primary/10 transition-colors flex items-center justify-center focus:outline-none cursor-pointer"
        aria-label="Toggle theme"
        title={themeMode === 'system' ? 'System Theme (Sync active)' : `Theme override: ${themeMode}`}
      >
        {isDarkApplied ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
      </button>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-xl px-4 py-3"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-850 dark:text-slate-100">
              {toastMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
