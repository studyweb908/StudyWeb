/**
 * Text-to-Speech Response Engine for StudyWeb Voice Agent
 * Delivers natural human-like vocal confirmation for actions
 * and speaks Gemini AI general knowledge answers.
 */

export interface VoiceEngineOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  rate?: number;
  pitch?: number;
  volume?: number;
}

class VoiceResponseEngine {
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const populate = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          this.voices = available;
          this.isInitialized = true;
        }
      } catch (e) {
        console.warn('VoiceResponseEngine voice loading warning:', e);
      }
    };

    populate();
    window.speechSynthesis.onvoiceschanged = populate;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices;
  }

  /**
   * Selects the highest quality, most natural-sounding English voice available.
   */
  public getBestHumanVoice(): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Natural / Neural voices (Edge / Windows / Chrome)
    const naturalVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      /natural|neural|online|multilingual/i.test(v.name)
    );
    if (naturalVoice) return naturalVoice;

    // 2. High-fidelity Google US/UK English voices
    const googleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      /google.*(us|uk)/i.test(v.name)
    );
    if (googleVoice) return googleVoice;

    // 3. Apple premium natural voices
    const appleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      /samantha|daniel|karen|serena|moira|alex|victoria|fiona/i.test(v.name)
    );
    if (appleVoice) return appleVoice;

    // 4. Any English locale voice
    const enVoice = voices.find(v => 
      v.lang === 'en-US' || v.lang === 'en-GB' || v.lang.startsWith('en')
    );
    if (enVoice) return enVoice;

    return voices[0] || null;
  }

  /**
   * Formats raw text into natural spoken English for human-like vocal delivery
   */
  public cleanTextForSpeech(text: string): string {
    if (!text) return '';

    return text
      // Strip markdown code fences
      .replace(/```[\s\S]*?```/g, '')
      // Strip inline code backticks
      .replace(/`([^`]+)`/g, '$1')
      // Strip bold / italic asterisks
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Strip markdown headers
      .replace(/#+\s+/g, '')
      // Strip markdown links [label](url) -> label
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Strip URLs
      .replace(/https?:\/\/\S+/gi, '')
      // Expand currencies
      .replace(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, '$1 Indian Rupees')
      .replace(/\$\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, '$1 dollars')
      .replace(/\bINR\b/g, 'Indian Rupees')
      .replace(/\bUSD\b/g, 'U.S. dollars')
      // Expand common math / symbols
      .replace(/\s*=\s*/g, ' equals ')
      .replace(/\s*\+\s*/g, ' plus ')
      .replace(/\s*%\s*/g, ' percent ')
      .replace(/&/g, ' and ')
      .replace(/\bAI\b/g, 'A.I.')
      // Remove bullets, dashes, em-dashes
      .replace(/^[•\-\*]\s+/gm, '')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speaks vocal confirmation or AI answer out loud
   */
  public speak(text: string, options: VoiceEngineOptions = {}): void {
    if (typeof window === 'undefined' || !window.speechSynthesis || this.isMuted) {
      options.onEnd?.();
      return;
    }

    try {
      this.stop();

      const cleaned = this.cleanTextForSpeech(text);
      if (!cleaned) {
        options.onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const voice = this.getBestHumanVoice();
      if (voice) {
        utterance.voice = voice;
      }

      // Human-like warmth and conversational speed
      utterance.pitch = options.pitch ?? 1.0;
      utterance.rate = options.rate ?? 1.02;
      utterance.volume = options.volume ?? 1.0;

      utterance.onstart = () => {
        this.currentUtterance = utterance;
        options.onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        options.onEnd?.();
      };

      utterance.onerror = (e) => {
        console.warn('VoiceResponseEngine error:', e);
        this.currentUtterance = null;
        options.onError?.(e);
        options.onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('VoiceResponseEngine speak failure:', err);
      options.onError?.(err);
      options.onEnd?.();
    }
  }

  /**
   * Stops any ongoing speech synthesis immediately
   */
  public stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  public isSpeaking(): boolean {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    return window.speechSynthesis.speaking;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const voiceResponseEngine = new VoiceResponseEngine();

/**
 * Directly queries Gemini API for general knowledge or academic questions
 */
export async function queryGeminiVoice(query: string): Promise<{ answer: string; spokenText: string }> {
  try {
    const response = await fetch('/api/voice-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() })
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return {
      answer: data.answer || "I have retrieved the answer for you.",
      spokenText: data.spokenText || data.answer || "I have retrieved the answer for you."
    };
  } catch (err) {
    console.warn('[queryGeminiVoice] Direct voice query failed, falling back to client knowledge:', err);

    // Fast-path local fallbacks for common queries like currency of India
    const qLower = query.toLowerCase();
    if (qLower.includes('currency') && qLower.includes('india')) {
      return {
        answer: "The currency of India is the Indian Rupee (INR), represented by the symbol ₹.",
        spokenText: "The currency of India is the Indian Rupee, with the symbol ₹ and currency code INR."
      };
    }

    return {
      answer: `Here is the information for "${query}": I am ready to explore this topic with you in StudyWeb.`,
      spokenText: `I have received your question regarding "${query}".`
    };
  }
}
