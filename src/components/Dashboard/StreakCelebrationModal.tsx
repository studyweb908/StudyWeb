import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RotateCcw, Share2, X, Volume2, VolumeX, Award } from 'lucide-react';
import { StudyTrackerService } from '../../services/StudyTrackerService';
import { PremiumFlame } from './PremiumFlame';
import { ShareContentModal, triggerNativeDeviceShare } from './ShareContentModal';
import {
  playStreakVideoAudio,
  stopStreakVideoAudio,
  playRewardingStreakChime,
} from '../../utils/soundEffects';

// Timed sequence matching Section 7 specification:
// 0–300ms: Dark backdrop fade-in ('backdrop')
// 300–700ms: Flame scale-up & transformation ('flame')
// 700–1200ms: Glowing particles rise ('particles')
// 1200–1600ms: Streak number animates ('counter')
// 1600–2000ms: Celebration text & button appear ('complete')
type CelebrationTimelineStage = 'backdrop' | 'flame' | 'particles' | 'counter' | 'complete';

const BURST_PARTICLES = [
  { angle: -155, dist: 118, color: '#FFB300', w: 7, h: 7, round: true },
  { angle: -130, dist: 132, color: '#FF6D00', w: 9, h: 4, round: false },
  { angle: -105, dist: 112, color: '#FFD54F', w: 6, h: 6, round: true },
  { angle: -75, dist: 126, color: '#00E676', w: 8, h: 4, round: false },
  { angle: -45, dist: 118, color: '#FFB300', w: 7, h: 7, round: true },
  { angle: -20, dist: 134, color: '#FF8F00', w: 9, h: 4, round: false },
  { angle: 15, dist: 120, color: '#FFD54F', w: 6, h: 6, round: true },
  { angle: 42, dist: 114, color: '#FF5722', w: 8, h: 4, round: false },
  { angle: 145, dist: 116, color: '#FFB300', w: 8, h: 4, round: false },
  { angle: 170, dist: 124, color: '#FFD54F', w: 6, h: 6, round: true },
];

