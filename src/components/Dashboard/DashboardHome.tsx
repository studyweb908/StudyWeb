import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Clock
} from 'lucide-react';
import { CalendarWidget, TodayTasksCard, AIInsightsCard, RecentStudyMaterials } from './DashboardWidgets';
import { Workspace } from './WorkspaceTypes';

interface DashboardHomeProps {
  setActiveTab: (tab: string) => void;
  setActiveWorkspace?: (workspace: Workspace | null) => void;
  workspaces?: Workspace[];
  activeWorkspace?: Workspace | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 animate-pulse flex flex-col h-full ${className}`}>
    <div className="w-1/3 h-5 bg-slate-200 dark:bg-slate-700 rounded-full mb-6"></div>
    <div className="space-y-3 flex-1">
      <div className="w-full h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      <div className="w-full h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      <div className="w-2/3 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
    </div>
  </div>
);

export default function DashboardHome({ setActiveTab, setActiveWorkspace, workspaces = [], activeWorkspace }: DashboardHomeProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="pb-12 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left auto-rows-min">
          <div className="col-span-1 md:col-span-12 xl:col-span-8 h-full min-h-[320px]">
            <SkeletonCard className="rounded-[32px]" />
          </div>
          <div className="col-span-1 md:col-span-12 xl:col-span-4 h-full min-h-[320px]">
            <SkeletonCard />
          </div>
          <div className="col-span-1 md:col-span-6 lg:col-span-4 h-full min-h-[320px]">
            <SkeletonCard />
          </div>
          <div className="col-span-1 md:col-span-6 lg:col-span-4 h-full min-h-[320px]">
            <SkeletonCard />
          </div>
          <div className="col-span-1 md:col-span-12 lg:col-span-4 h-full min-h-[320px]">
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="pb-12 space-y-6 max-w-7xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left auto-rows-min">
        
        {/* ROW 1: Hero (8 cols) + AI Insights (4 cols) */}
        
        {/* ================= HERO CARD ================= */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12 xl:col-span-8">
          <div className="relative rounded-[32px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm h-full flex flex-col md:flex-row items-stretch p-6 gap-6 md:gap-8">
            <div className="max-w-xl text-left relative z-10 flex-1 w-full flex flex-col justify-between h-full">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 text-[11px] font-bold tracking-wide uppercase border border-slate-200 dark:border-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Smart Study Space Active</span>
                </div>
                        
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-serif text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                    Welcome Back<br />
                    <span className="text-slate-500 dark:text-slate-400 font-sans font-medium text-2xl md:text-3xl tracking-normal mt-2 block">— Let's Make Today Productive</span>
                  </h1>
                  <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-md pt-2">
                    Review your recent coursework, generate practice tests, and master concepts faster with your personal AI study assistant.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6 w-full sm:w-auto mt-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('ai-tutor')}
                  className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 group cursor-pointer w-full sm:w-auto shrink-0"
                >
                  <span>Start Studying Smarter Today</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('study-session')}
                  className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full sm:w-auto shrink-0"
                >
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Start Focus Session</span>
                </motion.button>
              </div>
            </div>

            {/* Graphical Representation Card */}
            <div className="relative w-full max-w-[260px] shrink-0 z-10 hidden md:flex flex-col justify-center">
              <div className="relative rounded-[24px] bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Today's Target</span>
                  <span className="text-slate-700 dark:text-slate-300 text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded shadow-sm">45%</span>
                </div>
                      
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Focus Goal</span>
                      <span className="text-xs text-slate-400 font-semibold">27 / 60m</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '45%' }}
                        transition={{ delay: 0.5, duration: 1, type: "spring" }}
                        className="h-full bg-indigo-500 rounded-full" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quizzes</span>
                      <span className="text-xs text-slate-400 font-semibold">2 tasks</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '20%' }}
                        transition={{ delay: 0.7, duration: 1, type: "spring" }}
                        className="h-full bg-slate-400 dark:bg-slate-500 rounded-full" 
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center">
                  <p className="text-[10px] text-slate-400 font-semibold text-center leading-relaxed">Keep studying to unlock daily achievements.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* AI Insights (4 cols) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12 xl:col-span-4 h-full">
          <AIInsightsCard />
        </motion.div>

        {/* ROW 2 */}
        
        {/* Today's Tasks (4 cols) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-6 lg:col-span-4 h-full">
          <TodayTasksCard />
        </motion.div>

        {/* Recent Study Materials (4 cols) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-6 lg:col-span-4 h-full">
          <RecentStudyMaterials workspaces={workspaces} setActiveWorkspace={setActiveWorkspace} setActiveTab={setActiveTab} activeWorkspace={activeWorkspace} />
        </motion.div>

        {/* Mini Calendar (4 cols) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12 lg:col-span-4 h-full min-w-0">
          <CalendarWidget />
        </motion.div>

      </div>
    </motion.div>
  );
}
