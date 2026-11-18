import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  X, 
  Send, 
  Square,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useMicrophoneWaveform } from '../hooks/useMicrophoneWaveform';
import { recordUserActivity } from '../utils/userActivity';
import { Workspace } from './Dashboard/WorkspaceTypes';
import { voiceResponseEngine } from '../services/voiceResponseEngine';
import { processAuraInput, AuraContext } from '../services/auraIntelligence';

export type AuraState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface GlobalVoiceListenerProps {
  activeTab?: string;
  setActiveTab: (tab: string) => void;
  setActiveWorkspace: (ws: any) => void;
  onToggleFocusMode?: () => void;
  onLogout?: () => void;
  onSetDarkMode?: (isDark: boolean) => void;
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
  onCreateWorkspace?: (name: string, subject?: string) => any;
  workspaces?: Workspace[];
  activeWorkspace?: Workspace | null;
}

/**
 * INTERNAL FRAMER MOTION ANIMATION ENGINE FOR AURA ORB
 * Visualizes 'idle', 'listening', 'thinking', and 'speaking' states as defined in the master plan.
 */
interface InternalOrbProps {
  state: AuraState;
  audioLevels: number[];
  onClick?: () => void;
}

function AuraAnimationEngineOrb({ state, audioLevels, onClick }: InternalOrbProps) {
  const prefersReducedMotion = useReducedMotion();
  const [sinePhase, setSinePhase] = useState(0);

  // Compute normalized real-time audio amplitude (0.0 to 1.0) from microphone levels
  const avgLevel = audioLevels.reduce((acc, curr) => acc + curr, 0) / (audioLevels.length || 1);
  const normalizedAudio = Math.min(1.0, Math.max(0, (avgLevel - 4) / 16));

  // Harmonic frame oscillator for natural speaking speech cadence
  useEffect(() => {
    if (state !== 'speaking' || prefersReducedMotion) return;
    let animId: number;
    const animate = () => {
      setSinePhase(prev => (prev + 0.09) % (Math.PI * 2));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [state, prefersReducedMotion]);

  // Speaking wave amplitude
  const speakingPulse = state === 'speaking'
    ? 0.08 * Math.sin(sinePhase * 2.2) + 0.04 * Math.sin(sinePhase * 5.5)
    : 0;

  // State-specific color palettes and glow configurations
  const themeStyles = useMemo(() => {
    switch (state) {
      case 'listening':
        return {
          glowGradient: 'from-cyan-400/40 via-blue-500/40 to-indigo-600/30',
          ringBorder: 'border-cyan-400/40 shadow-cyan-500/30',
          coreGradient: 'from-cyan-300 via-blue-500 to-indigo-600',
          irisGlow: 'shadow-[0_0_20px_rgba(34,211,238,0.9)]',
          label: 'Listening...'
        };
      case 'thinking':
        return {
          glowGradient: 'from-violet-500/40 via-indigo-500/40 to-fuchsia-600/30',
          ringBorder: 'border-violet-400/40 shadow-violet-500/30',
          coreGradient: 'from-indigo-400 via-purple-500 to-pink-500',
          irisGlow: 'shadow-[0_0_20px_rgba(192,132,252,0.9)]',
          label: 'Thinking...'
        };
      case 'speaking':
        return {
          glowGradient: 'from-cyan-400/50 via-indigo-500/50 to-purple-600/40',
          ringBorder: 'border-indigo-400/50 shadow-indigo-500/40',
          coreGradient: 'from-cyan-400 via-blue-600 to-violet-600',
          irisGlow: 'shadow-[0_0_24px_rgba(56,189,248,0.95)]',
          label: 'Speaking...'
        };
      case 'error':
        return {
          glowGradient: 'from-rose-500/40 via-amber-500/30 to-rose-600/30',
          ringBorder: 'border-rose-400/40 shadow-rose-500/30',
          coreGradient: 'from-rose-400 via-amber-500 to-rose-600',
          irisGlow: 'shadow-[0_0_16px_rgba(244,63,94,0.8)]',
          label: 'Error'
        };
      case 'idle':
      default:
        return {
          glowGradient: 'from-cyan-500/25 via-blue-600/25 to-violet-600/25',
          ringBorder: 'border-cyan-500/25 shadow-blue-500/20',
          coreGradient: 'from-cyan-400 via-blue-500 to-purple-600',
          irisGlow: 'shadow-[0_0_16px_rgba(255,255,255,0.85)]',
          label: 'Ready'
        };
    }
  }, [state]);

  return (
    <div 
      className="relative flex items-center justify-center select-none cursor-pointer group w-28 h-28 sm:w-32 sm:h-32 focus:outline-none"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`AURA Assistant Orb: Status ${themeStyles.label}`}
    >
      {/* 1. OUTBOUND ATMOSPHERIC GLOW (Framer Motion breathing & expansion) */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr ${themeStyles.glowGradient} blur-2xl pointer-events-none`}
        animate={
          prefersReducedMotion
            ? { scale: 1, opacity: 0.5 }
            : state === 'listening'
            ? { scale: 1.12 + normalizedAudio * 0.42, opacity: 0.65 + normalizedAudio * 0.35 }
            : state === 'speaking'
            ? { scale: 1.16 + speakingPulse * 1.5, opacity: 0.72 }
            : state === 'thinking'
            ? { rotate: 360, scale: [1, 1.08, 1], opacity: 0.62 }
            : { scale: [0.94, 1.07, 0.94], opacity: [0.35, 0.55, 0.35] }
        }
        transition={
          state === 'thinking'
            ? { rotate: { duration: 5, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }
            : state === 'idle'
            ? { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.12 }
        }
      />

      {/* 2. DYNAMIC CONCENTRIC RIPPLE RINGS (Listening & Speaking states) */}
      {(state === 'listening' || state === 'speaking') && !prefersReducedMotion && (
        <>
          {/* Inner ripple wave */}
          <motion.div
            className={`absolute inset-0 rounded-full border border-dashed ${themeStyles.ringBorder} pointer-events-none opacity-40`}
            animate={{
              scale: state === 'listening' ? [1, 1.28 + normalizedAudio * 0.35] : [1, 1.28],
              opacity: [0.65, 0]
            }}
            transition={{
              duration: 1.3,
              repeat: Infinity,
              ease: 'easeOut'
            }}
          />
          {/* Outer ripple wave */}
          <motion.div
            className={`absolute inset-0 rounded-full border ${themeStyles.ringBorder} pointer-events-none opacity-30`}
            animate={{
              scale: state === 'listening' ? [1, 1.48 + normalizedAudio * 0.48] : [1, 1.48],
              opacity: [0.45, 0]
            }}
            transition={{
              duration: 1.7,
              repeat: Infinity,
              ease: 'easeOut',
              delay: 0.35
            }}
          />
        </>
      )}

      {/* 3. ORBITING HIGHLIGHT PARTICLES (Thinking state) */}
      {state === 'thinking' && !prefersReducedMotion && (
        <motion.div
          className="absolute inset-[-8px] rounded-full pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        >
          {/* Primary celestial highlight */}
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-300 blur-[1px] shadow-[0_0_12px_#38bdf8] absolute -top-1 left-1/2 -translate-x-1/2" />
          {/* Secondary trailing highlight */}
          <div className="w-2.5 h-2.5 rounded-full bg-purple-300 blur-[1px] shadow-[0_0_10px_#c084fc] absolute -bottom-1 left-1/2 -translate-x-1/2" />
        </motion.div>
      )}

      {/* 4. CENTRAL SIRI-INSPIRED MULTI-LAYERED GLASS CORE SPHERE */}
      <motion.div
        className={`relative w-4/5 h-4/5 rounded-full bg-gradient-to-br ${themeStyles.coreGradient} p-0.5 shadow-2xl transition-all duration-300 overflow-hidden flex items-center justify-center`}
        animate={
          prefersReducedMotion
            ? {}
            : state === 'listening'
            ? { scale: 1.0 + normalizedAudio * 0.24 }
            : state === 'speaking'
            ? { scale: 1.03 + speakingPulse }
            : state === 'thinking'
            ? { scale: [0.97, 1.03, 0.97] }
            : { scale: [0.96, 1.03, 0.96] }
        }
        transition={
          state === 'idle'
            ? { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
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
          transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner Glass Specular Reflection Highlight */}
        <div className="absolute top-1 left-2 w-2/3 h-1/2 rounded-full bg-gradient-to-b from-white/50 to-transparent blur-[1.5px] pointer-events-none" />

        {/* Center Iris Pulse Node */}
        <motion.div
          className={`w-1/3 h-1/3 rounded-full bg-white/70 backdrop-blur-md ${themeStyles.irisGlow} relative z-10`}
          animate={
            prefersReducedMotion
              ? {}
              : state === 'listening'
              ? { scale: [1, 1.25 + normalizedAudio * 0.35, 1] }
              : state === 'speaking'
              ? { scale: [0.94, 1.16, 0.94], opacity: [0.75, 1, 0.75] }
              : state === 'thinking'
              ? { scale: [0.88, 1.12, 0.88] }
              : { scale: [0.95, 1.06, 0.95], opacity: [0.6, 0.85, 0.6] }
          }
          transition={{
            duration: state === 'speaking' ? 0.38 : state === 'listening' ? 0.28 : 2.6,
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

export default function GlobalVoiceListener({ 
  activeTab = 'dashboard',
  setActiveTab, 
  setActiveWorkspace, 
  onToggleFocusMode,
  onLogout,
  onSetDarkMode,
  onToggleTheme,
  isDarkMode,
  onCreateWorkspace,
  workspaces = [],
  activeWorkspace = null
}: GlobalVoiceListenerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentTranscript, setCurrentTranscript] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [textInput, setTextInput] = useState('');
  const [displayResponse, setDisplayResponse] = useState<string>(
    "👋 Hello! I am **AURA**, your adaptive voice assistant for StudyWeb.\n\nAsk me to navigate, create a study workspace, turn on dark mode, or answer any study question."
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Short-term conversational context
  const conversationContextRef = useRef<AuraContext>({
    activeTab,
    activeWorkspace,
    workspaces,
    recentQueries: []
  });

  const recognitionRef = useRef<any>(null);
  const lastProcessedTimeRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Real-time microphone audio waveform levels
  const waveformLevels = useMicrophoneWaveform(isListening && !isSpeaking);

  // Synchronize context props
  useEffect(() => {
    conversationContextRef.current.activeTab = activeTab;
    conversationContextRef.current.activeWorkspace = activeWorkspace;
    conversationContextRef.current.workspaces = workspaces;
  }, [activeTab, activeWorkspace, workspaces]);

  // Determine current Aura animation state
  const orbState: AuraState = hasError
    ? 'error'
    : isSpeaking
    ? 'speaking'
    : isThinking
    ? 'thinking'
    : isListening
    ? 'listening'
    : 'idle';

  // Interrupt ongoing speech synthesis immediately
  const interruptSpeaking = () => {
    voiceResponseEngine.stop();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  };

  // Human-like vocal delivery via the TTS response engine
  const speakVocalResponse = (spokenText: string) => {
    if (isMuted) return;

    interruptSpeaking();

    voiceResponseEngine.speak(spokenText, {
      onStart: () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        // Temporarily pause recognition so microphone doesn't capture computer speaker audio
        if (recognitionRef.current && isListening) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }
      },
      onEnd: () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        // Auto-resume microphone listening if user left it active
        if (isListening && recognitionRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current) {
              try {
                recognitionRef.current.start();
              } catch {}
            }
          }, 300);
        }
      },
      onError: () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
    });
  };

  // Web Speech Recognition Setup
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        if (isSpeakingRef.current) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const spoken = (final || interim).trim();
        if (spoken) {
          setCurrentTranscript(spoken);
          if (final && final.trim()) {
            handleUserUtterance(final.trim());
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setHasError(true);
          setErrorMessage("Microphone permission was denied. You can still type your questions or commands below.");
          setIsListening(false);
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[AURA Voice Recognition]:', event.error);
        }
      };

      recognition.onend = () => {
        if (isListening && !isSpeakingRef.current) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };
    } catch (err) {
      console.warn("Failed to initialize SpeechRecognition:", err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      interruptSpeaking();
    };
  }, [isListening]);

  // Master handler for spoken and typed utterances
  const handleUserUtterance = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Debounce duplicate queries within 1.2 seconds
    const now = Date.now();
    if (now - lastProcessedTimeRef.current < 1200) return;
    lastProcessedTimeRef.current = now;

    // Interrupt any ongoing speech immediately
    interruptSpeaking();

    // Visual updates
    setIsOpen(true);
    setUserQuery(trimmed);
    setCurrentTranscript('');
    setIsThinking(true);
    setHasError(false);
    setErrorMessage(null);

    // Update conversation context history
    conversationContextRef.current.recentQueries = [
      trimmed,
      ...(conversationContextRef.current.recentQueries || []).slice(0, 4)
    ];

    try {
      // Process input with AURA Intelligence Engine
      const result = await processAuraInput(trimmed, conversationContextRef.current);

      setIsThinking(false);
      setDisplayResponse(result.displayResponse);

      // Execute application action if defined
      if (result.action) {
        switch (result.action.type) {
          case 'NAVIGATE':
            if (result.action.payload) {
              if (result.action.payload === 'dashboard' || result.action.payload === 'workspaces') {
                setActiveWorkspace(null);
              }
              setActiveTab(result.action.payload);
              conversationContextRef.current.lastDestination = result.action.payload;
            }
            break;

          case 'SELECT_WORKSPACE':
            if (result.action.payload) {
              setActiveWorkspace(result.action.payload);
              setActiveTab('workspaces');
            }
            break;

          case 'CREATE_WORKSPACE':
            if (onCreateWorkspace && result.action.payload?.name) {
              const newWs = onCreateWorkspace(result.action.payload.name);
              setActiveWorkspace(newWs);
              setActiveTab('workspaces');
            }
            break;

          case 'SET_DARK_MODE':
            onSetDarkMode?.(result.action.payload ?? true);
            break;

          case 'SET_LIGHT_MODE':
            onSetDarkMode?.(result.action.payload ?? false);
            break;

          case 'TOGGLE_THEME':
            onToggleTheme?.();
            break;

          case 'TOGGLE_FOCUS_MODE':
            onToggleFocusMode?.();
            break;

          case 'CONFIRM_LOGOUT':
            onLogout?.();
            break;

          default:
            break;
        }
      }

      // If user asked an educational question, synchronize with AI Tutor chat feed
      if (result.category === 'EDUCATIONAL_QUERY') {
        window.dispatchEvent(new CustomEvent('studyweb_ask_ai_tutor', {
          detail: {
            question: trimmed,
            answer: result.displayResponse
          }
        }));

        recordUserActivity({
          title: 'AURA Voice Query',
          detail: `Asked: "${trimmed}"`,
          iconType: 'tutor'
        });
      }

      // Deliver natural spoken vocal response via TTS engine
      speakVocalResponse(result.spokenResponse);

    } catch (err: any) {
      console.error("[AURA Execution Error]:", err);
      setIsThinking(false);
      setHasError(true);
      const errReply = "I encountered a minor issue processing that. You can try again or select from the suggestions below.";
      setDisplayResponse(`⚠️ **Something went wrong**\n\n${err?.message || "Could not complete the requested voice task."}\n\nPlease try again.`);
      speakVocalResponse(errReply);
    }
  };

  // Toggle voice listening
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setHasError(true);
      setErrorMessage("Speech recognition is not supported in this browser. You can type commands below.");
      setIsOpen(true);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      interruptSpeaking();
      setIsListening(false);
    } else {
      try {
        interruptSpeaking();
        recognitionRef.current.start();
        setIsListening(true);
        setIsOpen(true);
        setHasError(false);
        setErrorMessage(null);
      } catch (e) {
        console.warn("Could not start recognition:", e);
      }
    }
  };

  // Text input submit handler
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isThinking) return;
    const msg = textInput.trim();
    setTextInput('');
    handleUserUtterance(msg);
  };

  // Keyboard shortcut listener: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        interruptSpeaking();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Clean Markdown renderer for AURA speech bubble
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed text-slate-200">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Heading or title
          if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
            const cleanTitle = trimmed.replace(/^#+\s*/, '');
            return (
              <h4 key={idx} className="font-bold text-white text-sm tracking-tight pt-0.5">
                {cleanTitle}
              </h4>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-cyan-400 mt-1 text-[10px]">●</span>
                <span className="flex-1 text-slate-300">
                  {formatInlineText(content)}
                </span>
              </div>
            );
          }

          return <p key={idx}>{formatInlineText(line)}</p>;
        })}
      </div>
    );
  };

  const formatInlineText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-cyan-300">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <>
      {/* 1. EXPANDED SIRI-INSPIRED AURA FLOATING ASSISTANT PANEL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-3 sm:p-6">
            {/* Backdrop Blur Layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOpen(false);
                interruptSpeaking();
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto cursor-pointer"
            />

            {/* Siri Glass Floating Assistant Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-[430px] bg-[#0A0F1D]/92 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-slate-100 p-5 sm:p-6 flex flex-col gap-4 pointer-events-auto overflow-hidden ring-1 ring-cyan-500/20"
            >
              {/* Dynamic Chromatic Ambient Glow in Card Background */}
              <motion.div 
                className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                animate={{
                  backgroundColor: 
                    orbState === 'thinking' ? 'rgba(168,85,247,0.18)' :
                    orbState === 'speaking' ? 'rgba(56,189,248,0.2)' :
                    orbState === 'listening' ? 'rgba(6,182,212,0.22)' :
                    orbState === 'error' ? 'rgba(244,63,94,0.18)' :
                    'rgba(6,182,212,0.12)'
                }}
                transition={{ duration: 0.6 }}
              />
              <motion.div 
                className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                animate={{
                  backgroundColor: 
                    orbState === 'thinking' ? 'rgba(217,70,239,0.18)' :
                    orbState === 'speaking' ? 'rgba(129,140,248,0.2)' :
                    orbState === 'listening' ? 'rgba(59,130,246,0.2)' :
                    orbState === 'error' ? 'rgba(245,158,11,0.15)' :
                    'rgba(147,51,234,0.12)'
                }}
                transition={{ duration: 0.6 }}
              />

              {/* Header Bar */}
              <div className="flex items-center justify-between relative z-10 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-[1px] shadow-sm shadow-cyan-500/30">
                    <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black tracking-wider text-white">AURA</h3>
                      <span className="text-[10px] text-cyan-400 font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 uppercase tracking-widest">
                        AI Voice
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Adaptive User Response Assistant</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Mute/Unmute Speech Output Toggle */}
                  <button
                    onClick={() => {
                      if (isSpeaking) interruptSpeaking();
                      const nextMute = !isMuted;
                      setIsMuted(nextMute);
                      voiceResponseEngine.setMuted(nextMute);
                    }}
                    title={isMuted ? "Unmute voice responses" : "Mute voice responses"}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label={isMuted ? "Unmute voice" : "Mute voice"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  {/* Close Assistant */}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      interruptSpeaking();
                    }}
                    title="Close AURA"
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    aria-label="Close AURA"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Central Framer Motion Animated Orb */}
              <div className="flex flex-col items-center justify-center py-2 relative z-10">
                <AuraAnimationEngineOrb
                  state={orbState}
                  audioLevels={waveformLevels}
                  onClick={() => {
                    if (isSpeaking) {
                      interruptSpeaking();
                    } else {
                      toggleListening();
                    }
                  }}
                />

                {/* State Indicator with Synchronized Soundwave Bars */}
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold backdrop-blur-md">
                    {/* Equalizer / Indicator Animation */}
                    <div className="flex items-center gap-0.5 h-3">
                      {isSpeaking ? (
                        [1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-gradient-to-t from-cyan-400 to-indigo-400 rounded-full"
                            animate={{ height: ['4px', `${Math.min(14, 4 + ((i * 3.5) % 11))}px`, '5px', '13px', '4px'] }}
                            transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        ))
                      ) : isListening ? (
                        waveformLevels.slice(0, 4).map((lvl, idx) => (
                          <motion.div
                            key={idx}
                            className="w-1 bg-gradient-to-t from-cyan-400 to-blue-500 rounded-full origin-bottom"
                            animate={{ height: `${Math.max(3, Math.min(13, lvl))}px` }}
                            transition={{ type: 'tween', duration: 0.08 }}
                          />
                        ))
                      ) : isThinking ? (
                        [1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-amber-400"
                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-cyan-400/80 animate-pulse" />
                      )}
                    </div>

                    {/* Status Label Text */}
                    {isSpeaking ? (
                      <span className="text-cyan-300 font-semibold">Speaking response...</span>
                    ) : isThinking ? (
                      <span className="text-amber-300 font-semibold">Analyzing with Gemini...</span>
                    ) : isListening ? (
                      <span className="text-cyan-300 font-semibold">Listening live...</span>
                    ) : hasError ? (
                      <span className="text-rose-400 font-semibold">Needs Attention</span>
                    ) : (
                      <span className="text-slate-400 font-medium">Tap orb or speak command</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Transcript & Conversational Dialogue Area */}
              <div className="space-y-2.5 max-h-[175px] overflow-y-auto pr-1 text-xs relative z-10 custom-scrollbar">
                {/* User transcript (spoken or typed) */}
                {(currentTranscript || userQuery) && (
                  <div className="flex items-start gap-2 bg-white/5 border border-white/5 rounded-2xl p-2.5">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                      <Mic className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">You</span>
                      <p className="text-slate-200 font-medium break-words mt-0.5">
                        {currentTranscript || userQuery}
                      </p>
                    </div>
                  </div>
                )}

                {/* AURA Display Response */}
                <div className="bg-gradient-to-b from-cyan-950/20 to-purple-950/20 border border-white/10 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AURA
                    </span>
                    {isSpeaking && (
                      <button
                        onClick={interruptSpeaking}
                        className="text-[10px] text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Square className="w-2.5 h-2.5 fill-current" /> Stop voice
                      </button>
                    )}
                  </div>
                  {renderMessageContent(displayResponse)}
                </div>

                {/* Error Banner if permission or network issue */}
                {errorMessage && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <p className="flex-1">{errorMessage}</p>
                  </div>
                )}
              </div>

              {/* Text Input Fallback */}
              <form onSubmit={handleTextSubmit} className="relative z-10 flex items-center gap-2">
                <input
                  ref={textInputRef}
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type a command or ask a question..."
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                  aria-label="Type a command or question to AURA"
                />

                {/* Microphone Toggle Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${
                    isListening
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={isListening ? "Listening... click to pause" : "Click to speak"}
                  aria-label={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                {/* Text Send Button */}
                <button
                  type="submit"
                  disabled={!textInput.trim() || isThinking}
                  className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/25 transition-all cursor-pointer"
                  title="Send text to AURA"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Interactive Quick Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5 relative z-10 border-t border-white/5">
                {[
                  "Take me to workspaces",
                  "Open AI Tutor",
                  "Turn on dark mode",
                  "What is photosynthesis?",
                  "Tell me what I can do here"
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleUserUtterance(chip)}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. FLOATING AURA LAUNCHER BUTTON IN BOTTOM-RIGHT CORNER - REMOVED */}
    </>
  );
}
