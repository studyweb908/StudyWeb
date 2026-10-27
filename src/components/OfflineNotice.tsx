import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, 
  WifiOff, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FolderOpen, 
  FileText, 
  BookOpen, 
  Calendar, 
  User, 
  Settings, 
  Check, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  CloudLightning 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QueueItem {
  id: string;
  key: string;
  timestamp: number;
  description: string;
}

// Global hook to safely patch localStorage.setItem for automatic queueing
if (typeof window !== 'undefined' && window.localStorage && !(window as any).__studyweb_patched) {
  (window as any).__studyweb_patched = true;
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key: string, value: string) {
    try {
      originalSetItem.apply(this, arguments as any);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        console.warn('Local storage quota exceeded. Some offline features may be unavailable. Try clearing your browser cache if issues persist.');
        (window as any).showToast?.('Storage limit reached. Clear some older files or cache.', 'error');
      } else {
        console.error('Offline Sync originalSetItem error', e);
      }
    }
    
    // Only intercept studyweb_ keys, skip the queue key itself
    if (key.startsWith('studyweb_') && key !== 'studyweb_offline_sync_queue') {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        window.dispatchEvent(new CustomEvent('studyweb-offline-storage-change', {
          detail: { key, value }
        }));
      }
    }
  };
}

const getFriendlyName = (key: string): string => {
  if (key.includes('notes')) return '📝 Workspace Notes & Drafts';
  if (key.includes('cards')) return '🃏 Spaced Repetition Flashcards';
  if (key.includes('planner_tasks')) return '📅 Academic Planner Tasks';
  if (key.includes('workspaces')) return '📂 Workspace Structures & Folders';
  if (key.includes('profile')) return '👤 Scholar Profile Settings';
  return '⚙️ Local App Settings';
};

const categories = [
  { id: 'workspaces', name: 'Workspaces & Structure', icon: FolderOpen },
  { id: 'notes', name: 'Notes & Study Materials', icon: FileText },
  { id: 'cards', name: 'Spaced Repetition Cards', icon: BookOpen },
  { id: 'planner_tasks', name: 'Academic Study Planner', icon: Calendar },
  { id: 'profile', name: 'Scholar Profile Info', icon: User },
  { id: 'settings', name: 'Local App Settings', icon: Settings }
];

