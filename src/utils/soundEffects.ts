// Web Audio API synthesizer for a clean Apple-style glass pop completion sound

let sharedAudioCtx: AudioContext | null = null;
let lastPlayedTimestamp = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
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
 * Plays a single, clean Apple-style glass pop sound for completed tasks
 * (file upload complete, AI Tutor reply ready, profile/workspace saved, item deleted).
 * Includes a 180ms debounce guard so simultaneous events never double-fire.
 */
export function playGlassPopSound(): void {
  if (typeof window === 'undefined') return;
  const nowMs = Date.now();
  if (nowMs - lastPlayedTimestamp < 180) {
    return;
  }
  lastPlayedTimestamp = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primary resonant glass sine pop (pitch envelope: 587.33 Hz D5 -> 880 Hz A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.085);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.012);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Subtle crystalline harmonic overtone (triangle wave an octave higher)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.01);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.09);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.018);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.115);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.14);

    osc2.start(now + 0.008);
    osc2.stop(now + 0.125);
  } catch {
    // Ignore audio context restrictions if user has not interacted yet
  }
}

if (typeof window !== 'undefined') {
  (window as any).playStudyWebPopSound = playGlassPopSound;
}
