import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Sparkles,
  Trash2,
  RotateCcw,
  FileCheck2,
} from 'lucide-react';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

function resolveNotificationMeta(toast: Toast) {
  const lower = (toast.message || '').toLowerCase();

  if (lower.includes('chat') && (lower.includes('clear') || lower.includes('reset'))) {
    return {
      title: toast.title || 'Chat History Cleared',
      badge: 'AI Tutor Ready',
      Icon: RotateCcw,
      accentBar: 'from-indigo-500 via-violet-500 to-cyan-500',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/70 text-indigo-600 dark:text-indigo-400 shadow-indigo-500/15',
      ringColor: 'border-indigo-400/25 dark:border-indigo-500/25',
      badgeStyle: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
      btnStyle: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-600/25',
      progressBar: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500',
    };
  }

  if (lower.includes('delet') || lower.includes('remov') || lower.includes('erased')) {
    return {
      title: toast.title || 'Deleted Successfully',
      badge: 'Workspace Updated',
      Icon: Trash2,
      accentBar: 'from-rose-500 via-red-500 to-orange-500',
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 shadow-rose-500/15',
      ringColor: 'border-rose-400/25 dark:border-rose-500/25',
      badgeStyle: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
      btnStyle: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/25',
      progressBar: 'bg-gradient-to-r from-rose-500 via-red-500 to-orange-500',
    };
  }

  if (
    lower.includes('upload') ||
    lower.includes('analyz') ||
    lower.includes('indexed') ||
    lower.includes('added to your workspace') ||
    lower.includes('digitized')
  ) {
    return {
      title: toast.title || 'Material Analyzed & Indexed',
      badge: 'Library Synchronized',
      Icon: FileCheck2,
      accentBar: 'from-emerald-500 via-teal-500 to-cyan-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/15',
      ringColor: 'border-emerald-400/25 dark:border-emerald-500/25',
      badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
      btnStyle: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25',
      progressBar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    };
  }

  if (toast.type === 'success') {
    return {
      title: toast.title || 'Action Completed',
      badge: 'Success',
      Icon: CheckCircle,
      accentBar: 'from-emerald-500 via-teal-500 to-cyan-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/15',
      ringColor: 'border-emerald-400/25 dark:border-emerald-500/25',
      badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
      btnStyle: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25',
      progressBar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    };
  }

  if (toast.type === 'error') {
    return {
      title: toast.title || 'Something Went Wrong',
      badge: 'System Alert',
      Icon: AlertCircle,
      accentBar: 'from-rose-500 via-red-500 to-pink-500',
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 shadow-rose-500/15',
      ringColor: 'border-rose-400/25 dark:border-rose-500/25',
      badgeStyle: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
      btnStyle: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/25',
      progressBar: 'bg-gradient-to-r from-rose-500 via-red-500 to-pink-500',
    };
  }

  if (toast.type === 'warning') {
    return {
      title: toast.title || 'Attention Needed',
      badge: 'Notice',
      Icon: AlertTriangle,
      accentBar: 'from-amber-500 via-orange-500 to-yellow-500',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/70 text-amber-600 dark:text-amber-400 shadow-amber-500/15',
      ringColor: 'border-amber-400/25 dark:border-amber-500/25',
      badgeStyle: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
      btnStyle: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-600/25',
      progressBar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500',
    };
  }

  return {
    title: toast.title || 'Workspace Notification',
    badge: 'StudyWeb Update',
    Icon: Info,
    accentBar: 'from-indigo-500 via-blue-500 to-cyan-500',
    iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/70 text-blue-600 dark:text-blue-400 shadow-blue-500/15',
    ringColor: 'border-blue-400/25 dark:border-blue-500/25',
    badgeStyle: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60',
    btnStyle: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-600/25',
    progressBar: 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500',
  };
}

export default function ToastContainer() {
  const [activeToast, setActiveToast] = useState<Toast | null>(null);

  const dismissToast = useCallback((id?: string) => {
    setActiveToast((prev) => {
      if (!prev) return null;
      if (id && prev.id !== id) return prev;
      return null;
    });
  }, []);

  useEffect(() => {
    const handleAddToast = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<Toast, 'id'>>;
      if (!customEvent.detail?.message) return;

      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const duration = customEvent.detail.duration ?? 3200;
      const newToast: Toast = {
        id,
        title: customEvent.detail.title,
        message: customEvent.detail.message,
        type: customEvent.detail.type || 'info',
        duration,
      };

      setActiveToast(newToast);
    };

    window.addEventListener('studyweb-toast', handleAddToast);

    // Bind to window for direct access across all components
    (window as any).showToast = (
      message: string,
      type: Toast['type'] = 'info',
      duration = 3200,
      title?: string
    ) => {
      window.dispatchEvent(
        new CustomEvent('studyweb-toast', {
          detail: { message, type, duration, title },
        })
      );
    };

    return () => {
      window.removeEventListener('studyweb-toast', handleAddToast);
      delete (window as any).showToast;
    };
  }, []);

  // Auto-dismiss timer for active full-screen notification
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast(activeToast.id);
    }, activeToast.duration || 3200);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  // Allow Escape key to dismiss full-screen notification immediately
  useEffect(() => {
    if (!activeToast) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        dismissToast(activeToast.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeToast, dismissToast]);

  const meta = activeToast ? resolveNotificationMeta(activeToast) : null;

  return (
    <AnimatePresence>
      {activeToast && meta && (
        <div
          key={activeToast.id}
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-live="assertive"
        >
          {/* Full-Screen Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => dismissToast(activeToast.id)}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer"
          />

          {/* Centered Full-Screen Notification Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200/90 dark:border-slate-800 text-center overflow-hidden z-10"
          >
            {/* Top Gradient Accent Bar */}
            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${meta.accentBar}`} />

            {/* Subtle Ambient Glow */}
            <div
              className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-br ${meta.accentBar} opacity-10 blur-3xl pointer-events-none`}
            />

            {/* Top-Right Close Button */}
            <button
              onClick={() => dismissToast(activeToast.id)}
              aria-label="Close notification"
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Large Center Icon Badge with Pulse Ring */}
            <div className="mx-auto mb-5 relative w-20 h-20 flex items-center justify-center">
              <div
                className={`w-20 h-20 rounded-3xl border flex items-center justify-center shadow-xl ${meta.iconBg}`}
              >
                <meta.Icon className="w-10 h-10" />
              </div>
              <div
                className={`absolute -inset-2 rounded-[28px] border-2 ${meta.ringColor} animate-pulse pointer-events-none`}
              />
            </div>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-extrabold uppercase tracking-wider border mb-3 ${meta.badgeStyle}`}>
              <Sparkles className="w-3 h-3" />
              <span>{meta.badge}</span>
            </div>

            {/* Notification Heading */}
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2.5">
              {meta.title}
            </h3>

            {/* Notification Message */}
            <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto mb-7">
              {activeToast.message}
            </p>

            {/* Primary Dismiss Button */}
            <button
              onClick={() => dismissToast(activeToast.id)}
              className={`w-full py-3.5 px-6 rounded-2xl font-extrabold text-sm cursor-pointer shadow-lg transition-all active:scale-[0.98] ${meta.btnStyle}`}
            >
              Continue
            </button>

            {/* Animated Auto-Dismiss Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{
                  duration: (activeToast.duration || 3200) / 1000,
                  ease: 'linear',
                }}
                className={`h-full ${meta.progressBar}`}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
