import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X, Folder, FileText, BookOpen } from 'lucide-react';
import { Workspace } from './WorkspaceTypes';

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  workspace: Workspace | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteWorkspaceModal({
  isOpen,
  workspace,
  onConfirm,
  onCancel,
}: DeleteWorkspaceModalProps) {
  // Handle ESC key to cancel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !workspace) return null;

  const fileCount = workspace.files?.length || 0;
  const cardCount = workspace.flashcards?.length || 0;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-workspace-title"
      >
        {/* Backdrop click dismiss */}
        <div 
          className="absolute inset-0 cursor-pointer" 
          onClick={onCancel}
          aria-hidden="true" 
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] p-6 sm:p-7 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center overflow-hidden z-10"
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            aria-label="Close delete dialog"
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Warning Icon Badge with pulsing ring */}
          <div className="mx-auto mb-5 relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-500/10">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="absolute -inset-1.5 rounded-3xl border-2 border-rose-400/20 dark:border-rose-500/20 animate-pulse pointer-events-none" />
          </div>

          {/* Title */}
          <h3 
            id="delete-workspace-title"
            className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2"
          >
            Do you want to delete this workspace?
          </h3>

          {/* Workspace Preview Tag */}
          <div className="my-3.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-rose-100/60 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Folder className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {workspace.name}
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {workspace.subject || 'General'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500 dark:text-slate-400 font-semibold ml-2">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                {fileCount}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-slate-400" />
                {cardCount}
              </span>
            </div>
          </div>

          {/* Full Screen Warning Callout with user's exact specification */}
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              <p className="font-bold text-rose-900 dark:text-rose-200 mb-0.5">
                If you delete this, it will not be recovered anymore.
              </p>
              <p className="text-rose-700/90 dark:text-rose-300/80">
                All associated materials, notes, study cards, and learning progress will be permanently erased.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5">
            <button
              onClick={onCancel}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all active:scale-[0.98]"
            >
              No, Keep Workspace
            </button>
            <button
              onClick={onConfirm}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Yes, Delete Workspace</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
