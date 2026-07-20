import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

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
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, hasMounted]);

  if (!hasMounted) return null;

  return (
    <AnimatePresence>
      {(isSaving || showSaved) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 dark:bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl backdrop-blur-sm"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span className="text-xs font-medium tracking-wide text-slate-100">Auto-saving...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium tracking-wide text-slate-100">Saved</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
