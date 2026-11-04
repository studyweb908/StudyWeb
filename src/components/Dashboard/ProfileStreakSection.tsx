import React, { useState, useMemo } from 'react';
import {
  Award,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Globe,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useStudyStats } from '../../hooks/useStudyStats';
import {
  StudyTrackerService,
  DAILY_GOAL_OPTIONS,
  detectBrowserTimezone,
} from '../../services/StudyTrackerService';
import { saveProfileToSupabase } from '../../utils/profileStorage';
import { PremiumFlame } from './PremiumFlame';
import { playRewardingStreakChime } from '../../utils/soundEffects';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

interface ProfileStreakSectionProps {
  onGoalChanged?: (minutes: number) => void;
}

export const ProfileStreakSection: React.FC<ProfileStreakSectionProps> = ({
  onGoalChanged,
}) => {
  const stats = useStudyStats();

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState<number>(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(now.getMonth());
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    status: string;
    completedMinutes: number;
    targetMinutes: number;
  } | null>(null);

  const monthlyData = useMemo(() => {
    return StudyTrackerService.getMonthlyCalendarDays(calendarYear, calendarMonth);
  }, [
    calendarYear,
    calendarMonth,
    stats.todayMinutes,
    stats.currentStreak,
    stats.dailyGoalMinutes,
    stats.timezone,
  ]);

  const detectedTz = useMemo(() => detectBrowserTimezone(), []);
  const timezoneOptions = useMemo(() => {
    const list = new Set([detectedTz, stats.timezone || 'UTC', ...COMMON_TIMEZONES]);
    return Array.from(list).filter(Boolean);
  }, [detectedTz, stats.timezone]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const d = new Date();
    setCalendarYear(d.getFullYear());
    setCalendarMonth(d.getMonth());
  };

  const handleSelectDailyGoal = async (mins: number) => {
    StudyTrackerService.setDailyGoalMinutes(mins);
    if (onGoalChanged) onGoalChanged(mins);
    await saveProfileToSupabase({ dailyGoalMinutes: mins });
    window.dispatchEvent(
      new CustomEvent('studyweb-toast', {
        detail: {
          title: 'Daily Study Goal Updated',
          badge: `${mins}m / Day`,
          message: `Your daily study goal is now ${mins} minutes. Historical streak days remain preserved.`,
          type: 'success',
          duration: 2800,
        },
      })
    );
  };

  const handleToggleSound = () => {
    const next = !stats.soundEnabled;
    StudyTrackerService.setSoundEnabled(next);
    if (next) {
      playRewardingStreakChime();
    }
  };

  const handleToggleAnimations = () => {
    const next = !stats.animationsEnabled;
    StudyTrackerService.setAnimationsEnabled(next);
  };

  const handleTimezoneChange = (tz: string) => {
    StudyTrackerService.setTimezone(tz);
    window.dispatchEvent(
      new CustomEvent('studyweb-toast', {
        detail: {
          title: 'Timezone Updated',
          badge: tz,
          message: `Daily streak rollover is now aligned to ${tz}.`,
          type: 'info',
          duration: 2600,
        },
      })
    );
  };

  const formattedLongestDate = useMemo(() => {
    if (!stats.longestStreakDate) {
      return stats.longestStreak > 0 ? 'Achieved Today' : 'Complete first daily goal to set record';
    }
    try {
      const [y, m, d] = stats.longestStreakDate.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return stats.longestStreakDate;
    }
  }, [stats.longestStreakDate, stats.longestStreak]);

  const motivationalMessage = useMemo(() => {
    if (stats.activeToday) {
      return `Incredible discipline! You completed today's ${stats.todayTargetMinutes}m study goal.`;
    }
    if (stats.currentStreak >= 7) {
      return `You're on a ${stats.currentStreak}-day roll! Study ${stats.remainingMinutes}m more today to extend it.`;
    }
    if (stats.currentStreak >= 1) {
      return `Great momentum! Study ${stats.remainingMinutes}m more today to reach ${stats.currentStreak + 1} consecutive days.`;
    }
    return `Complete your ${stats.todayTargetMinutes}-minute daily study goal to ignite your streak.`;
  }, [
    stats.activeToday,
    stats.currentStreak,
    stats.remainingMinutes,
    stats.todayTargetMinutes,
  ]);

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* A. CURRENT STREAK & B. LONGEST STREAK HERO ROW                    */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* A. Current Streak Card (7 Cols) */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-[28px] bg-white/95 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 flex flex-col sm:flex-row items-center gap-6 justify-between shadow-sm">
          <div
            className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-45"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 152, 0, 0.22) 0%, rgba(244, 67, 54, 0.08) 55%, transparent 75%)',
            }}
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('studyweb-open-streak-modal'))
              }
              className="p-3 rounded-3xl bg-gradient-to-b from-amber-500/10 via-orange-500/10 to-rose-500/5 border border-amber-500/25 hover:scale-105 transition-transform cursor-pointer shrink-0"
              title="Preview Full-Screen Streak Celebration"
            >
              <PremiumFlame
                size="xl"
                active={stats.currentStreak > 0 || stats.activeToday || stats.todayMinutes > 0}
                animated={stats.animationsEnabled}
                showParticles={true}
              />
            </button>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>Current Study Streak</span>
              </div>

              <div className="flex items-baseline justify-center sm:justify-start gap-2">
                <span className="text-4xl sm:text-5xl font-black font-mono tabular-nums tracking-tight bg-gradient-to-r from-[#FF8F00] via-[#FF6D00] to-[#D84315] dark:from-[#FFD54F] dark:via-[#FFB300] dark:to-[#FF6D00] bg-clip-text text-transparent">
                  {stats.currentStreak}
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white uppercase">
                  {stats.currentStreak === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
                {motivationalMessage}
              </p>

              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('studyweb-open-streak-modal'))
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Replay Celebration</span>
                </button>
                <span className="text-xs font-mono font-bold tabular-nums text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  Today: {stats.todayMinutes} / {stats.todayTargetMinutes} mins
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* B. Longest Streak Record Card (5 Cols) */}
        <div className="lg:col-span-5 rounded-[28px] bg-white/95 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                <span>Personal Longest Streak</span>
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                All-Time Record
              </span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-4xl sm:text-5xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
                {stats.longestStreak}
              </span>
              <span className="text-lg font-extrabold text-slate-600 dark:text-slate-300 uppercase">
                {stats.longestStreak === 1 ? 'Day' : 'Days'}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Date Achieved:{' '}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formattedLongestDate}
              </span>
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Daily Qualifying Target
            </span>
            <span className="font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
              {stats.dailyGoalMinutes} minutes / day
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* E. STUDY STATISTICS GRID (6 METRICS)                              */}
      {/* ================================================================= */}
      <div className="rounded-[28px] bg-white/95 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Study Streak Statistics</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified study consistency and active learning metrics across Tutor and Workspaces
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[
            {
              label: 'Total Study Days',
              value: `${stats.statistics.totalStudyDays}`,
              unit: stats.statistics.totalStudyDays === 1 ? 'day' : 'days',
              accent: 'text-indigo-600 dark:text-indigo-400',
            },
            {
              label: 'Current Streak',
              value: `${stats.statistics.currentStreak}`,
              unit: stats.statistics.currentStreak === 1 ? 'day' : 'days',
              accent: 'text-amber-600 dark:text-amber-400',
            },
            {
              label: 'Longest Streak',
              value: `${stats.statistics.longestStreak}`,
              unit: stats.statistics.longestStreak === 1 ? 'day' : 'days',
              accent: 'text-orange-600 dark:text-orange-400',
            },
            {
              label: 'Total Study Hours',
              value: `${stats.statistics.totalStudyHours}`,
              unit: 'hrs',
              accent: 'text-sky-600 dark:text-sky-400',
            },
            {
              label: 'Daily Average',
              value: `${stats.statistics.dailyAverageMinutes}`,
              unit: 'mins/day',
              accent: 'text-emerald-600 dark:text-emerald-400',
            },
            {
              label: 'Monthly Goals Met',
              value: `${stats.statistics.monthlyCompletedGoals}`,
              unit: 'this month',
              accent: 'text-purple-600 dark:text-purple-400',
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between"
            >
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {metric.label}
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-xl sm:text-2xl font-mono font-black tabular-nums ${metric.accent}`}>
                  {metric.value}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {metric.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* C. INTERACTIVE MONTHLY STUDY ACTIVITY CALENDAR                    */}
      {/* ================================================================= */}
      <div className="rounded-[28px] bg-white/95 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Study Activity Calendar</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Completed goal days preserve the daily target that applied on that date
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[140px] text-center text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
              {monthlyData.monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
            <div
              key={d}
              className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {monthlyData.days.map((day) => {
            const isCompleted = day.status === 'completed';
            const isPartial = day.status === 'partial';
            const isFuture = day.status === 'future';

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() =>
                  setSelectedDayInfo({
                    dateStr: day.dateStr,
                    status: day.status,
                    completedMinutes: day.completedMinutes,
                    targetMinutes: day.targetMinutes,
                  })
                }
                className={`relative h-12 sm:h-14 rounded-xl border p-1.5 flex flex-col items-center justify-between transition-all cursor-pointer ${
                  !day.inCurrentMonth ? 'opacity-35' : ''
                } ${
                  isCompleted
                    ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/15 border-amber-500/50 text-amber-900 dark:text-amber-200 shadow-[0_0_12px_rgba(255,152,0,0.18)]'
                    : isPartial
                    ? 'bg-sky-500/10 border-sky-500/35 text-sky-800 dark:text-sky-200'
                    : isFuture
                    ? 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-600'
                    : 'bg-slate-50/80 dark:bg-slate-800/35 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                } ${
                  day.isToday
                    ? 'ring-2 ring-amber-500 dark:ring-amber-400'
                    : ''
                }`}
                title={`${day.dateStr}: ${day.completedMinutes}/${day.targetMinutes} mins (${day.status})`}
              >
                <span className="text-[11px] font-mono font-bold tabular-nums">
                  {day.dayNumber}
                </span>

                <div className="flex items-center justify-center">
                  {isCompleted ? (
                    <span className="w-4 h-4 rounded-full bg-gradient-to-b from-[#FFB300] to-[#FF6D00] text-white flex items-center justify-center shadow-2xs">
                      <Check className="w-2.5 h-2.5 stroke-[3.2]" />
                    </span>
                  ) : isPartial ? (
                    <span className="text-[9px] font-mono font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                      {day.completedMinutes}m
                    </span>
                  ) : day.isToday ? (
                    <span className="text-[9px] font-extrabold uppercase text-amber-600 dark:text-amber-400">
                      Today
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend & Selected Day Inspector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gradient-to-b from-[#FFB300] to-[#FF6D00]" />
              <span>Goal Completed</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-500/40 border border-sky-500" />
              <span>Partial Study</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700" />
              <span>Missed Day</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-dashed border-slate-400" />
              <span>Future Day</span>
            </span>
          </div>

          {selectedDayInfo && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {selectedDayInfo.dateStr}: {selectedDayInfo.completedMinutes} / {selectedDayInfo.targetMinutes} mins ({selectedDayInfo.status.toUpperCase()})
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* D. STREAK MILESTONE ACHIEVEMENTS (7 BADGES)                       */}
      {/* ================================================================= */}
      <div className="rounded-[28px] bg-white/95 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Streak Milestone Achievements</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unlock milestone badges as your consecutive study streak grows
            </p>
          </div>
          <span className="text-xs font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {stats.achievements.filter((a) => a.unlocked).length} / {stats.achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {stats.achievements.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                badge.unlocked
                  ? 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 dark:from-amber-950/25 dark:via-slate-900 dark:to-orange-950/20 border-amber-300/80 dark:border-amber-700/60 shadow-2xs'
                  : 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200/70 dark:border-slate-800 opacity-75'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-black tabular-nums ${
                      badge.unlocked
                        ? 'bg-gradient-to-b from-[#FFB300] to-[#FF6D00] text-white shadow-xs'
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {badge.requiredDays}d
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      badge.unlocked
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {badge.unlocked ? 'Unlocked' : `${badge.progressPct}%`}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                    {badge.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    {badge.description}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      badge.unlocked
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${badge.progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                  <span>Requirement: {badge.requiredDays} {badge.requiredDays === 1 ? 'day' : 'days'}</span>
                  {badge.unlocked && badge.unlockedAt && (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {badge.unlockedAt.slice(0, 10)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* F. STREAK SETTINGS (DAILY GOAL, SOUND, ANIMATIONS, TIMEZONE)      */}
      {/* ================================================================= */}
      <div className="rounded-[28px] bg-white/95 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-6 shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Study Streak Settings & Preferences</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Customize your daily study target, celebration audio, flame animations, and timezone
          </p>
        </div>

        {/* 1. Daily Study Goal Selector (15..240m) */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Daily Study Target (Default: 60 minutes)
            </span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              Current Target: {stats.dailyGoalMinutes} minutes / day
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {DAILY_GOAL_OPTIONS.map((mins) => {
              const active = stats.dailyGoalMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectDailyGoal(mins)}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-mono font-bold tabular-nums transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                  }`}
                >
                  {mins} min
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Changing your daily target applies to future/current goals and never erases your historical qualifying days.
          </p>
        </div>

        {/* 2. Sound, Animation & Timezone Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Achievement Sound Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                {stats.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <span>Achievement Sound</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Subtle chime on streak completion
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                stats.soundEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {stats.soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {/* Animation Preference Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Zap
                  className={`w-4 h-4 ${
                    stats.animationsEnabled ? 'text-amber-500' : 'text-slate-400'
                  }`}
                />
                <span>Flame Animations</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Glowing flame & ember particles
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleAnimations}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                stats.animationsEnabled
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {stats.animationsEnabled ? 'Active' : 'Reduced'}
            </button>
          </div>

          {/* Timezone Setting */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>Streak Rollover Timezone</span>
            </label>
            <select
              value={stats.timezone || detectedTz}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz === detectedTz ? `${tz} (Local)` : tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileStreakSection;
