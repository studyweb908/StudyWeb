// Authentic Streak Audio Player & Real-Time Audio Clock
// Uses the uploaded video's audio track (/assets/aistudio/screen-20261031-071332-1793410917614_2_a4c966b1.mp4)
// and exposes a high-precision playback clock so visual phases lock frame-for-frame to the audio beats.

const STREAK_VIDEO_AUDIO_URL = '/assets/aistudio/screen-20261031-071332-1793410917614_2_a4c966b1.mp4';

let activeStreakAudio: HTMLAudioElement | null = null;
let sharedAudioCtx: AudioContext | null = null;
let cachedStreakBuffer: AudioBuffer | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
let bufferStartCtxTime: number | null = null;
let fallbackStartPerfTime: number | null = null;
let isAudioClockRunning = false;
let isDecodingBuffer = false;

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
 * - Prioritizes the live Web Audio hardware clock or HTMLAudioElement.currentTime
 *   so visual transitions never drift from the sound effect.
 * - Falls back to monotonic performance.now() only if browser autoplay policies block audio.
 */
export function getStreakAudioElapsedSeconds(): number {
  if (!isAudioClockRunning) return 0;

  // 1. Web Audio API hardware clock (sample-accurate)
  if (activeBufferSource && sharedAudioCtx && bufferStartCtxTime !== null) {
    const elapsed = sharedAudioCtx.currentTime - bufferStartCtxTime;
    if (elapsed >= 0) {
      return elapsed;
    }
  }

  // 2. HTMLAudioElement playback clock
  if (activeStreakAudio && !activeStreakAudio.paused && activeStreakAudio.currentTime > 0) {
    return activeStreakAudio.currentTime;
  }

  // 3. Monotonic fallback clock (accounting for initial audio startup grace period)
  if (fallbackStartPerfTime !== null) {
    const wallElapsed = (performance.now() - fallbackStartPerfTime) / 1000;
    // Wait up to 180ms for HTMLAudioElement to begin before advancing fallback clock
    if (activeStreakAudio && activeStreakAudio.readyState < 2 && wallElapsed < 0.18) {
      return 0;
    }
    return Math.max(0, wallElapsed);
  }

  return 0;
}

/**
 * Plays the exact audio track from the user's uploaded streak video
 * (/assets/aistudio/screen-20261031-071332-1793410917614_2_a4c966b1.mp4)
 * and starts the synchronized playback clock.
 */
export function playStreakVideoAudio(): void {
  if (typeof window === 'undefined') return;
  stopStreakVideoAudio();

  isAudioClockRunning = true;
  fallbackStartPerfTime = performance.now();

  // If we already decoded the Web Audio buffer, use it first for 0ms instant start & sample-accurate clock
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

  // Otherwise use HTMLAudioElement and reset fallbackStartPerfTime on 'playing' event so clock locks to audio start
  try {
    const audio = new Audio(STREAK_VIDEO_AUDIO_URL);
    audio.preload = 'auto';
    audio.volume = 1.0;
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
        playDecodedBufferFallback();
      });
    }
    return;
  } catch {
    playDecodedBufferFallback();
  }
}

function playDecodedBufferFallback(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (cachedStreakBuffer) {
    try {
      const source = ctx.createBufferSource();
      source.buffer = cachedStreakBuffer;
      source.connect(ctx.destination);
      bufferStartCtxTime = ctx.currentTime;
      fallbackStartPerfTime = performance.now();
      source.start(0);
      activeBufferSource = source;
    } catch {}
  } else {
    preloadStreakVideoAudio();
  }
}

/**
 * Synthetic beep removed per user request so only the authentic uploaded video audio
 * is used on the Streak screen.
 */
export function playGlassPopSound(): void {
  // Intentionally no-op: synthetic beep disabled everywhere
}

if (typeof window !== 'undefined') {
  (window as any).playStudyWebPopSound = playGlassPopSound;
  setTimeout(() => {
    preloadStreakVideoAudio();
  }, 800);
}
