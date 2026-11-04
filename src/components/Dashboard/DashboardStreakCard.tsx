import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Award,
  Clock,
  Sliders,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useStudyStats } from '../../hooks/useStudyStats';
import {
  StudyTrackerService,
  DAILY_GOAL_OPTIONS,
} from '../../services/StudyTrackerService';
import { saveProfileToSupabase } from '../../utils/profileStorage';
import { PremiumFlame } from './PremiumFlame';

interface DashboardStreakCardProps {
  onOpenProfileStreaks?: () => void;
}

export const DashboardStreakCard: React.FC<DashboardStreakCardProps> = ({
  onOpenProfileStreaks,
}) => {
  const stats = useStudyStats();
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);

  const weeklyDays = StudyTrackerService.getWeeklyStreakDays();
  const currentStreak = stats.currentStreak;
  const longestStreak = stats.longestStreak;
  const todayMinutes = stats.todayMinutes;
  const targetMinutes = stats.todayTargetMinutes || stats.dailyGoalMinutes || 60;
  const remainingMinutes = Math.max(0, targetMinutes - todayMinutes);
  const progressPct = Math.min(
    100,
    targetMinutes > 0 ? Math.round((todayMinutes / targetMinutes) * 100) : 0
  );

  const handleSelectDailyGoal = async (minutes: number) => {
    setIsUpdatingGoal(true);
    try {
      StudyTrackerService.setDailyGoalMinutes(minutes);
      await saveProfileToSupabase({ dailyGoalMinutes: minutes });
      setShowGoalPicker(false);
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  return (
    <div
      data-tour="dashboard-streak-card"
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xs p-5 sm:p-6 transition-colors"
    >
      {/* Subtle Ambient Warm Glow */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl opacity-45 dark:opacity-35"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 152, 0, 0.18) 0%, rgba(244, 67, 54, 0.06) 55%, transparent 75%)',
        }}
      />

      {/* TOP HEADER ROW */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
            YOUR STUDY STREAK
          </span>
          {stats.isStudyingLive && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tracking Active Study</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Longest Streak Record */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Longest Streak:</span>
            <span className="font-mono font-extrabold text-slate-900 dark:text-white">
              {longestStreak} {longestStreak === 1 ? 'Day' : 'Days'}
            </span>
          </div>

          {/* Customize Daily Goal Button */}
          <button
            type="button"
            onClick={() => setShowGoalPicker((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
              showGoalPicker
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title="Customize your daily study target"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Goal: { stats.dailyGoalMinutes }m</span>
          </button>

          {/* Celebration Modal Trigger */}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('studyweb-open-streak-modal'))
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors cursor-pointer"
            title="Open Streak Celebration Experience"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Celebration</span>
          </button>

          {onOpenProfileStreaks && (
            <button
              type="button"
              onClick={onOpenProfileStreaks}
              className="inline-flex items-center gap-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-1"
            >
              <span>Full History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* INLINE DAILY GOAL CUSTOMIZATION DRAWER (15..240 MINUTES) */}
      <AnimatePresence>
        {showGoalPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-5"
          >
            <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Select Daily Study Target (Preserves Historical Streak Achievements)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Default: 60 minutes
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {DAILY_GOAL_OPTIONS.map((mins) => {
                  const isSelected = stats.dailyGoalMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      disabled={isUpdatingGoal}
                      onClick={() => handleSelectDailyGoal(mins)}
                      className={`py-2 px-2 rounded-lg border text-xs font-mono font-bold tabular-nums transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                      }`}
                    >
                      {mins}m
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN 3-COLUMN RESPONSIVE STREAK GRID */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* 1. LEFT: GLOWING FLAME & ANIMATED STREAK NUMBER (4 Cols) */}
        <div className="lg:col-span-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('studyweb-open-streak-modal'))
            }
            className="relative p-2 rounded-2xl bg-gradient-to-b from-amber-500/10 via-orange-500/10 to-rose-500/5 border border-amber-500/20 dark:border-amber-500/25 hover:scale-105 transition-transform cursor-pointer shrink-0"
            title="Click to preview StudyWeb Streak Celebration"
          >
            <PremiumFlame
              size="lg"
              active={currentStreak > 0 || stats.activeToday || todayMinutes > 0}
              animated={stats.animationsEnabled}
              showParticles={true}
            />
          </button>

          <div className="min-w-0 text-left">
            <div className="flex items-baseline gap-2">
              <motion.span
                key={currentStreak}
                initial={{ y: 6, opacity: 0.4 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                className="text-3xl sm:text-4xl font-black font-mono tabular-nums tracking-tight bg-gradient-to-r from-[#FF8F00] via-[#FF6D00] to-[#E65100] dark:from-[#FFD54F] dark:via-[#FFB300] dark:to-[#FF6D00] bg-clip-text text-transparent"
              >
                {currentStreak}
              </motion.span>
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                {currentStreak === 1 ? 'DAY' : 'DAYS'}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
              {stats.activeToday
                ? "Today's study goal complete! Great habit."
                : "You're building a great learning habit."}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.activeToday
                ? `Qualified at ${targetMinutes}m target today`
                : `${remainingMinutes} min left to qualify today's streak`}
            </p>
          </div>
        </div>

        {/* 2. MIDDLE: DAILY STUDY GOAL & PROGRESS BAR (4 Cols) */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>DAILY STUDY GOAL</span>
            </span>
            <span className="font-mono text-xs sm:text-sm font-black tabular-nums text-slate-900 dark:text-white">
              {todayMinutes} / {targetMinutes} MINUTES
            </span>
          </div>

          {/* Smooth Animated Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(todayMinutes > 0 ? 4 : 0, progressPct)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#FFB300] via-[#FF8F00] to-[#FF5722] shadow-[0_0_12px_rgba(255,143,0,0.45)]"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
            <span>Completed: {todayMinutes}m</span>
            <span>
              {remainingMinutes === 0
                ? 'Goal Achieved (+1 Streak)'
                : `Remaining: ${remainingMinutes}m`}
            </span>
          </div>
        </div>

        {/* 3. RIGHT: WEEKLY SEVEN-DAY CALENDAR (MON - SUN) (4 Cols) */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>THIS WEEK</span>
            <span className="font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {weeklyDays.filter((d) => d.completed).length} / 7 Days
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {weeklyDays.map((day) => (
              <div
                key={day.dateStr}
                className="flex flex-col items-center gap-1.5"
                title={`${day.fullLabel} (${day.dateStr}): ${day.completedMinutes}/${day.targetMinutes} mins`}
              >
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-tight ${
                    day.isToday
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {day.fullLabel}
                </span>

                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold tabular-nums transition-all ${
                    day.completed
                      ? 'bg-gradient-to-b from-[#FFB300] to-[#FF6D00] text-white shadow-[0_0_12px_rgba(255,143,0,0.4)] ring-2 ring-amber-400/30'
                      : day.isToday
                      ? 'border-2 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 ring-2 ring-amber-500/15'
                      : day.completedMinutes > 0
                      ? 'bg-amber-500/15 border border-amber-400/40 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {day.completed ? (
                    <Check className="w-4 h-4 stroke-[3] text-white" />
                  ) : (
                    day.dayNumber
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStreakCard;
