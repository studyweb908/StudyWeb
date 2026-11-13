export type VoiceProfileGender = 'male' | 'female';
export type GeminiPrebuiltVoice = 'Charon' | 'Zephyr' | 'Kore' | 'Puck' | 'Fenrir';

export interface TtsCacheEntry {
  audioBase64: string;
  mimeType: string;
}

const ttsAudioCache = new Map<string, TtsCacheEntry>();
const MAX_TTS_CACHE_ITEMS = 24;

export function getStoredVoiceProfileGender(): VoiceProfileGender {
  try {
    const saved = localStorage.getItem('study_tutor_voice_profile');
    if (saved === 'female') return 'female';
  } catch {}
  return 'male';
}

export function resolveGeminiVoiceForProfile(profile?: string): GeminiPrebuiltVoice {
  const normalized = (profile || getStoredVoiceProfileGender()).toLowerCase();
  if (normalized === 'female' || normalized === 'kore' || normalized === 'zephyr') {
    return normalized === 'kore' ? 'Kore' : 'Zephyr';
  }
  return 'Charon';
}

/**
 * Converts markdown, citations, code fences, and common math symbols into natural spoken phrasing
 * so TTS audio reads smoothly like a real human tutor instead of spelling out punctuation.
 */
export function prepareTextForNaturalSpeech(raw: string, maxChars = 1800): string {
  if (!raw) return '';

  let cleaned = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[Source:[^\]]+\]/gi, '')
    .replace(/\[\d+:\d+\]/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^[-*•]\s+/gm, '')
    // Convert LaTeX/math notations into natural spoken phrasing
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\times/g, ' times ')
    .replace(/\\div/g, ' divided by ')
    .replace(/\\cdot/g, ' times ')
    .replace(/\\pm/g, ' plus or minus ')
    .replace(/\\approx/g, ' is approximately ')
    .replace(/\\neq/g, ' is not equal to ')
    .replace(/\\leq/g, ' is less than or equal to ')
    .replace(/\\geq/g, ' is greater than or equal to ')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/(\w)\^2\b/g, '$1 squared')
    .replace(/(\w)\^3\b/g, '$1 cubed')
    .replace(/\s*×\s*/g, ' times ')
    .replace(/\s*÷\s*/g, ' divided by ')
    .replace(/\s*≈\s*/g, ' is approximately ')
    .replace(/\s*≠\s*/g, ' is not equal to ')
    .replace(/\s*≤\s*/g, ' is less than or equal to ')
    .replace(/\s*≥\s*/g, ' is greater than or equal to ')
    .replace(/(\d)\s*=\s*(\d|[A-Za-z])/g, '$1 equals $2')
    .replace(/(\d+)%/g, '$1 percent')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (cleaned.length > maxChars) {
    const truncated = cleaned.slice(0, maxChars);
    const lastSentenceBreak = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('? '),
      truncated.lastIndexOf('! ')
    );
    cleaned = lastSentenceBreak > maxChars * 0.5
      ? truncated.slice(0, lastSentenceBreak + 1).trim()
      : truncated.trim();
  }

  return cleaned;
}

export async function fetchNaturalTtsAudio(options: {
  text: string;
  voiceName?: string;
  persona?: string;
  language?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<TtsCacheEntry | null> {
  const cleanText = prepareTextForNaturalSpeech(options.text);
  if (!cleanText) return null;

  const voiceName = options.voiceName || resolveGeminiVoiceForProfile();
  const persona = options.persona || 'socratic';
  const language = options.language || '';
  const cacheKey = `${voiceName}::${persona}::${language}::${cleanText}`;

  const cached = ttsAudioCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const timeoutMs = options.timeoutMs ?? 25000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const forwardAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timer);
      return null;
    }
    options.signal.addEventListener('abort', forwardAbort, { once: true });
  }

  try {
    const res = await fetch('/api/ai-tutor-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        voiceName,
        persona,
        language: language || undefined
      }),
      signal: controller.signal
    });

    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (data?.success && data?.audioBase64) {
      const entry: TtsCacheEntry = {
        audioBase64: data.audioBase64,
        mimeType: data.mimeType || 'audio/wav'
      };
      if (ttsAudioCache.size >= MAX_TTS_CACHE_ITEMS) {
        const oldestKey = ttsAudioCache.keys().next().value;
        if (oldestKey) ttsAudioCache.delete(oldestKey);
      }
      ttsAudioCache.set(cacheKey, entry);
      return entry;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    if (options.signal) {
      options.signal.removeEventListener('abort', forwardAbort);
    }
  }
}

/**
 * Picks the most natural-sounding OS/Browser voice available ONLY as an emergency fallback
 * when offline or Gemini TTS is unavailable. Keeps pitch at 1.0 to avoid synthetic distortion.
 */
export function selectBestBrowserNaturalVoice(gender: VoiceProfileGender): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return undefined;

  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = enVoices.length > 0 ? enVoices : voices;

  const isNaturalLike = (name: string) =>
    /natural|neural|online|enhanced|premium|samantha|daniel|ava|allison|alex|karen|serena|arthur|oliver|libby|ryan|aria|guy|jenny/i.test(
      name
    );

  const matchesGender = (name: string) =>
    gender === 'female'
      ? /samantha|ava|allison|karen|serena|victoria|zira|aria|jenny|libby|sonia|female/i.test(name)
      : /daniel|alex|arthur|oliver|ryan|guy|david|george|andrew|brian|male/i.test(name);

  return (
    pool.find((v) => isNaturalLike(v.name) && matchesGender(v.name)) ||
    pool.find((v) => isNaturalLike(v.name)) ||
    pool.find((v) => matchesGender(v.name)) ||
    pool.find((v) => v.localService === false) ||
    pool[0]
  );
}
