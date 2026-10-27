import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';

interface AutoSavingToastProps {
  isSaving: boolean;
}

export default function AutoSavingToast({ isSaving }: AutoSavingToastProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
      return;
    }
    if (isSaving) {
      setShowSaved(false);
    } else {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isSaving, hasMounted]);

  if (!hasMounted) return null;

  return (
    <AnimatePresence>
      {(isSaving || showSaved) && (
        <div
          className="fixed inset-0 w-screen h-screen z-[99990] flex items-center justify-center p-4 sm:p-6"
          role="status"
          aria-live="polite"
        >
          {/* Full-Screen Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSaved(false)}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            onClick={() => setShowSaved(false)}
            className="relative z-10 flex flex-col items-center gap-3.5 px-8 py-7 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[32px] shadow-2xl text-center max-w-sm w-full cursor-pointer overflow-hidden"
          >
            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${isSaving ? 'from-indigo-500 via-violet-500 to-cyan-500' : 'from-emerald-500 via-teal-500 to-cyan-500'}`} />
            {isSaving ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900 dark:text-white">Syncing Changes...</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Auto-saving to your study workspace
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Workspace Synced</span>
                  </div>
                  <p className="text-lg font-black text-slate-900 dark:text-white">Saved Successfully</p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
