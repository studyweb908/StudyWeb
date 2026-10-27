import { useState, useEffect, useCallback, useRef } from 'react';
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
  FolderCheck,
} from 'lucide-react';

export interface Toast {
  id: string;
  title?: string;
  badge?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export type GlobalNotificationInput = Omit<Toast, 'id' | 'type'> & {
  type?: Toast['type'];
};

/**
 * Centralized helper to trigger a full-screen overlay notification from anywhere in the app.
 */
export function triggerGlobalNotification(
  input: GlobalNotificationInput | string,
  type: Toast['type'] = 'info',
  duration = 3400,
  title?: string
) {
  if (typeof window === 'undefined') return;
  const detail: Omit<Toast, 'id'> =
    typeof input === 'string'
      ? { message: input, type, duration, title }
      : {
          message: input.message,
          type: input.type || 'info',
          duration: input.duration ?? 3400,
          title: input.title,
          badge: input.badge,
          actionLabel: input.actionLabel,
          onAction: input.onAction,
        };

  window.dispatchEvent(new CustomEvent('studyweb-toast', { detail }));
}

function resolveNotificationMeta(toast: Toast) {
  const lower = `${toast.title || ''} ${toast.message || ''}`.toLowerCase();

  if (lower.includes('chat') && (lower.includes('clear') || lower.includes('reset') || lower.includes('wiped'))) {
    return {
      title: toast.title || 'Chat History Cleared',
      badge: toast.badge || 'Clean Slate Ready',
      Icon: RotateCcw,
      accentBar: 'from-indigo-500 via-violet-500 to-cyan-500',
      iconBg:
        'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/70 text-indigo-600 dark:text-indigo-400 shadow-indigo-500/15',
      ringColor: 'border-indigo-400/25 dark:border-indigo-500/25',
      badgeStyle:
        'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
      btnStyle:
        'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-600/25 focus:ring-indigo-500',
      progressBar: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500',
    };
  }

  if (lower.includes('delet') || lower.includes('remov') || lower.includes('erased') || lower.includes('wiped')) {
    return {
      title: toast.title || 'Deleted Successfully',
      badge: toast.badge || 'Workspace Updated',
      Icon: Trash2,
      accentBar: 'from-rose-500 via-red-500 to-orange-500',
      iconBg:
        'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 shadow-rose-500/15',
      ringColor: 'border-rose-400/25 dark:border-rose-500/25',
      badgeStyle:
        'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
      btnStyle:
        'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/25 focus:ring-rose-500',
      progressBar: 'bg-gradient-to-r from-rose-500 via-red-500 to-orange-500',
    };
  }

  if (
    lower.includes('upload') ||
    lower.includes('analyz') ||
    lower.includes('indexed') ||
    lower.includes('attach') ||
    lower.includes('added to your workspace') ||
    lower.includes('added to your study workspace') ||
    lower.includes('synthesized into your workspace') ||
    lower.includes('digitized') ||
    lower.includes('study notes')
  ) {
    return {
      title: toast.title || 'Material Analyzed & Indexed',
      badge: toast.badge || 'Library Synchronized',
      Icon: FileCheck2,
      accentBar: 'from-emerald-500 via-teal-500 to-cyan-500',
      iconBg:
        'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/15',
      ringColor: 'border-emerald-400/25 dark:border-emerald-500/25',
      badgeStyle:
        'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
      btnStyle:
        'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25 focus:ring-emerald-500',
      progressBar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    };
  }

  if (lower.includes('workspace') && (lower.includes('custom') || lower.includes('creat') || lower.includes('updat'))) {
    return {
      title: toast.title || 'Workspace Updated',
      badge: toast.badge || 'Study Hub Synced',
      Icon: FolderCheck,
      accentBar: 'from-indigo-500 via-purple-500 to-pink-500',
      iconBg:
        'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/70 text-indigo-600 dark:text-indigo-400 shadow-indigo-500/15',
      ringColor: 'border-indigo-400/25 dark:border-indigo-500/25',
      badgeStyle:
        'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
      btnStyle:
        'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-600/25 focus:ring-indigo-500',
      progressBar: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
    };
  }

  if (toast.type === 'success') {
    return {
      title: toast.title || 'Action Completed',
      badge: toast.badge || 'Success',
      Icon: CheckCircle,
      accentBar: 'from-emerald-500 via-teal-500 to-cyan-500',
      iconBg:
        'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/15',
      ringColor: 'border-emerald-400/25 dark:border-emerald-500/25',
      badgeStyle:
        'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
      btnStyle:
        'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/25 focus:ring-emerald-500',
      progressBar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    };
  }

  if (toast.type === 'error') {
    return {
      title: toast.title || 'Something Went Wrong',
      badge: toast.badge || 'System Alert',
      Icon: AlertCircle,
      accentBar: 'from-rose-500 via-red-500 to-pink-500',
      iconBg:
        'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 shadow-rose-500/15',
      ringColor: 'border-rose-400/25 dark:border-rose-500/25',
      badgeStyle:
        'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
      btnStyle:
        'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/25 focus:ring-rose-500',
      progressBar: 'bg-gradient-to-r from-rose-500 via-red-500 to-pink-500',
    };
  }

  if (toast.type === 'warning') {
    return {
      title: toast.title || 'Attention Needed',
      badge: toast.badge || 'Important Notice',
      Icon: AlertTriangle,
      accentBar: 'from-amber-500 via-orange-500 to-yellow-500',
      iconBg:
        'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/70 text-amber-600 dark:text-amber-400 shadow-amber-500/15',
      ringColor: 'border-amber-400/25 dark:border-amber-500/25',
      badgeStyle:
        'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
      btnStyle:
        'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-600/25 focus:ring-amber-500',
      progressBar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500',
    };
  }

  return {
    title: toast.title || 'Workspace Notification',
    badge: toast.badge || 'StudyWeb Update',
    Icon: Info,
    accentBar: 'from-indigo-500 via-blue-500 to-cyan-500',
    iconBg:
      'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/70 text-blue-600 dark:text-blue-400 shadow-blue-500/15',
    ringColor: 'border-blue-400/25 dark:border-blue-500/25',
    badgeStyle:
      'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60',
    btnStyle:
      'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-600/25 focus:ring-indigo-500',
    progressBar: 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500',
  };
}

export default function ToastContainer() {
  const [activeToast, setActiveToast] = useState<Toast | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  const dismissToast = useCallback((id?: string) => {
    setActiveToast((prev) => {
      if (!prev) return null;
      if (id && prev.id !== id) return prev;
      return null;
    });
    setIsPaused(false);
  }, []);

  useEffect(() => {
    const handleAddToast = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<Toast, 'id'>>;
      if (!customEvent.detail?.message) return;

      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const duration = customEvent.detail.duration ?? 3400;
      const newToast: Toast = {
        id,
        title: customEvent.detail.title,
        badge: customEvent.detail.badge,
        message: customEvent.detail.message,
        type: customEvent.detail.type || 'info',
        duration,
        actionLabel: customEvent.detail.actionLabel,
        onAction: customEvent.detail.onAction,
      };

      setIsPaused(false);
      setActiveToast(newToast);
    };

    window.addEventListener('studyweb-toast', handleAddToast);

    // Bind to window for direct global access across all modules
    (window as any).showToast = (
      message: string,
      type: Toast['type'] = 'info',
      duration = 3400,
      title?: string
    ) => {
      triggerGlobalNotification({ message, type, duration, title });
    };

    return () => {
      window.removeEventListener('studyweb-toast', handleAddToast);
      delete (window as any).showToast;
    };
  }, []);

