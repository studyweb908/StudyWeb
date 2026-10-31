import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Check, RotateCcw, Share2, X, Flame } from 'lucide-react';
import { StudyTrackerService } from '../../services/StudyTrackerService';
import { readSyncProfileSnapshot, fetchAndReconcileSupabaseProfile } from '../../utils/profileStorage';
import {
  playStreakVideoAudio,
  stopStreakVideoAudio,
  getStreakAudioElapsedSeconds,
  playGlassPopSound,
} from '../../utils/soundEffects';

// Synchronized audio-reactive phases locked to the celebratory audio track
type AnimationPhase = 'igniting' | 'flare' | 'settled';

const CELEBRATION_CONFETTI_PARTICLES = [
  { angle: -162, dist: 120, color: '#00E676', w: 8, h: 4, round: false },
  { angle: -142, dist: 98, color: '#FFD600', w: 6, h: 6, round: true },
  { angle: -125, dist: 130, color: '#00C853', w: 10, h: 4, round: false },
  { angle: -48, dist: 114, color: '#FF9100', w: 8, h: 4, round: false },
  { angle: -28, dist: 128, color: '#00E676', w: 9, h: 4, round: false },
  { angle: -12, dist: 106, color: '#FFD600', w: 7, h: 7, round: true },
  { angle: 12, dist: 124, color: '#00E676', w: 10, h: 4, round: false },
  { angle: 28, dist: 100, color: '#FF3D00', w: 6, h: 6, round: true },
  { angle: 152, dist: 114, color: '#FF9100', w: 9, h: 4, round: false },
  { angle: 168, dist: 128, color: '#FFD600', w: 8, h: 4, round: false },
  { angle: -175, dist: 104, color: '#00C853', w: 6, h: 6, round: true },
];

const TODAY_CHECK_BURST_PARTICLES = [
  { angle: -135, dist: 36, color: '#00E676', w: 7, h: 4 },
  { angle: -95, dist: 40, color: '#FFD600', w: 6, h: 6 },
  { angle: -45, dist: 38, color: '#00C853', w: 8, h: 4 },
  { angle: -10, dist: 34, color: '#FF9100', w: 6, h: 4 },
  { angle: 35, dist: 36, color: '#00E676', w: 7, h: 4 },
  { angle: 80, dist: 32, color: '#FFD600', w: 5, h: 5 },
  { angle: 130, dist: 36, color: '#00C853', w: 7, h: 4 },
  { angle: 170, dist: 34, color: '#FF9100', w: 6, h: 4 },
];

