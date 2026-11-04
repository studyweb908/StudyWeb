// StudyWeb Streaks — Celebration Sound Effect & Synchronized Audio Clock
// Provides a subtle, warm, rewarding Web Audio API harmonic chime + reference track support,
// respecting user sound preferences and browser autoplay policies.

import { StudyTrackerService } from '../services/StudyTrackerService';

const STREAK_VIDEO_AUDIO_URL = '/assets/aistudio/screen-20261031-071332-1793410917614_2_a4c966b1.mp4';

let activeStreakAudio: HTMLAudioElement | null = null;
let sharedAudioCtx: AudioContext | null = null;
let cachedStreakBuffer: AudioBuffer | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
let bufferStartCtxTime: number | null = null;
let fallbackStartPerfTime: number | null = null;
let isAudioClockRunning = false;
let isDecodingBuffer = false;
let lastCelebrationChimeAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Plays a warm, subtle, non-intrusive 3-note ascending harmonic chime
 * synchronized with the flame transformation when sound is enabled.
 */
export function playRewardingStreakChime(): void {
  if (typeof window === 'undefined') return;
  if (!StudyTrackerService.getSoundEnabled()) return;

  const nowMs = Date.now();
  if (nowMs - lastCelebrationChimeAt < 600) return; // Prevent duplicate playback
  lastCelebrationChimeAt = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const startTime = ctx.currentTime + 0.05;
    // Warm major triad + octave shimmer (C5, E5, G5, C6)
    const notes = [
      { freq: 523.25, delay: 0.0, duration: 0.55, gain: 0.08 },
      { freq: 659.25, delay: 0.11, duration: 0.65, gain: 0.09 },
      { freq: 783.99, delay: 0.22, duration: 0.85, gain: 0.1 },
      { freq: 1046.5, delay: 0.34, duration: 1.15, gain: 0.085 },
    ];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, startTime + n.delay);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(n.freq * 0.5, startTime + n.delay);

      gainNode.gain.setValueAtTime(0.0001, startTime + n.delay);
      gainNode.gain.exponentialRampToValueAtTime(
        n.gain,
        startTime + n.delay + 0.035
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + n.delay + n.duration
      );

      osc.connect(gainNode);
      subOsc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime + n.delay);
      subOsc.start(startTime + n.delay);
      osc.stop(startTime + n.delay + n.duration + 0.05);
      subOsc.stop(startTime + n.delay + n.duration + 0.05);
    }
  } catch {}
}

/**
 * Preloads the uploaded video's audio track into memory for instant, zero-latency playback.
 */
export function preloadStreakVideoAudio(): void {
  if (typeof window === 'undefined') return;
  if (cachedStreakBuffer || isDecodingBuffer) return;

  isDecodingBuffer = true;
  fetch(STREAK_VIDEO_AUDIO_URL)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('Failed to fetch audio'))))
    .then((arrayBuffer) => {
      const ctx = getAudioContext();
      if (!ctx) {
        isDecodingBuffer = false;
        return null;
      }
      return ctx.decodeAudioData(arrayBuffer);
    })
    .then((decoded) => {
      if (decoded) {
        cachedStreakBuffer = decoded;
      }
      isDecodingBuffer = false;
    })
    .catch(() => {
      isDecodingBuffer = false;
    });
}

/**
 * Stops any currently playing streak celebration audio and resets the clock.
 */
export function stopStreakVideoAudio(): void {
  isAudioClockRunning = false;
  bufferStartCtxTime = null;
  fallbackStartPerfTime = null;

  if (activeBufferSource) {
    try {
      activeBufferSource.stop();
      activeBufferSource.disconnect();
    } catch {}
    activeBufferSource = null;
  }
  if (activeStreakAudio) {
    try {
      activeStreakAudio.pause();
      activeStreakAudio.currentTime = 0;
    } catch {}
    activeStreakAudio = null;
  }
}

/**
 * Returns the exact elapsed playback time in seconds of the streak audio track.
 */
export function getStreakAudioElapsedSeconds(): number {
  if (!isAudioClockRunning) return 0;

  if (activeBufferSource && sharedAudioCtx && bufferStartCtxTime !== null) {
    const elapsed = sharedAudioCtx.currentTime - bufferStartCtxTime;
    if (elapsed >= 0) {
      return elapsed;
    }
  }

  if (activeStreakAudio && !activeStreakAudio.paused && activeStreakAudio.currentTime > 0) {
    return activeStreakAudio.currentTime;
  }

  if (fallbackStartPerfTime !== null) {
    const wallElapsed = (performance.now() - fallbackStartPerfTime) / 1000;
    return Math.max(0, wallElapsed);
  }

  return 0;
}

/**
 * Plays the streak celebration sound (respecting user soundEnabled setting)
 * and starts the synchronized playback clock.
 */
export function playStreakVideoAudio(): void {
  if (typeof window === 'undefined') return;
  stopStreakVideoAudio();

  isAudioClockRunning = true;
  fallbackStartPerfTime = performance.now();

  if (!StudyTrackerService.getSoundEnabled()) {
    return;
  }

  const ctx = getAudioContext();
  if (ctx && cachedStreakBuffer && ctx.state === 'running') {
    try {
      const source = ctx.createBufferSource();
      source.buffer = cachedStreakBuffer;
      source.connect(ctx.destination);
      bufferStartCtxTime = ctx.currentTime;
      source.start(0);
      activeBufferSource = source;
      return;
    } catch {
      bufferStartCtxTime = null;
    }
  }

  try {
    const audio = new Audio(STREAK_VIDEO_AUDIO_URL);
    audio.preload = 'auto';
    audio.volume = 0.85;
    activeStreakAudio = audio;

    audio.addEventListener(
      'playing',
      () => {
        fallbackStartPerfTime = performance.now() - audio.currentTime * 1000;
      },
      { once: true }
    );

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        playRewardingStreakChime();
      });
    }
    return;
  } catch {
    playRewardingStreakChime();
  }
}

export function playGlassPopSound(): void {
  if (!StudyTrackerService.getSoundEnabled()) return;
  playRewardingStreakChime();
}

if (typeof window !== 'undefined') {
  (window as any).playStudyWebPopSound = playGlassPopSound;
  setTimeout(() => {
    preloadStreakVideoAudio();
  }, 800);
}
