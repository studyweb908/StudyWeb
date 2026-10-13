/**
 * Audio effects synthesizer using native Web Audio API.
 * Synthesizes a high-dopamine, playful popping sound accompanied by
 * a sparkling celebratory harmonic chime with zero external audio assets.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    return sharedAudioCtx;
  } catch (e) {
    console.debug('Web Audio not available:', e);
    return null;
  }
}

/**
 * Ensures audio context is running, auto-resuming on user interaction if needed.
 */
export function warmUpAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

let lastPlayTime = 0;

/**
 * Play a high-dopamine, satisfying popping sound with warm harmonic resonance
 */
export function playDopaminePopSound(): void {
  try {
    const currentTime = Date.now();
    if (currentTime - lastPlayTime < 250) {
      return;
    }
    lastPlayTime = currentTime;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master volume node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.38, now);
    masterGain.connect(ctx.destination);

    // ========================================================
    // 1. SUB-BASS THUMP (Gives the pop a punchy physical body)
    // ========================================================
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(140, now);
    bassOsc.frequency.exponentialRampToValueAtTime(55, now + 0.08);

    bassGain.gain.setValueAtTime(0.4, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    bassOsc.connect(bassGain);
    bassGain.connect(masterGain);
    bassOsc.start(now);
    bassOsc.stop(now + 0.1);

    // ========================================================
    // 2. PRIMARY POP (Crisp, succulent bubble pop)
    // ========================================================
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(320, now);
    popOsc.frequency.exponentialRampToValueAtTime(1250, now + 0.035);
    popOsc.frequency.exponentialRampToValueAtTime(280, now + 0.11);

    popGain.gain.setValueAtTime(0.7, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    popOsc.connect(popGain);
    popGain.connect(masterGain);
    popOsc.start(now);
    popOsc.stop(now + 0.15);

    // ========================================================
    // 3. SECONDARY BUBBLE POP (Playful double-pop "bloop-POP!")
    // ========================================================
    const t2 = now + 0.055;
    const pop2Osc = ctx.createOscillator();
    const pop2Gain = ctx.createGain();
    pop2Osc.type = 'sine';
    pop2Osc.frequency.setValueAtTime(560, t2);
    pop2Osc.frequency.exponentialRampToValueAtTime(1800, t2 + 0.03);
    pop2Osc.frequency.exponentialRampToValueAtTime(450, t2 + 0.09);

    pop2Gain.gain.setValueAtTime(0.6, t2);
    pop2Gain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.12);

    pop2Osc.connect(pop2Gain);
    pop2Gain.connect(masterGain);
    pop2Osc.start(t2);
    pop2Osc.stop(t2 + 0.14);

    // ========================================================
    // 4. CELEBRATORY DOPAMINE CHIME ARPEGGIO
    // (Sparkling C-Major 9th ascending cascade: G5 -> C6 -> E6 -> G6 -> C7)
    // ========================================================
    const chimeFrequencies = [
      { freq: 783.99, delay: 0.09, duration: 0.7, vol: 0.4 },  // G5
      { freq: 1046.50, delay: 0.16, duration: 0.8, vol: 0.5 }, // C6
      { freq: 1318.51, delay: 0.23, duration: 0.9, vol: 0.45 }, // E6
      { freq: 1567.98, delay: 0.31, duration: 1.1, vol: 0.4 },  // G6
      { freq: 2093.00, delay: 0.40, duration: 1.3, vol: 0.35 }  // C7 (sparkle top)
    ];

    chimeFrequencies.forEach(({ freq, delay, duration, vol }) => {
      const noteStart = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(vol, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(noteStart);
      osc.stop(noteStart + duration + 0.05);
    });

    // Mobile haptic vibration burst (if supported)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([20, 35, 45]);
      } catch {}
    }
  } catch (err) {
    console.debug('Could not play dopamine pop sound:', err);
  }
}