  // Focus primary action button for keyboard accessibility when notification opens
  useEffect(() => {
    if (activeToast) {
      const t = setTimeout(() => {
        primaryBtnRef.current?.focus();
      }, 60);
      return () => clearTimeout(t);
    }
  }, [activeToast]);

  // Auto-dismiss timer for active full-screen notification (pauses on hover/focus)
  useEffect(() => {
    if (!activeToast || isPaused) return;
    const timer = setTimeout(() => {
      dismissToast(activeToast.id);
    }, activeToast.duration || 3400);
    return () => clearTimeout(timer);
  }, [activeToast, isPaused, dismissToast]);

  // Allow Escape or Enter key to dismiss full-screen notification immediately
  useEffect(() => {
    if (!activeToast) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissToast(activeToast.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeToast, dismissToast]);

  const meta = activeToast ? resolveNotificationMeta(activeToast) : null;

  return (
    <AnimatePresence mode="wait">
      {activeToast && meta && (
        <div
          key={activeToast.id}
          className="fixed inset-0 w-screen h-screen z-[999999] flex items-center justify-center p-4 sm:p-8"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="global-notification-title"
          aria-describedby="global-notification-desc"
          aria-live="assertive"
        >
          {/* Full-Screen Blurred Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => dismissToast(activeToast.id)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl cursor-pointer"
          />

          {/* Centered Full-Screen Notification Hero Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg sm:max-w-xl bg-white dark:bg-slate-900 rounded-[36px] p-7 sm:p-10 shadow-2xl border border-slate-200/90 dark:border-slate-800 text-center overflow-hidden z-10"
          >
            {/* Top Gradient Accent Bar */}
            <div className={`absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r ${meta.accentBar}`} />

            {/* Subtle Ambient Glow */}
            <div
              className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-gradient-to-br ${meta.accentBar} opacity-15 blur-3xl pointer-events-none`}
            />

            {/* Top-Right Close Button */}
            <button
              type="button"
              onClick={() => dismissToast(activeToast.id)}
              aria-label="Close notification"
              className="absolute top-5 right-5 p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Large Center Icon Badge with Pulse Ring */}
            <div className="mx-auto mb-6 relative w-24 h-24 flex items-center justify-center">
              <div
                className={`w-24 h-24 rounded-3xl border flex items-center justify-center shadow-xl ${meta.iconBg}`}
              >
                <meta.Icon className="w-11 h-11" />
              </div>
              <div
                className={`absolute -inset-2.5 rounded-[32px] border-2 ${meta.ringColor} animate-pulse pointer-events-none`}
              />
            </div>

            {/* Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider border mb-3.5 ${meta.badgeStyle}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{meta.badge}</span>
            </div>

            {/* Notification Heading */}
            <h3
              id="global-notification-title"
              className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3"
            >
              {meta.title}
            </h3>

            {/* Notification Message */}
            <p
              id="global-notification-desc"
              className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto mb-8 whitespace-pre-line"
            >
              {activeToast.message}
            </p>

            {/* Primary Dismiss / Action Button */}
            <button
              ref={primaryBtnRef}
              type="button"
              onClick={() => {
                if (activeToast.onAction) {
                  activeToast.onAction();
                }
                dismissToast(activeToast.id);
              }}
              className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base cursor-pointer shadow-lg transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${meta.btnStyle}`}
            >
              {activeToast.actionLabel || 'Continue'}
            </button>

            {/* Animated Auto-Dismiss Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
              {!isPaused && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{
                    duration: (activeToast.duration || 3400) / 1000,
                    ease: 'linear',
                  }}
                  className={`h-full ${meta.progressBar}`}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
