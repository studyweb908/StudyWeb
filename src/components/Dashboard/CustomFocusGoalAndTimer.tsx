import React, { useState, useEffect, useRef } from 'react';
import { Clock, Play, Pause, RotateCcw, Check, Sparkles, Sliders, Flame } from 'lucide-react';
import { StudyTrackerService } from '../../services/StudyTrackerService';
import { saveProfileToSupabase } from '../../utils/profileStorage';

export function formatMinutesHuman(totalMins: number): string {
  const clean = Math.max(1, Math.round(totalMins || 45));
  const hrs = Math.floor(clean / 60);
  const mins = clean % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m (${clean}m)`;
  if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'} (${clean}m)`;
  return `${clean} mins`;
}

interface CustomDailyGoalSelectorProps {
  dailyGoalMinutes: number;
  todayMinutes: number;
  onGoalChange: (newGoalMinutes: number) => void;
  compact?: boolean;
}

const GOAL_PRESETS = [15, 25, 30, 45, 60, 90, 120, 180];

export const CustomDailyGoalSelector: React.FC<CustomDailyGoalSelectorProps> = ({
  dailyGoalMinutes,
  todayMinutes,
  onGoalChange,
  compact = false,
}) => {
  const [customHours, setCustomHours] = useState<number>(() => Math.floor((dailyGoalMinutes || 45) / 60));
  const [customMins, setCustomMins] = useState<number>(() => (dailyGoalMinutes || 45) % 60);
  const [showCustomInputs, setShowCustomInputs] = useState<boolean>(
    () => !GOAL_PRESETS.includes(dailyGoalMinutes)
  );

  useEffect(() => {
    setCustomHours(Math.floor((dailyGoalMinutes || 45) / 60));
    setCustomMins((dailyGoalMinutes || 45) % 60);
  }, [dailyGoalMinutes]);

  const applyMinutes = async (mins: number) => {
    const clamped = Math.max(1, Math.min(720, Math.round(mins || 45)));
    onGoalChange(clamped);
    StudyTrackerService.setDailyGoalMinutes(clamped);
    await saveProfileToSupabase({ dailyGoalMinutes: clamped });
  };

  const handleApplyCustom = async () => {
    const hrs = Math.max(0, Math.min(12, Math.floor(Number(customHours) || 0)));
    const mins = Math.max(0, Math.min(59, Math.floor(Number(customMins) || 0)));
    const total = Math.max(1, Math.min(720, hrs * 60 + mins));
    await applyMinutes(total);
  };

  const isCustomActive = !GOAL_PRESETS.includes(dailyGoalMinutes);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Daily Focus Target</span>
        </span>
        <span className="font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
          {formatMinutesHuman(dailyGoalMinutes)} / day ({todayMinutes}m logged today)
        </span>
      </div>

      {/* Quick Presets + Custom Toggle */}
      <div className={`grid ${compact ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-4 sm:grid-cols-9'} gap-1.5 sm:gap-2`}>
        {(compact ? [15, 30, 45, 60] : GOAL_PRESETS).map((mins) => (
          <button
            key={mins}
            type="button"
            onClick={() => applyMinutes(mins)}
            className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              dailyGoalMinutes === mins
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
            }`}
          >
            {mins >= 60 && mins % 60 === 0 ? `${mins / 60}h (${mins}m)` : `${mins}m`}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowCustomInputs((v) => !v)}
          className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            isCustomActive || showCustomInputs
              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          }`}
          title="Set any custom hours and minutes for your daily focus goal"
        >
          <Sliders className="w-3 h-3 shrink-0" />
          <span>{isCustomActive ? `${dailyGoalMinutes}m` : 'Custom'}</span>
        </button>
      </div>

      {/* Custom Hours & Minutes Picker */}
      {(showCustomInputs || isCustomActive) && (
        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/35 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Custom Hours (0–12)
              </label>
              <input
                type="number"
                min={0}
                max={12}
                value={customHours}
                onChange={(e) => setCustomHours(Math.max(0, Math.min(12, parseInt(e.target.value, 10) || 0)))}
                className="w-20 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Custom Minutes (0–59)
              </label>
              <input
                type="number"
                min={0}
                max={59}
                value={customMins}
                onChange={(e) => setCustomMins(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                className="w-20 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Or Total Mins (1–720)
              </label>
              <input
                type="number"
                min={1}
                max={720}
                value={Math.max(1, customHours * 60 + customMins)}
                onChange={(e) => {
                  const total = Math.max(1, Math.min(720, parseInt(e.target.value, 10) || 1));
                  setCustomHours(Math.floor(total / 60));
                  setCustomMins(total % 60);
                }}
                className="w-24 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyCustom}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Custom Goal ({Math.max(1, customHours * 60 + customMins)}m)</span>
          </button>
        </div>
      )}
    </div>
  );
};

interface LiveStudyCountdownTimerProps {
  subjectName?: string;
  dailyGoalMinutes: number;
  todayMinutes: number;
}

export const LiveStudyCountdownTimer: React.FC<LiveStudyCountdownTimerProps> = ({
  subjectName = 'General Study',
  dailyGoalMinutes,
  todayMinutes,
}) => {
  const remainingForGoal = Math.max(5, dailyGoalMinutes - todayMinutes);
  const [targetSeconds, setTargetSeconds] = useState<number>(() => remainingForGoal * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => remainingForGoal * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [inputHours, setInputHours] = useState<number>(() => Math.floor(remainingForGoal / 60));
  const [inputMinutes, setInputMinutes] = useState<number>(() => remainingForGoal % 60);
  const [inputSeconds, setInputSeconds] = useState<number>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      // Keep StudyTrackerService active and credit 1 additional study second if user was idle
      StudyTrackerService.recordStudyAction('workspace', subjectName || 'Focused Study');

      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          window.dispatchEvent(
            new CustomEvent('studyweb-toast', {
              detail: {
                title: 'Focus Countdown Complete!',
                badge: 'Session Finished',
                message: `Great job completing your ${Math.max(1, Math.round(targetSeconds / 60))}m focus countdown!`,
                type: 'success',
                duration: 4000,
              },
            })
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, subjectName, targetSeconds]);

  const applyDurationSeconds = (totalSecs: number) => {
    const clean = Math.max(10, Math.min(12 * 3600, Math.round(totalSecs)));
    setIsRunning(false);
    setTargetSeconds(clean);
    setRemainingSeconds(clean);
    setInputHours(Math.floor(clean / 3600));
    setInputMinutes(Math.floor((clean % 3600) / 60));
    setInputSeconds(clean % 60);
  };

  const handleApplyCustomCountdown = () => {
    const h = Math.max(0, Math.min(12, Math.floor(Number(inputHours) || 0)));
    const m = Math.max(0, Math.min(59, Math.floor(Number(inputMinutes) || 0)));
    const s = Math.max(0, Math.min(59, Math.floor(Number(inputSeconds) || 0)));
    const total = Math.max(10, h * 3600 + m * 60 + s);
    applyDurationSeconds(total);
  };

  const hrs = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;

  const formattedClock =
    hrs > 0
      ? `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const progressPct =
    targetSeconds > 0
      ? Math.min(100, Math.max(0, Math.round(((targetSeconds - remainingSeconds) / targetSeconds) * 100)))
      : 0;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-amber-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/30 border border-indigo-200/80 dark:border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-[#FF8800] fill-[#FF8800]" />
            <span>Customizable Focus Countdown Timer</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Set any countdown duration (hours, minutes, seconds) — automatically logs toward your daily streak
          </p>
        </div>

        {/* Live Clock Readout + Controls */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-950 text-white font-mono text-base sm:text-lg font-black tabular-nums tracking-wider shadow-xs border border-slate-800">
            {formattedClock}
          </div>

          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isRunning ? 'Pause' : remainingSeconds < targetSeconds ? 'Resume' : 'Start'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRunning(false);
              setRemainingSeconds(targetSeconds);
            }}
            title="Reset countdown"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 via-sky-500 to-[#FF8800] rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Quick Presets + Custom H:M:S Inputs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: '10m', mins: 10 },
            { label: '15m', mins: 15 },
            { label: '25m Pomodoro', mins: 25 },
            { label: '30m', mins: 30 },
            { label: '45m', mins: 45 },
            { label: '60m', mins: 60 },
            {
              label: `Remaining Goal (${Math.max(1, dailyGoalMinutes - todayMinutes)}m)`,
              mins: Math.max(1, dailyGoalMinutes - todayMinutes),
            },
          ].map((p) => {
            const active = targetSeconds === p.mins * 60;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyDurationSeconds(p.mins * 60)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom Hours : Minutes : Seconds */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-0.5">
            <label className="block text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Hrs
            </label>
            <input
              type="number"
              min={0}
              max={12}
              value={inputHours}
              onChange={(e) => setInputHours(Math.max(0, Math.min(12, parseInt(e.target.value, 10) || 0)))}
              className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-0.5">
            <label className="block text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Mins
            </label>
            <input
              type="number"
              min={0}
              max={59}
              value={inputMinutes}
              onChange={(e) => setInputMinutes(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
              className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-0.5">
            <label className="block text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Secs
            </label>
            <input
              type="number"
              min={0}
              max={59}
              value={inputSeconds}
              onChange={(e) => setInputSeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
              className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustomCountdown}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer transition-colors"
          >
            Set Timer
          </button>
        </div>
      </div>
    </div>
  );
};
