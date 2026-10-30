import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Sparkles, X } from 'lucide-react';
import { StudyTrackerService } from '../../services/StudyTrackerService';
import { playGlassPopSound } from '../../utils/soundEffects';

export const StreakCelebrationModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [streakCount, setStreakCount] = useState<number>(1);
  const [displayCount, setDisplayCount] = useState<number>(1);
  const [subtitleText, setSubtitleText] = useState<string>("You've completed today's study task!");
  const [weeklyDays, setWeeklyDays] = useState<
    Array<{ label: string; dateStr: string; completed: boolean; isToday: boolean }>
  >([]);

  const refreshData = (customStreak?: number, customReason?: string) => {
    const stats = StudyTrackerService.getFormattedStats();
    const resolvedStreak = typeof customStreak === 'number' && customStreak > 0 ? customStreak : stats.currentStreak;
    setStreakCount(resolvedStreak);
    setDisplayCount(Math.max(1, resolvedStreak - 1));
    setSubtitleText(
      customReason ||
        (stats.activeToday
          ? "You've completed today's study task!"
          : 'Complete a study task today to extend your streak!')
    );
    setWeeklyDays(StudyTrackerService.getWeeklyStreakDays());
  };

  useEffect(() => {
    const handleCompleted = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      refreshData(detail?.streak, detail?.reason || "You've completed today's study task!");
      setIsOpen(true);
      playGlassPopSound();
    };

    const handleOpenManual = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      refreshData(detail?.streak, detail?.reason);
      setIsOpen(true);
      playGlassPopSound();
    };

    window.addEventListener('studyweb-daily-routine-completed', handleCompleted);
    window.addEventListener('studyweb-open-streak-modal', handleOpenManual);
    return () => {
      window.removeEventListener('studyweb-daily-routine-completed', handleCompleted);
      window.removeEventListener('studyweb-open-streak-modal', handleOpenManual);
    };
  }, []);

  // Roll up number animation when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      setDisplayCount(streakCount);
    }, 340);
    return () => clearTimeout(t);
  }, [isOpen, streakCount]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 sm:p-6 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl select-none"
          role="dialog"
          aria-modal="true"
          aria-label="Daily Streak Celebration"
        >
          {/* Ambient Golden Flame Glow */}
          <div className="pointer-events-none absolute w-[380px] h-[380px] rounded-full bg-amber-400/20 dark:bg-amber-500/15 blur-3xl -top-10" />

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close streak modal"
            className="absolute top-5 right-5 p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative z-10 w-full max-w-md flex flex-col items-center text-center px-2 sm:px-4"
          >
            {/* 1. Duolingo-Style Multi-Layer Flame Illustration */}
            <div className="relative w-36 h-40 flex items-center justify-center mb-2">
              {/* Floating Sparkles */}
              <motion.span
                animate={{ y: [-4, -14, -4], opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-3 left-5 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24]"
              />
              <motion.span
                animate={{ y: [-2, -12, -2], opacity: [0.4, 1, 0.4], scale: [0.85, 1.2, 0.85] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                className="absolute top-6 right-5 w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_10px_#fb923c]"
              />
              <motion.span
                animate={{ y: [0, -10, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                className="absolute bottom-8 left-3 text-amber-400"
              >
                <Sparkles className="w-4 h-4 fill-amber-400" />
              </motion.span>

              <motion.svg
                viewBox="0 0 160 180"
                className="w-32 h-36 drop-shadow-[0_14px_28px_rgba(249,115,22,0.38)]"
                animate={{ scale: [1, 1.04, 1], y: [0, -3, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <defs>
                  <linearGradient id="duoOuterFlame" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#FFB020" />
                    <stop offset="55%" stopColor="#FF7A00" />
                    <stop offset="100%" stopColor="#F94D00" />
                  </linearGradient>
                  <linearGradient id="duoInnerFlame" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#FFF3B0" />
                    <stop offset="50%" stopColor="#FFD026" />
                    <stop offset="100%" stopColor="#FF9800" />
                  </linearGradient>
                </defs>
                {/* Outer Orange Flame */}
                <path
                  d="M84 10 C84 10 138 56 138 110 C138 145 112 170 80 170 C48 170 22 145 22 110 C22 76 46 50 56 38 C54 56 64 66 64 66 C60 40 84 10 84 10 Z"
                  fill="url(#duoOuterFlame)"
                />
                {/* Inner Golden Flame */}
                <path
                  d="M82 54 C82 54 114 84 114 118 C114 140 99 156 80 156 C61 156 46 140 46 118 C46 98 62 80 70 72 C69 84 76 90 76 90 C74 72 82 54 82 54 Z"
                  fill="url(#duoInnerFlame)"
                />
                {/* Core Warm Highlight */}
                <ellipse cx="80" cy="134" rx="16" ry="20" fill="#FFF9DB" opacity="0.92" />
              </motion.svg>
            </div>

            {/* 2. Giant Animated Streak Number & "day streak!" */}
            <motion.div
              key={displayCount}
              initial={{ scale: 0.75, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              className="font-display font-black tabular-nums text-6xl sm:text-7xl tracking-tight text-[#FF8800] dark:text-[#FFA114] drop-shadow-[0_2px_10px_rgba(255,136,0,0.22)] leading-none"
            >
              {displayCount}
            </motion.div>

            <h2 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-[#FF8800] dark:text-[#FFA114]">
              day streak!
            </h2>

            <p className="mt-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
              {subtitleText}
            </p>

            {/* 3. 7-Day Weekly Streak Card (Su Mo Tu We Th Fr Sa) */}
            <div className="w-full mt-6 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 shadow-sm">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                {weeklyDays.map((day, idx) => (
                  <div key={day.dateStr} className="flex flex-col items-center gap-2">
                    <span
                      className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wide ${
                        day.isToday
                          ? 'text-[#FF8800] dark:text-amber-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {day.label}
                    </span>

                    <motion.div
                      initial={day.isToday ? { scale: 0.5 } : false}
                      animate={day.isToday ? { scale: 1 } : undefined}
                      transition={{
                        type: 'spring',
                        stiffness: 360,
                        damping: 18,
                        delay: day.isToday ? 0.25 : idx * 0.03,
                      }}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold transition-all ${
                        day.completed
                          ? 'bg-gradient-to-b from-[#FFA800] to-[#FF7A00] text-white shadow-[0_3px_10px_rgba(255,136,0,0.35)]'
                          : day.isToday
                          ? 'border-2 border-dashed border-[#FF8800] bg-amber-50/60 dark:bg-amber-950/30 text-[#FF8800]'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-200/80 dark:border-slate-700/60'
                      }`}
                    >
                      {day.completed ? (
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3.2]" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-current opacity-40" />
                      )}
                    </motion.div>
                  </div>
                ))}
              </div>

              <p className="pt-3.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                Studying every day builds lasting exam &amp; interview mastery. Keep your flame lit tomorrow!
              </p>
            </div>

            {/* 4. Tactile Full-Width CONTINUE Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full mt-6 py-3.5 px-6 rounded-2xl bg-[#FF8800] hover:bg-[#FF961A] active:translate-y-0.5 text-white font-extrabold text-sm sm:text-base uppercase tracking-wider shadow-[0_4px_0_#CC6D00] hover:shadow-[0_4px_0_#CC6D00] active:shadow-none transition-all cursor-pointer"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
