import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export type AuraOrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface AuraOrbProps {
  state: AuraOrbState;
  audioLevels?: number[]; // Real-time frequency levels from useMicrophoneWaveform
  size?: number; // default 110px
  onClick?: () => void;
  className?: string;
}

export default function AuraOrb({
  state,
  audioLevels = [4, 4, 4, 4, 4],
  size = 110,
  onClick,
  className = ''
}: AuraOrbProps) {
  const prefersReducedMotion = useReducedMotion();
  const [sinePhase, setSinePhase] = useState(0);

  // Calculate normalized volume (0.0 to 1.0) from microphone levels
  const avgLevel = audioLevels.reduce((acc, curr) => acc + curr, 0) / (audioLevels.length || 1);
  const normalizedAudio = Math.min(1.0, Math.max(0, (avgLevel - 4) / 16));

  // Frame tick for harmonic speaking animation
  useEffect(() => {
    if (state !== 'speaking' || prefersReducedMotion) return;
    let animId: number;
    const animate = () => {
      setSinePhase(prev => (prev + 0.08) % (Math.PI * 2));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [state, prefersReducedMotion]);

  // Speaking pulse amplitude
  const speakingPulse = state === 'speaking' 
    ? 0.08 * Math.sin(sinePhase * 2) + 0.04 * Math.sin(sinePhase * 5)
    : 0;

  // State-specific color palettes and glow
  const getGlowStyles = () => {
    switch (state) {
      case 'listening':
        return {
          glow: 'from-cyan-400/40 via-blue-500/40 to-indigo-600/30',
          ring: 'border-cyan-400/40 shadow-cyan-500/30',
          core: 'from-cyan-300 via-blue-500 to-indigo-600'
        };
      case 'thinking':
        return {
          glow: 'from-violet-500/40 via-indigo-500/40 to-fuchsia-600/30',
          ring: 'border-violet-400/40 shadow-violet-500/30',
          core: 'from-indigo-400 via-purple-500 to-pink-500'
        };
      case 'speaking':
        return {
          glow: 'from-cyan-400/50 via-indigo-500/50 to-purple-600/40',
          ring: 'border-indigo-400/50 shadow-indigo-500/40',
          core: 'from-cyan-400 via-blue-600 to-violet-600'
        };
      case 'error':
        return {
          glow: 'from-rose-500/40 via-amber-500/30 to-rose-600/30',
          ring: 'border-rose-400/40 shadow-rose-500/30',
          core: 'from-rose-400 via-amber-500 to-rose-600'
        };
      case 'idle':
      default:
        return {
          glow: 'from-cyan-500/25 via-blue-600/25 to-violet-600/25',
          ring: 'border-cyan-500/25 shadow-blue-500/20',
          core: 'from-cyan-400 via-blue-500 to-purple-600'
        };
    }
  };

  const colors = getGlowStyles();

  return (
    <div 
      className={`relative flex items-center justify-center select-none cursor-pointer group ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`AURA Assistant Orb: Status ${state}`}
    >
      {/* 1. Outermost Ambient Atmospheric Glow */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr ${colors.glow} blur-2xl pointer-events-none transition-all duration-700`}
        animate={
          prefersReducedMotion
            ? { scale: 1, opacity: 0.5 }
            : state === 'listening'
            ? { scale: 1.1 + normalizedAudio * 0.45, opacity: 0.6 + normalizedAudio * 0.4 }
            : state === 'speaking'
            ? { scale: 1.15 + speakingPulse * 1.5, opacity: 0.7 }
            : state === 'thinking'
            ? { rotate: 360, scale: [1, 1.08, 1], opacity: 0.6 }
            : { scale: [0.95, 1.08, 0.95], opacity: [0.35, 0.55, 0.35] }
        }
        transition={
          state === 'thinking'
            ? { rotate: { duration: 6, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }
            : state === 'idle'
            ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.15 }
        }
      />

      {/* 2. Concentric Audio Reactive Ripple Rings (Listening & Speaking states) */}
      {(state === 'listening' || state === 'speaking') && !prefersReducedMotion && (
        <>
          <motion.div
            className={`absolute inset-0 rounded-full border border-dashed ${colors.ring} pointer-events-none opacity-40`}
            animate={{
              scale: state === 'listening' ? [1, 1.25 + normalizedAudio * 0.35] : [1, 1.25],
              opacity: [0.6, 0]
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeOut'
            }}
          />
          <motion.div
            className={`absolute inset-0 rounded-full border ${colors.ring} pointer-events-none opacity-30`}
            animate={{
              scale: state === 'listening' ? [1, 1.45 + normalizedAudio * 0.5] : [1, 1.45],
              opacity: [0.4, 0]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeOut',
              delay: 0.4
            }}
          />
        </>
      )}

      {/* 3. Orbiting Particles / Highlight Arc (Thinking state) */}
      {state === 'thinking' && !prefersReducedMotion && (
        <motion.div
          className="absolute inset-[-6px] rounded-full pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-300 blur-[1px] shadow-[0_0_12px_#38bdf8] absolute -top-1 left-1/2 -translate-x-1/2" />
          <div className="w-2.5 h-2.5 rounded-full bg-purple-300 blur-[1px] shadow-[0_0_10px_#c084fc] absolute -bottom-1 left-1/2 -translate-x-1/2" />
        </motion.div>
      )}

      {/* 4. Central Siri-Inspired Multi-Layered Glass Core Sphere */}
      <motion.div
        className={`relative w-4/5 h-4/5 rounded-full bg-gradient-to-br ${colors.core} p-0.5 shadow-2xl transition-all duration-300 overflow-hidden flex items-center justify-center`}
        animate={
          prefersReducedMotion
            ? {}
            : state === 'listening'
            ? { scale: 1.0 + normalizedAudio * 0.22 }
            : state === 'speaking'
            ? { scale: 1.02 + speakingPulse }
            : state === 'thinking'
            ? { scale: [0.98, 1.03, 0.98] }
            : { scale: [0.96, 1.02, 0.96] }
        }
        transition={
          state === 'idle'
            ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
            : state === 'thinking'
            ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.08 }
        }
      >
        {/* Internal Iridescent Fluid Swirl Layer */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400/80 via-indigo-600/80 to-purple-500/80 mix-blend-overlay"
          animate={
            prefersReducedMotion
              ? {}
              : { rotate: [0, 180, 360] }
          }
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner Glass Specular Reflection Highlight */}
        <div className="absolute top-1 left-2 w-2/3 h-1/2 rounded-full bg-gradient-to-b from-white/50 to-transparent blur-[1.5px] pointer-events-none" />

        {/* Center Iris Pulse Node */}
        <motion.div
          className="w-1/3 h-1/3 rounded-full bg-white/70 backdrop-blur-md shadow-[0_0_16px_rgba(255,255,255,0.9)] relative z-10"
          animate={
            prefersReducedMotion
              ? {}
              : state === 'listening'
              ? { scale: [1, 1.25 + normalizedAudio * 0.35, 1] }
              : state === 'speaking'
              ? { scale: [0.95, 1.15, 0.95], opacity: [0.75, 1, 0.75] }
              : state === 'thinking'
              ? { scale: [0.9, 1.1, 0.9] }
              : { scale: [0.95, 1.05, 0.95], opacity: [0.6, 0.85, 0.6] }
          }
          transition={{
            duration: state === 'speaking' ? 0.4 : state === 'listening' ? 0.3 : 2.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Deep Depth Gradient Rim */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.6)] pointer-events-none" />
      </motion.div>
    </div>
  );
}
