import { Moon, Sun, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedPreference = localStorage.getItem('theme');
      if (storedPreference) {
        return storedPreference === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    setToastMessage(`${newIsDark ? 'Dark' : 'Light'} theme preference saved`);
    
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full text-brand-text-light hover:text-brand-primary hover:bg-brand-primary/10 transition-colors flex items-center justify-center focus:outline-none"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-card-bg border border-card-border shadow-xl rounded-xl px-4 py-3"
          >
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-brand-text">
              {toastMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
