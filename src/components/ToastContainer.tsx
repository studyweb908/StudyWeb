import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleAddToast = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<Toast, 'id'>>;
      const id = `toast-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: Toast = {
        id,
        message: customEvent.detail.message,
        type: customEvent.detail.type || 'info',
        duration: customEvent.detail.duration ?? 4000,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto remove after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    };

    window.addEventListener('studyweb-toast', handleAddToast);
    
    // Bind to window for direct access
    (window as any).showToast = (message: string, type: Toast['type'] = 'info', duration = 4000) => {
      window.dispatchEvent(
        new CustomEvent('studyweb-toast', {
          detail: { message, type, duration },
        })
      );
    };

    return () => {
      window.removeEventListener('studyweb-toast', handleAddToast);
      delete (window as any).showToast;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          // Icon matching type
          let Icon = Info;
          let iconColor = 'text-blue-500';
          let borderAccent = 'border-l-blue-500';
          let bgGradient = 'from-blue-50/10 to-transparent dark:from-blue-950/20';

          if (toast.type === 'success') {
            Icon = CheckCircle;
            iconColor = 'text-emerald-500';
            borderAccent = 'border-l-emerald-500';
            bgGradient = 'from-emerald-50/10 to-transparent dark:from-emerald-950/20';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            iconColor = 'text-rose-500';
            borderAccent = 'border-l-rose-500';
            bgGradient = 'from-rose-50/10 to-transparent dark:from-rose-950/20';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = 'text-amber-500';
            borderAccent = 'border-l-amber-500';
            bgGradient = 'from-amber-50/10 to-transparent dark:from-amber-950/20';
          }

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 bg-white/95 dark:bg-slate-900/95 border border-slate-150 dark:border-slate-800/80 border-l-4 ${borderAccent} bg-gradient-to-r ${bgGradient} rounded-2xl shadow-xl backdrop-blur-md text-left`}
            >
              <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed pr-4">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