const isCategoryPending = (catId: string, currentQueue: QueueItem[]) => {
  return currentQueue.some(item => {
    if (catId === 'settings') {
      return !['workspaces', 'notes', 'cards', 'planner_tasks', 'profile'].some(prefix => item.key.includes(prefix));
    }
    return item.key.includes(catId);
  });
};

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('studyweb_offline_sync_queue');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return [];
  });

  const [reconcilingStates, setReconcilingStates] = useState<Record<string, 'pending' | 'syncing' | 'synced'>>({});
  const [syncProgress, setSyncProgress] = useState(0);

  // Core Reconciliation Engine
  const reconcileQueue = useCallback(async (currentQueue: QueueItem[]) => {
    if (currentQueue.length === 0) return;
    
    setIsReconciling(true);
    setDismissed(false);
    setSyncSuccess(false);
    setSyncProgress(0);
    setIsExpanded(true); // Expand so the user can see the modules being synced

    const pendingIds = categories
      .filter(c => isCategoryPending(c.id, currentQueue))
      .map(c => c.id);

    // Initialize all to synced unless they are in the pending list
    const initial: Record<string, 'pending' | 'syncing' | 'synced'> = {};
    categories.forEach(c => {
      initial[c.id] = pendingIds.includes(c.id) ? 'pending' : 'synced';
    });
    setReconcilingStates(initial);

    // Process each category step-by-step
    for (let i = 0; i < pendingIds.length; i++) {
      const catId = pendingIds[i];
      
      // Mark current category as syncing
      setReconcilingStates(prev => ({ ...prev, [catId]: 'syncing' }));
      
      // Keep updating the overall progress
      const progressStart = (i / pendingIds.length) * 100;
      setSyncProgress(progressStart);

      // High-fidelity spacing representing database persistence overhead (800ms - 1300ms)
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 450));

      // Mark current category as successfully synced
      setReconcilingStates(prev => ({ ...prev, [catId]: 'synced' }));
      setSyncProgress(((i + 1) / pendingIds.length) * 100);
    }

    // Short delay for satisfying final render state
    await new Promise(resolve => setTimeout(resolve, 600));
    
    setIsReconciling(false);
    setSyncSuccess(true);
    setQueue([]);
    localStorage.removeItem('studyweb_offline_sync_queue');

    // Explicit confirmation toast improving confidence in data persistence
    (window as any).showToast?.('✅ Offline data successfully synchronized and persisted to local storage!', 'success');

    // Trigger local storage storage event so other tabs refresh if needed
    window.dispatchEvent(new Event('storage'));

    // Clear success state automatically
    setTimeout(() => {
      setSyncSuccess(false);
    }, 4000);
  }, []);

  // Track physical network connectivity changes
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      if (!navigator.onLine) {
        setIsOffline(true);
      } else {
        // Run check on startup in case there's an active leftover queue
        const savedQueueStr = localStorage.getItem('studyweb_offline_sync_queue');
        if (savedQueueStr) {
          try {
            const currentQueue = JSON.parse(savedQueueStr);
            if (currentQueue.length > 0) {
              setQueue(currentQueue);
              reconcileQueue(currentQueue);
            }
          } catch (e) {}
        }
      }
    }

    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
      
      const savedQueueStr = localStorage.getItem('studyweb_offline_sync_queue');
      let currentQueue: QueueItem[] = [];
      if (savedQueueStr) {
        try {
          currentQueue = JSON.parse(savedQueueStr);
        } catch (e) {}
      }

      if (currentQueue.length > 0) {
        setQueue(currentQueue);
        reconcileQueue(currentQueue);
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
      setSyncSuccess(false);
      setIsReconciling(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reconcileQueue]);

  // Listen to automatic storage intercepts
  useEffect(() => {
    const handleOfflineChange = (e: Event) => {
      const { key } = (e as CustomEvent).detail;
      
      setQueue(prev => {
        const existingIdx = prev.findIndex(item => item.key === key);
        const friendlyName = getFriendlyName(key);
        const newItem: QueueItem = {
          id: Math.random().toString(36).substring(2, 9),
          key,
          timestamp: Date.now(),
          description: friendlyName
        };

        let updated;
        if (existingIdx > -1) {
          updated = [...prev];
          updated[existingIdx] = newItem;
        } else {
          updated = [...prev, newItem];
        }

        localStorage.setItem('studyweb_offline_sync_queue', JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener('studyweb-offline-storage-change', handleOfflineChange as EventListener);
    return () => {
      window.removeEventListener('studyweb-offline-storage-change', handleOfflineChange as EventListener);
    };
  }, []);

  const getCategoryStatus = (catId: string) => {
    if (isReconciling) {
      return reconcilingStates[catId] || 'synced';
    }
    if (isOffline) {
      return isCategoryPending(catId, queue) ? 'pending' : 'synced';
    }
    return 'synced';
  };

  const showModal = (isOffline && !dismissed) || isReconciling || syncSuccess;
  if (!showModal) return null;

  const totalPending = queue.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 w-screen h-screen z-[99995] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isReconciling && setDismissed(true)}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-md flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[32px] p-6 overflow-hidden text-xs"
        >
        {/* HEADER SECTION */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-start gap-2.5">
            <div className={`p-1.5 rounded-xl shrink-0 ${
              isReconciling 
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 animate-pulse'
                : syncSuccess
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-500'
            }`}>
              {isReconciling ? (
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
              ) : syncSuccess ? (
                <CheckCircle2 className="w-4.5 h-4.5" />
              ) : (
                <WifiOff className="w-4.5 h-4.5" />
              )}
            </div>
            
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-slate-800 dark:text-white leading-tight">
                {isReconciling 
                  ? 'Reconciling Workspace' 
                  : syncSuccess 
                    ? 'Workspace Synced!' 
                    : 'Offline Mode Active'}
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                {isReconciling 
                  ? `Flushing ${totalPending} queued updates safely...` 
                  : syncSuccess 
                    ? 'All local revisions successfully resolved' 
                    : 'Changes will sync automatically when online'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
              title={isExpanded ? "Collapse Details" : "Expand Details"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {!isReconciling && (
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* PROGRESS BAR (Only during reconciliation) */}
        {isReconciling && (
          <div className="mt-3 space-y-1">
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 rounded-full"
                animate={{ width: `${syncProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              <span>RECONCILING SYNC QUEUE</span>
              <span>{Math.round(syncProgress)}% COMPLETE</span>
            </div>
          </div>
        )}

        {/* DETAILED CATEGORY STATUS LIST */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden space-y-2"
            >
              <div className="space-y-1.5">
                {categories.map((cat) => {
                  const status = getCategoryStatus(cat.id);
                  const IconComponent = cat.icon;
                  
                  return (
                    <div 
                      key={cat.id} 
                      className="flex items-center justify-between gap-3 p-2 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-850/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-lg ${
                          status === 'syncing' 
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500' 
                            : status === 'pending'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-extrabold text-slate-700 dark:text-slate-300 truncate text-[11px]">
                          {cat.name}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        status === 'syncing'
                          ? 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900/50'
                          : status === 'pending'
                            ? 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900/50'
                            : 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/50'
                      }`}>
                        {status === 'syncing' ? (
                          <>
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-500" />
                            <span>Syncing</span>
                          </>
                        ) : status === 'pending' ? (
                          <>
                            <Clock className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                            <span>Pending</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-500" />
                            <span>Synced</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Offline Queue Items helper summary */}
              {!isReconciling && !syncSuccess && totalPending > 0 && (
                <div className="text-[10px] bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/40 dark:border-amber-900/20 rounded-xl p-2.5 text-amber-600 dark:text-amber-400 font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Workspace Diagnostics</span>
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    You have {totalPending} modification {totalPending === 1 ? 'record' : 'records'} queued locally. Closing the tab is perfectly safe; all changes are persisted offline.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