export const StreakCelebrationModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<AnimationPhase>('igniting');
  const [replaySeed, setReplaySeed] = useState(0);
  const [streakCount, setStreakCount] = useState<number>(1);
  const [displayCount, setDisplayCount] = useState<number>(1);
  const [activeToday, setActiveToday] = useState<boolean>(false);
  const [todayMinutes, setTodayMinutes] = useState<number>(0);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(45);
  const [firstName, setFirstName] = useState<string>('STUDENT');
  const [weeklyDays, setWeeklyDays] = useState<
    Array<{
      label: string;
      dateStr: string;
      dayNumber: number;
      completed: boolean;
      isToday: boolean;
      isFuture: boolean;
    }>
  >([]);

  const rafRef = useRef<number | null>(null);

  const loadSnapshot = useCallback((customStreak?: number) => {
    const stats = StudyTrackerService.getFormattedStats();
    const resolvedStreak = typeof customStreak === 'number' ? customStreak : stats.currentStreak;
    setStreakCount(resolvedStreak);
    setDisplayCount(resolvedStreak);
    setActiveToday(stats.activeToday);
    setTodayMinutes(stats.todayMinutes);
    setDailyGoalMinutes(stats.dailyGoalMinutes);
    setWeeklyDays(StudyTrackerService.getWeeklyStreakDays());

    const snap = readSyncProfileSnapshot();
    const rawName = (snap.fullName || snap.email?.split('@')[0] || 'Student').trim();
    const first = rawName.split(/\s+/)[0] || 'Student';
    setFirstName(first.toUpperCase());

    fetchAndReconcileSupabaseProfile()
      .then(({ profile }) => {
        const name = (profile.fullName || profile.email?.split('@')[0] || 'Student').trim();
        const f = name.split(/\s+/)[0] || 'Student';
        setFirstName(f.toUpperCase());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleCompleted = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      loadSnapshot(detail?.streak);
      setPhase('igniting');
      setReplaySeed((s) => s + 1);
      setIsOpen(true);
    };

    const handleOpenManual = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      loadSnapshot(detail?.streak);
      setPhase('igniting');
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

  // Synchronize audio clock with visual phases
  useEffect(() => {
    if (!isOpen) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      stopStreakVideoAudio();
      return;
    }

    setPhase('igniting');
    playStreakVideoAudio();

    let currentPhaseLocal: AnimationPhase = 'igniting';

    const syncFrameToAudioClock = () => {
      const t = getStreakAudioElapsedSeconds();

      let nextPhase: AnimationPhase = 'igniting';
      if (t >= 2.5) {
        nextPhase = 'settled';
      } else if (t >= 1.2) {
        nextPhase = 'flare';
      } else {
        nextPhase = 'igniting';
      }

      if (nextPhase !== currentPhaseLocal) {
        currentPhaseLocal = nextPhase;
        setPhase(nextPhase);
      }

      if (currentPhaseLocal !== 'settled') {
        rafRef.current = requestAnimationFrame(syncFrameToAudioClock);
      }
    };

    rafRef.current = requestAnimationFrame(syncFrameToAudioClock);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      stopStreakVideoAudio();
    };
  }, [isOpen, replaySeed]);

  if (typeof document === 'undefined') return null;

  // Find range of completed days for the continuous green pill highlight
  const firstCompletedIdx = weeklyDays.findIndex((d) => d.completed);
  const lastCompletedIdx = weeklyDays.reduce((acc, d, idx) => (d.completed ? idx : acc), -1);
  const todayIdx = weeklyDays.findIndex((d) => d.isToday);

  const handleClose = () => {
    stopStreakVideoAudio();
    setIsOpen(false);
  };

  const handleReplay = () => {
    setReplaySeed((s) => s + 1);
  };

  const handleCheckInAction = () => {
    if (!activeToday) {
      // User checks in today!
      const res = StudyTrackerService.checkInToday();
      setStreakCount(res.streak);
      setDisplayCount(res.streak);
      setActiveToday(true);
      setWeeklyDays(StudyTrackerService.getWeeklyStreakDays());
      playGlassPopSound();
    } else {
      // Already checked in today, close modal smoothly
      handleClose();
    }
  };

  const handleShareStreak = async () => {
    const shareText = `🔥 I'm on a ${streakCount}-day study streak on StudyWeb! Keep the fire alive!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'StudyWeb Streak', text: shareText });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareText);
      (window as any).showToast?.('Streak copied to clipboard!', 'success');
    } catch {}
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[99999] w-screen h-screen bg-[#0C120F] text-white flex flex-col items-center justify-between px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto select-none"
          role="dialog"
          aria-modal="true"
          aria-label="Daily Streak Check-in"
        >
          {/* TOP NAV BAR */}
          <div className="w-full max-w-md flex items-center justify-between z-30 shrink-0">
            {/* Top-Left StudyWeb Pure Logo (Zero outer blur / Zero white circle) */}
            <div className="flex items-center gap-2">
              <img
                src="/logo-inner.png"
                alt="StudyWeb"
                className="w-7 h-7 object-contain select-none shrink-0"
              />
              <span className="text-sm font-extrabold tracking-tight text-white/90">StudyWeb</span>
            </div>

            {/* Top-Right Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReplay}
                aria-label="Replay celebration audio"
                title="Replay celebration audio"
                className="p-2.5 rounded-full bg-[#16211B] hover:bg-[#1E2E25] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShareStreak}
                aria-label="Share streak"
                title="Share your streak"
                className="p-2.5 rounded-full bg-[#16211B] hover:bg-[#1E2E25] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close streak modal"
                className="p-2.5 rounded-full bg-[#16211B] hover:bg-[#1E2E25] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MAIN STREAK HERO CARD */}
          <div className="relative w-full max-w-sm sm:max-w-md flex-1 flex flex-col items-center justify-center my-auto py-4">
            {/* Deep Emerald Green Ambient Radial Glow behind Flame */}
            <div
              className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-[340px] sm:w-[420px] h-[340px] sm:h-[420px] rounded-full blur-3xl opacity-80"
              style={{
                background:
                  'radial-gradient(circle, rgba(0, 200, 83, 0.28) 0%, rgba(5, 120, 50, 0.16) 42%, transparent 72%)',
              }}
            />

            {/* 1. ANIMATED FIRE FLAME */}
            <div className="relative flex flex-col items-center justify-center mb-6 z-10">
              <motion.div
                animate={{
                  scale: phase === 'flare' ? [1, 1.14, 1.05] : [1, 1.05, 1],
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative flex items-center justify-center"
              >
                {/* Glowing drop shadow behind flame */}
                <div className="absolute inset-0 rounded-full blur-xl bg-orange-500/35 scale-125" />

                {/* Vector SVG Flame with vivid gradient core */}
                <svg
                  width="110"
                  height="124"
                  viewBox="0 0 120 136"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="relative z-10 drop-shadow-[0_4px_24px_rgba(255,109,0,0.55)]"
                >
                  <defs>
                    <linearGradient id="streakFlameOuter" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="#FF9800" />
                      <stop offset="35%" stopColor="#FF6D00" />
                      <stop offset="70%" stopColor="#FC630D" />
                      <stop offset="100%" stopColor="#F44336" />
                    </linearGradient>
                    <radialGradient id="streakFlameInner" cx="50%" cy="65%" r="45%">
                      <stop offset="0%" stopColor="#FFF9C4" />
                      <stop offset="50%" stopColor="#FFE082" />
                      <stop offset="100%" stopColor="#FFA000" />
                    </radialGradient>
                  </defs>

                  {/* Outer Fiery Silhouette */}
                  <path
                    d="M60 4C60 4 88 38 88 78C88 102 75 120 60 120C45 120 32 102 32 78C32 58 46 42 53 30C52 42 58 50 58 50C55 34 60 4 60 4Z"
                    fill="url(#streakFlameOuter)"
                  />
                  {/* Mid Warm Amber Petals */}
                  <path
                    d="M60 34C60 34 80 58 80 84C80 102 71 114 60 114C49 114 40 102 40 84C40 68 50 56 55 46C54 54 59 60 59 60C57 48 60 34 60 34Z"
                    fill="#FFB300"
                  />
                  {/* Inner Glowing White/Yellow Seed */}
                  <path
                    d="M60 64C60 64 72 80 72 96C72 106 66 112 60 112C54 112 48 106 48 96C48 84 54 74 57 68C56 72 60 76 60 76C59 70 60 64 60 64Z"
                    fill="url(#streakFlameInner)"
                  />
                </svg>

                {/* Floating Fiery Sparkles */}
                <motion.div
                  animate={{ y: [-2, -18, -2], opacity: [0, 1, 0], scale: [0.6, 1, 0.4] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute -top-1 right-3 w-2 h-2 rounded-full bg-amber-300 blur-[0.5px]"
                />
                <motion.div
                  animate={{ y: [0, -16, 0], opacity: [0, 0.9, 0], scale: [0.5, 0.9, 0.3] }}
                  transition={{ duration: 2.1, repeat: Infinity, delay: 0.7, ease: 'easeOut' }}
                  className="absolute -top-3 left-4 w-1.5 h-1.5 rounded-full bg-yellow-200 blur-[0.5px]"
                />
              </motion.div>

              {/* Real Streak Count Pill */}
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18231C] border border-[#23402C] text-xs font-black tracking-wide text-emerald-300">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>
                  {streakCount} {streakCount === 1 ? 'DAY' : 'DAYS'} STREAK
                </span>
              </div>
            </div>

            {/* 2. EMERALD GREEN HEADLINE (Matches uploaded design) */}
            <div className="text-center mb-6 z-10 px-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#00C853] tracking-tight leading-[1.18]">
                {activeToday ? (
                  <>
                    Keep the fire alive<br />
                    streak active today!
                  </>
                ) : (
                  <>
                    Keep the fire alive<br />
                    check in today!
                  </>
                )}
              </h2>
            </div>

            {/* 3. WEEKLY STREAK CARD (Remade with user's live data!) */}
            <div className="relative w-full bg-[#181113] border border-[#2B1B1F] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-10">
              {/* Confetti Particle Burst on Flare or Check-in */}
              <AnimatePresence>
                {phase === 'flare' && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
                    {CELEBRATION_CONFETTI_PARTICLES.map((p, i) => {
                      const rad = (p.angle * Math.PI) / 180;
                      const tx = Math.cos(rad) * p.dist;
                      const ty = Math.sin(rad) * p.dist;
                      return (
                        <motion.span
                          key={i}
                          initial={{ x: tx * 0.2, y: ty * 0.2, scale: 0.4, opacity: 1 }}
                          animate={{
                            x: tx,
                            y: ty,
                            scale: 1,
                            opacity: [1, 1, 0],
                            rotate: p.angle * 1.5,
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.75, ease: 'easeOut' }}
                          style={{
                            width: p.w,
                            height: p.h,
                            backgroundColor: p.color,
                          }}
                          className={`absolute ${p.round ? 'rounded-full' : 'rounded-xs'}`}
                        />
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>

              {/* Day of Week Row: M T W T F S S */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 text-center">
                {weeklyDays.map((d, i) => (
                  <span
                    key={`header-${i}-${d.dateStr}`}
                    className="text-xs sm:text-sm font-extrabold text-white/90 tracking-wide"
                  >
                    {d.label}
                  </span>
                ))}
              </div>

              {/* Day Circles with Continuous Green Pill Track */}
              <div className="relative grid grid-cols-7 gap-1 sm:gap-2 items-center py-1">
                {/* Continuous connected green pill track between first and last completed day */}
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
                    className="absolute h-9 sm:h-10 rounded-full bg-[#1E6B27] border border-[#2EA037]/70 z-0 shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  />
                )}

                {weeklyDays.map((d, idx) => {
                  const isTodayCell = idx === todayIdx;

                  return (
                    <div
                      key={`circle-${d.dateStr}`}
                      className="relative z-10 flex items-center justify-center"
                    >
                      {/* Local Confetti Burst when Today is checked in */}
                      {isTodayCell && activeToday && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          {TODAY_CHECK_BURST_PARTICLES.map((p, pIdx) => {
                            const rad = (p.angle * Math.PI) / 180;
                            const tx = Math.cos(rad) * p.dist;
                            const ty = Math.sin(rad) * p.dist;
                            return (
                              <motion.span
                                key={pIdx}
                                initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                                animate={{
                                  x: tx,
                                  y: ty,
                                  scale: 1,
                                  opacity: [1, 1, 0],
                                  rotate: p.angle,
                                }}
                                transition={{ duration: 0.65, delay: 0.08, ease: 'easeOut' }}
                                style={{
                                  width: p.w,
                                  height: p.h,
                                  backgroundColor: p.color,
                                }}
                                className="absolute rounded-xs"
                              />
                            );
                          })}
                        </div>
                      )}

                      {d.completed ? (
                        /* Completed Day: Vivid Green Checkmark in Connected Track */
                        <motion.div
                          initial={{ scale: 0.6 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#2E9937] flex items-center justify-center text-white shadow-xs"
                          title={`Completed on ${d.dateStr}`}
                        >
                          <Check className="w-5 h-5 text-white stroke-[3.5]" />
                        </motion.div>
                      ) : isTodayCell ? (
                        /* Today Cell (Active Waiting for Check-in): Translucent Green Halo with Date */
                        <motion.button
                          type="button"
                          onClick={handleCheckInAction}
                          animate={{ scale: [1, 1.06, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          title="Click to check in today!"
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#183620]/90 border-2 border-[#22C55E] text-[#4ADE80] font-black text-xs sm:text-sm flex items-center justify-center ring-4 ring-[#22C55E]/20 shadow-[0_0_18px_rgba(34,197,94,0.45)] cursor-pointer"
                        >
                          {d.dayNumber}
                        </motion.button>
                      ) : (
                        /* Future / Other Day: Dark Slate Circular Badge with Date */
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#27262A] text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center"
                          title={d.dateStr}
                        >
                          {d.dayNumber}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Focus Minutes / Goal Progress Subtitle */}
            <div className="mt-3 text-center z-10">
              <p className="text-xs font-semibold text-slate-400">
                Today&apos;s Focus:{' '}
                <span className="text-[#00C853] font-bold tabular-nums">
                  {todayMinutes}m / {dailyGoalMinutes}m
                </span>
                {!activeToday && (
                  <span className="text-slate-400">
                    {' '}({Math.max(1, dailyGoalMinutes - todayMinutes)}m goal target)
                  </span>
                )}
              </p>
            </div>

            {/* 4. PROMINENT BOTTOM GREEN CTA BUTTON */}
            <div className="w-full mt-6 z-10">
              <button
                type="button"
                onClick={handleCheckInAction}
                className="w-full py-4 px-6 rounded-full font-black text-base sm:text-lg bg-[#00B341] hover:bg-[#00C84A] active:scale-98 text-white transition-all duration-150 cursor-pointer shadow-[0_8px_24px_rgba(0,179,65,0.38)] flex items-center justify-center gap-2"
              >
                {activeToday ? (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Checked in today! 🔥</span>
                  </>
                ) : (
                  <span>Check in today!</span>
                )}
              </button>
            </div>
          </div>

          {/* BOTTOM FOOTER */}
          <div className="w-full max-w-md text-center shrink-0 z-10">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              StudyWeb Daily Learning Streak • Keep up the momentum
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
