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

export default function DashboardHome({ setActiveTab, setActiveWorkspace, workspaces = [] }: DashboardHomeProps) {
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
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-secondary/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="max-w-xl text-left relative z-10 flex-1 w-full flex flex-col justify-between h-full">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
                  <span>Smart Study Space Active</span>
                </div>
                        
                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display leading-[1.1]">
                    Good Morning 👋 <br />
                    Welcome back!
                  </h1>
                  <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md">
                    "Small daily improvements over time lead to stunning results." Your AI Tutor analyzed your math homework. Ready to crush your targets?
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6 w-full sm:w-auto mt-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('ai-tutor')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold transition-all shadow-lg shadow-slate-900/20 dark:shadow-white/20 flex items-center justify-center gap-2 group cursor-pointer w-full sm:w-auto shrink-0"
                >
                  <span>Ask AI Tutor</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab('study-session')}
                  className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-sm w-full sm:w-auto shrink-0"
                >
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Focus Timer</span>
                </motion.button>
              </div>
            </div>

            {/* Graphical Representation Card */}
            <div className="relative w-full max-w-[260px] shrink-0 z-10 hidden md:flex flex-col justify-center">
              <div className="relative rounded-[24px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Today's Target</span>
                  <span className="text-slate-700 dark:text-slate-300 text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md shadow-sm">0%</span>
                </div>
                      
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Focus Goal</span>
                      <span className="text-xs text-slate-400 font-semibold">0 / 60m</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '45%' }}
                        transition={{ delay: 0.5, duration: 1, type: "spring" }}
                        className="h-full bg-slate-900 dark:bg-white rounded-full" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quizzes</span>
                      <span className="text-xs text-slate-400 font-semibold">0 tasks</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
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
                  <p className="text-[10px] text-slate-400 font-semibold">Start studying to unlock achievements!</p>
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
          <RecentStudyMaterials workspaces={workspaces} setActiveWorkspace={setActiveWorkspace} setActiveTab={setActiveTab} />
        </motion.div>

        {/* Mini Calendar (4 cols) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12 lg:col-span-4 h-full min-w-0">
          <CalendarWidget />
        </motion.div>

      </div>
    </motion.div>
  );
}