export const StreakCelebrationModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<CelebrationTimelineStage>('backdrop');
  const [replaySeed, setReplaySeed] = useState(0);
  const [streakCount, setStreakCount] = useState<number>(1);
  const [previousStreak, setPreviousStreak] = useState<number>(0);
  const [displayCount, setDisplayCount] = useState<number>(0);
  const [activeToday, setActiveToday] = useState<boolean>(false);
  const [todayMinutes, setTodayMinutes] = useState<number>(0);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(60);
  const [longestStreak, setLongestStreak] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [weeklyDays, setWeeklyDays] = useState<
    Array<{
      label: string;
      fullLabel: string;
      dateStr: string;
      dayNumber: number;
      completed: boolean;
      completedMinutes: number;
      targetMinutes: number;
      isToday: boolean;
      isFuture: boolean;
    }>
  >([]);

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearTimelineTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const loadSnapshot = useCallback((customStreak?: number, prevStreakArg?: number) => {
    const stats = StudyTrackerService.getFormattedStats();
    const resolvedStreak =
      typeof customStreak === 'number' ? customStreak : stats.currentStreak;
    const resolvedPrev =
      typeof prevStreakArg === 'number'
        ? prevStreakArg
        : Math.max(0, resolvedStreak - 1);

    setStreakCount(resolvedStreak);
    setPreviousStreak(resolvedPrev);
    setDisplayCount(resolvedPrev);
    setActiveToday(stats.activeToday);
    setTodayMinutes(stats.todayMinutes);
    setDailyGoalMinutes(stats.todayTargetMinutes || stats.dailyGoalMinutes || 60);
    setLongestStreak(Math.max(stats.longestStreak || 0, resolvedStreak));
    setSoundEnabled(StudyTrackerService.getSoundEnabled());
    setAnimationsEnabled(StudyTrackerService.getAnimationsEnabled());
    setWeeklyDays(StudyTrackerService.getWeeklyStreakDays());
  }, []);

  useEffect(() => {
    const handleCompleted = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      loadSnapshot(detail?.streak, detail?.previousStreak);
      setReplaySeed((s) => s + 1);
      setIsOpen(true);
    };

    const handleOpenManual = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      loadSnapshot(detail?.streak, detail?.previousStreak);
      setReplaySeed((s) => s + 1);
      setIsOpen(true);
    };

    window.addEventListener('studyweb-daily-routine-completed', handleCompleted);
    window.addEventListener('studyweb-open-streak-modal', handleOpenManual);
    return () => {
      window.removeEventListener('studyweb-daily-routine-completed', handleCompleted);
      window.removeEventListener('studyweb-open-streak-modal', handleOpenManual);
    };
  }, [loadSnapshot]);

  // Execute the 0–2000ms celebration timeline
  useEffect(() => {
    clearTimelineTimers();
    if (!isOpen) {
      stopStreakVideoAudio();
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animateFlag = animationsEnabled && !prefersReducedMotion;

    if (!animateFlag) {
      setStage('complete');
      setDisplayCount(streakCount);
      if (StudyTrackerService.getSoundEnabled()) {
        playRewardingStreakChime();
      }
      return;
    }

    // 0–300ms: Dark backdrop fade-in & small spark
    setStage('backdrop');
    setDisplayCount(previousStreak);

    // 300–700ms: Flame scale-up & transformation + synchronized audio chime
    timersRef.current.push(
      setTimeout(() => {
        setStage('flame');
        playStreakVideoAudio();
        playRewardingStreakChime();
      }, 300)
    );

    // 700–1200ms: Glowing particles rise
    timersRef.current.push(
      setTimeout(() => {
        setStage('particles');
      }, 700)
    );

    // 1200–1600ms: Streak number animates up to new streak
    timersRef.current.push(
      setTimeout(() => {
        setStage('counter');
        setDisplayCount(streakCount);
      }, 1200)
    );

    // 1600–2000ms: Celebration text and CONTINUE LEARNING button appear
    timersRef.current.push(
      setTimeout(() => {
        setStage('complete');
        setDisplayCount(streakCount);
      }, 1600)
    );

    return () => {
      clearTimelineTimers();
      stopStreakVideoAudio();
    };
  }, [isOpen, replaySeed, streakCount, previousStreak, animationsEnabled]);

  if (typeof document === 'undefined') return null;

  const firstCompletedIdx = weeklyDays.findIndex((d) => d.completed);
  const lastCompletedIdx = weeklyDays.reduce((acc, d, idx) => (d.completed ? idx : acc), -1);
  const todayIdx = weeklyDays.findIndex((d) => d.isToday);

  const handleClose = () => {
    StudyTrackerService.acknowledgeCelebrationForToday();
    stopStreakVideoAudio();
    setIsOpen(false);
  };

  const handleReplay = () => {
    setReplaySeed((s) => s + 1);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    StudyTrackerService.setSoundEnabled(next);
    if (!next) {
      stopStreakVideoAudio();
    } else {
      playRewardingStreakChime();
    }
  };

  const handleContinueOrCheckIn = () => {
    if (!activeToday) {
      const res = StudyTrackerService.checkInToday();
      setStreakCount(res.streak);
      setDisplayCount(res.streak);
      setActiveToday(true);
      setWeeklyDays(StudyTrackerService.getWeeklyStreakDays());
      playRewardingStreakChime();
    } else {
      handleClose();
    }
  };

  const handleShareStreak = () => {
    triggerNativeDeviceShare({
      type: 'streak',
      streakCount,
    });
  };

  const flameStage: 'small' | 'expanding' | 'full' =
    stage === 'backdrop' ? 'small' : stage === 'flame' ? 'expanding' : 'full';

  const showDetailsAndButton =
    stage === 'counter' || stage === 'complete' || !animationsEnabled;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="fixed inset-0 z-[99999] w-screen h-screen bg-[#07090E]/95 backdrop-blur-xl text-white flex flex-col items-center justify-between px-4 sm:px-6 py-5 sm:py-8 overflow-y-auto select-none"
          role="dialog"
          aria-modal="true"
          aria-label="StudyWeb Streak Celebration"
        >
          {/* TOP BAR */}
          <div className="w-full max-w-md flex items-center justify-between z-30 shrink-0">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo-inner.png"
                alt="StudyWeb"
                className="w-7 h-7 object-contain select-none shrink-0"
              />
              <div>
                <span className="text-sm font-extrabold tracking-tight text-white/95 block leading-none">
                  StudyWeb Streaks
                </span>
                <span className="text-[10px] font-semibold text-amber-400/90 tracking-wider uppercase">
                  Daily Habit Mastery
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSound}
                aria-label={soundEnabled ? 'Mute celebration sound' : 'Unmute celebration sound'}
                title={soundEnabled ? 'Sound Enabled (Click to Mute)' : 'Sound Muted (Click to Enable)'}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
              <button
                type="button"
                onClick={handleReplay}
                aria-label="Replay celebration animation"
                title="Replay celebration animation"
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShareStreak}
                aria-label="Share streak"
                title="Share your streak"
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close celebration modal"
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CENTER CELEBRATION STAGE */}
          <div className="relative w-full max-w-md flex-1 flex flex-col items-center justify-center my-auto py-4">
            {/* Warm Golden-Orange Radial Glow Backdrop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: stage === 'backdrop' ? 0.35 : 0.9,
                scale: stage === 'backdrop' ? 0.75 : 1.05,
              }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 w-[320px] sm:w-[400px] h-[320px] sm:h-[400px] rounded-full blur-3xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(255, 160, 0, 0.28) 0%, rgba(255, 87, 34, 0.14) 45%, transparent 72%)',
              }}
            />

            {/* 1. TRANSFORMING PREMIUM FLAME (300–700ms scale-up, 700–1200ms rising particles) */}
            <div className="relative flex flex-col items-center justify-center mb-4 z-10">
              <div className="relative flex items-center justify-center">
                <PremiumFlame
                  size="celebration"
                  active={true}
                  animated={animationsEnabled}
                  showParticles={stage !== 'backdrop'}
                  transformationStage={flameStage}
                />

                {/* Burst Particles during 700–1200ms phase */}
                <AnimatePresence>
                  {(stage === 'particles' || stage === 'counter') && animationsEnabled && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
                      {BURST_PARTICLES.map((p, i) => {
                        const rad = (p.angle * Math.PI) / 180;
                        const tx = Math.cos(rad) * p.dist;
                        const ty = Math.sin(rad) * p.dist;
                        return (
                          <motion.span
                            key={i}
                            initial={{ x: tx * 0.15, y: ty * 0.15, scale: 0.3, opacity: 1 }}
                            animate={{
                              x: tx,
                              y: ty,
                              scale: 1,
                              opacity: [1, 0.95, 0],
                              rotate: p.angle * 1.4,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.85, ease: 'easeOut' }}
                            style={{
                              width: p.w,
                              height: p.h,
                              backgroundColor: p.color,
                              boxShadow: `0 0 10px ${p.color}`,
                            }}
                            className={`absolute ${p.round ? 'rounded-full' : 'rounded-xs'}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. ANIMATED STREAK NUMBER (1200–1600ms) */}
              <motion.div
                key={`count-${displayCount}-${stage}`}
                initial={{ scale: 0.82, opacity: 0.5, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="mt-2 text-center"
              >
                <div className="inline-flex items-baseline gap-2.5">
                  <span className="text-4xl sm:text-5xl font-black font-mono tabular-nums bg-gradient-to-b from-[#FFF59D] via-[#FFB300] to-[#FF6D00] bg-clip-text text-transparent drop-shadow-[0_2px_16px_rgba(255,152,0,0.45)]">
                    {displayCount}
                  </span>
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-amber-400 uppercase">
                    {displayCount === 1 ? 'DAY' : 'DAYS'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold tracking-[0.2em] uppercase text-amber-300/90 mt-1">
                  STUDY STREAK!
                </p>
              </motion.div>
            </div>

            {/* 3. CELEBRATION COPY (1600–2000ms) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: showDetailsAndButton ? 1 : 0.15,
                y: showDetailsAndButton ? 0 : 10,
              }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              className="text-center mb-5 z-10 px-2 space-y-1.5"
            >
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {activeToday
                  ? "You have completed today's streak!"
                  : `Reach your ${dailyGoalMinutes}-minute daily study goal to extend your streak.`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                {activeToday
                  ? `Completed your ${dailyGoalMinutes}-minute daily study goal. Share your streak or keep the momentum going!`
                  : 'Keep the momentum going tomorrow.'}
              </p>
            </motion.div>

            {/* 4. WEEKLY 7-DAY CALENDAR CARD */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="relative w-full bg-[#121622]/90 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.65)] z-10"
            >
              <div className="flex items-center justify-between mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>This Week</span>
                <span className="inline-flex items-center gap-1 text-amber-400 font-mono tabular-nums">
                  <Award className="w-3.5 h-3.5" />
                  <span>Longest: {longestStreak} {longestStreak === 1 ? 'Day' : 'Days'}</span>
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2.5 text-center">
                {weeklyDays.map((d, i) => (
                  <span
                    key={`header-${i}-${d.dateStr}`}
                    className={`text-[10px] sm:text-xs font-extrabold tracking-wide ${
                      d.isToday ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {d.fullLabel}
                  </span>
                ))}
              </div>

              <div className="relative grid grid-cols-7 gap-1 sm:gap-2 items-center py-1">
                {firstCompletedIdx !== -1 && lastCompletedIdx >= firstCompletedIdx && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scaleY: 0.8 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      left: `${(firstCompletedIdx / 7) * 100 + 1.2}%`,
                      width: `${((lastCompletedIdx - firstCompletedIdx + 1) / 7) * 100 - 2.4}%`,
                    }}
                    className="absolute h-9 sm:h-10 rounded-full bg-gradient-to-r from-amber-500/25 via-orange-500/30 to-amber-500/25 border border-amber-400/40 z-0 shadow-[0_0_16px_rgba(255,152,0,0.22)]"
                  />
                )}

                {weeklyDays.map((d, idx) => {
                  const isTodayCell = idx === todayIdx;

                  return (
                    <div
                      key={`circle-${d.dateStr}`}
                      className="relative z-10 flex items-center justify-center"
                    >
                      {d.completed ? (
                        <motion.div
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-[#FFB300] to-[#FF6D00] flex items-center justify-center text-white shadow-[0_0_14px_rgba(255,152,0,0.5)]"
                          title={`Completed on ${d.dateStr} (${d.completedMinutes}/${d.targetMinutes}m)`}
                        >
                          <Check className="w-5 h-5 text-white stroke-[3.2]" />
                        </motion.div>
                      ) : isTodayCell ? (
                        <button
                          type="button"
                          onClick={handleContinueOrCheckIn}
                          title="Today's study goal progress"
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500/15 border-2 border-amber-400 text-amber-300 font-mono font-black text-xs sm:text-sm flex items-center justify-center ring-4 ring-amber-400/15 shadow-[0_0_16px_rgba(255,179,0,0.35)] cursor-pointer"
                        >
                          {d.dayNumber}
                        </button>
                      ) : (
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 text-slate-400 font-mono font-bold text-xs sm:text-sm flex items-center justify-center"
                          title={d.dateStr}
                        >
                          {d.dayNumber}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <span>Daily Study Goal</span>
                <span className="font-mono font-bold tabular-nums text-amber-400">
                  {todayMinutes} / {dailyGoalMinutes} MINUTES
                </span>
              </div>
            </motion.div>

            {/* 5. SHARE STREAK & CONTINUE LEARNING CTA BUTTONS (1600–2000ms) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: showDetailsAndButton ? 1 : 0,
                y: showDetailsAndButton ? 0 : 12,
              }}
              transition={{ duration: 0.3 }}
              className="w-full mt-6 z-10 flex flex-col sm:flex-row items-center gap-3"
            >
              <button
                type="button"
                onClick={handleShareStreak}
                className="w-full sm:w-auto sm:flex-1 py-3.5 sm:py-4 px-5 rounded-2xl font-black text-xs sm:text-sm tracking-wide uppercase bg-white/10 hover:bg-white/15 border border-amber-400/40 text-amber-300 hover:text-amber-200 active:scale-98 transition-all duration-150 cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>SHARE STREAK</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto sm:flex-[1.35] py-3.5 sm:py-4 px-6 rounded-2xl font-black text-xs sm:text-sm tracking-wide uppercase bg-gradient-to-r from-[#FF9800] via-[#FF6D00] to-[#F4511E] hover:from-[#FFA726] hover:to-[#FF7043] active:scale-98 text-white transition-all duration-150 cursor-pointer shadow-[0_10px_28px_rgba(255,109,0,0.4)] flex items-center justify-center gap-2"
              >
                <span>CONTINUE LEARNING</span>
              </button>
            </motion.div>
          </div>

          {/* FOOTER */}
          <div className="w-full max-w-md text-center shrink-0 z-10">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              StudyWeb Streaks • Consistent Daily Learning
            </p>
          </div>

          <ShareContentModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            type="streak"
            streakCount={streakCount}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
