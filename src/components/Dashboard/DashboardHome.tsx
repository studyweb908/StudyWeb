import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Clock
} from 'lucide-react';
import { CalendarWidget, TodayTasksCard, AIInsightsCard, RecentStudyMaterials, StorageQuotaWidget } from './DashboardWidgets';
import { HeroSkeleton, AIInsightsSkeleton, TasksSkeleton, RecentStudySkeleton, CalendarSkeleton, StorageQuotaSkeleton } from './DashboardSkeletons';
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
            <HeroSkeleton />
          </div>
          <div className="col-span-1 md:col-span-12 xl:col-span-4 h-full min-h-[320px]">
            <AIInsightsSkeleton />
          </div>
          <div className="col-span-1 md:col-span-6 lg:col-span-4 h-full min-h-[320px]">
            <TasksSkeleton />
          </div>
          <div className="col-span-1 md:col-span-6 lg:col-span-4 h-full min-h-[320px]">
            <RecentStudySkeleton />
          </div>
          <div className="col-span-1 md:col-span-12 lg:col-span-4 h-full min-h-[320px]">
            <CalendarSkeleton />
          </div>
          <div className="col-span-1 md:col-span-6 lg:col-span-4 h-full min-h-[320px]">
            <StorageQuotaSkeleton />
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
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12">
          <div className="relative rounded-[32px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm h-full flex flex-col md:flex-row items-stretch p-6 gap-6 md:gap-8">
            <div className="max-w-xl text-left relative z-10 flex-1 w-full flex flex-col justify-between h-full">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-serif text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                    Welcome Back<br />
                    <span className="text-slate-500 dark:text-slate-400 font-sans font-medium text-2xl md:text-3xl tracking-normal mt-2 block">— Let's Make Today Productive</span>
                  </h1>
                </div>
              </div>

              {/* Action buttons removed */}
            </div>

            {/* Graphical Representation Card removed */}
          </div>
        </motion.div>
        
        {/* AI Insights removed */}

        {/* ROW 2 - Cards removed as requested */}
        
        {/* ROW 3 */}
        
        {/* Storage Quota (4 cols) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-6 lg:col-span-4 h-full min-w-0">
          <StorageQuotaWidget workspaces={workspaces} />
        </motion.div>

      </div>
    </motion.div>
  );
}
