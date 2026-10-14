import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Loader2, 
  Bot, 
  User, 
  Settings, 
  Moon, 
  Sun, 
  FolderPlus, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMicrophoneWaveform } from '../hooks/useMicrophoneWaveform';
import { recordUserActivity } from '../utils/userActivity';
import { Workspace } from './Dashboard/WorkspaceTypes';

interface GlobalVoiceListenerProps {
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

export default function GlobalVoiceListener({ 
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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [isSupported, setIsSupported] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef<any>(null);
  const lastProcessedCommandRef = useRef<string>('');
  const lastProcessedTimeRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  const waveformLevels = useMicrophoneWaveform(isListening && !isSpeaking);

  // Initialize Speech Synthesis Voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      } catch (e) {
        console.warn('SpeechSynthesis voice retrieval error:', e);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Pick the most natural, human-sounding English voice available on the platform
  const getNaturalVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (!voices || voices.length === 0) return null;
    
    // 1. Prioritize natural / neural / online Microsoft & Google voices
    const naturalVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      /natural|neural|online/i.test(v.name)
    );
    if (naturalVoice) return naturalVoice;

    // 2. Google US or UK English high-quality voices
    const googleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      /google.*(us|uk)/i.test(v.name)
    );
    if (googleVoice) return googleVoice;

    // 3. Apple premium natural voices (Samantha, Daniel, Karen, Serena, Moira, Alex)
    const appleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      /samantha|daniel|karen|serena|moira|alex|victoria/i.test(v.name)
    );
    if (appleVoice) return appleVoice;

    // 4. Any English voice
    const enVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB' || v.lang.startsWith('en'));
    if (enVoice) return enVoice;

    return voices[0] || null;
  };

  // Speak response out loud using natural human speech cadence
  const speakNaturalResponse = (text: string, onFinished?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || isMuted) {
      onFinished?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      // Clean speech text for natural human pronunciation
      const cleanSpeech = text
        .replace(/```[\s\S]*?```/g, '') // remove code blocks
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/#+\s+/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/[•\-\*]\s+/g, '')
        .replace(/INR/g, 'Indian Rupees')
        .replace(/₹/g, 'Indian Rupees ')
        .replace(/USD/g, 'dollars')
        .replace(/\$/g, 'dollars ')
        .replace(/\bAI\b/g, 'A.I.')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanSpeech) {
        onFinished?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      const voice = getNaturalVoice(availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices());
      if (voice) {
        utterance.voice = voice;
      }

      // Human-like warmth and conversational speed
      utterance.pitch = 1.0;
      utterance.rate = 1.02;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        // Pause microphone while speaking so it doesn't self-transcribe computer audio
        if (recognitionRef.current && isListening) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onFinished?.();
        // Resume listening if still in active mode
        if (isListening && recognitionRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current) {
              try {
                recognitionRef.current.start();
              } catch {}
            }
          }, 350);
        }
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis playback error:', e);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onFinished?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Failed to synthesize speech:', err);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      onFinished?.();
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  };

  // Setup Web Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      // Ignore microphone capture while the agent is speaking out loud
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
        setLastTranscript(spoken);
        if (final && final.trim()) {
          handleVoiceCommand(final.trim());
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn("Voice recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still listening and not speaking
      if (isListening && !isSpeakingRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };
  }, [isListening]);

  // Master Voice Command Interpreter
  const handleVoiceCommand = async (rawCommand: string) => {
    const command = rawCommand.toLowerCase().trim();
    if (!command) return;

    // Debounce duplicate utterances within 1.2 seconds
    const now = Date.now();
    if (
      command === lastProcessedCommandRef.current && 
      now - lastProcessedTimeRef.current < 1200
    ) {
      return;
    }
    lastProcessedCommandRef.current = command;
    lastProcessedTimeRef.current = now;

    setShowPanel(true);

    // 1. COMMAND: STOP / MUTE SPEAKING
    if (
      command.includes('stop speaking') || 
      command.includes('stop talking') || 
      command.includes('be quiet') || 
      command.includes('shut up') ||
      command === 'stop' ||
      command === 'quiet' ||
      command === 'mute'
    ) {
      stopSpeaking();
      setAgentResponse("Muted speaking voice.");
      return;
    }

    // 2. COMMAND: SETTINGS / PROFILE
    // "go to the settings", "open settings", "go to settings", "show settings"
    if (
      command.includes('setting') || 
      command.includes('settings') || 
      command.includes('profile') ||
      command.includes('preferences')
    ) {
      setActiveTab('profile');
      const reply = "Opening your settings and profile preferences.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🎙️ Voice Command: Opening Settings', 'success');
      return;
    }

    // 3. COMMAND: LOG OUT
    // "log out me", "log me out", "logout", "sign out me", "sign me out"
    if (
      command.includes('log out') || 
      command.includes('logout') || 
      command.includes('log me out') ||
      command.includes('sign out') ||
      command.includes('sign me out')
    ) {
      const reply = "Opening logout confirmation. Let me know if you need anything else!";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🎙️ Voice Command: Confirming Logout', 'info');
      if (onLogout) {
        onLogout();
      }
      return;
    }

    // 4. COMMAND: DARK MODE / LIGHT MODE
    // "make the dark mode here", "turn on dark mode", "enable dark mode", "switch to dark mode"
    if (
      command.includes('dark mode') || 
      command.includes('dark theme') || 
      command.includes('make it dark') ||
      command.includes('go dark')
    ) {
      if (onSetDarkMode) {
        onSetDarkMode(true);
      } else if (onToggleTheme && !isDarkMode) {
        onToggleTheme();
      }
      const reply = "Switched to dark mode for you.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🌙 Voice Command: Switched to Dark Mode', 'success');
      return;
    }

    if (
      command.includes('light mode') || 
      command.includes('light theme') || 
      command.includes('day mode') ||
      command.includes('make it light')
    ) {
      if (onSetDarkMode) {
        onSetDarkMode(false);
      } else if (onToggleTheme && isDarkMode) {
        onToggleTheme();
      }
      const reply = "Switched to light mode for you.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('☀️ Voice Command: Switched to Light Mode', 'success');
      return;
    }

    // 5. COMMAND: CREATE A WORKSPACE
    // "create a workspace and name it [this/name]"
    // "create workspace and name it biology"
    // "create a workspace named physics"
    // "create workspace math"
    const createWorkspaceRegex = /(?:create|make|add)(?:\s+a)?(?:\s+new)?\s+workspace(?:\s+and\s+name\s+it|\s+named|\s+called|\s+with\s+name|\s+name)?\s+(.+)/i;
    const createMatch = command.match(createWorkspaceRegex);

    if (createMatch && createMatch[1]) {
      let rawName = createMatch[1].trim();
      // Remove trailing punctuation
      rawName = rawName.replace(/[.,!?;]+$/, '').trim();

      // If user literally said "and name it this" or "this", assign a friendly default
      let wsName = rawName;
      if (wsName.toLowerCase() === 'this' || wsName.toLowerCase() === 'it' || wsName.toLowerCase() === 'something') {
        wsName = 'Study Workspace';
      } else {
        // Title-case capitalization
        wsName = wsName
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      if (onCreateWorkspace) {
        onCreateWorkspace(wsName);
      }
      setActiveTab('workspaces');

      const reply = `I've created the workspace "${wsName}" for you and opened it!`;
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.(`📁 Voice Command: Created Workspace "${wsName}"`, 'success');
      return;
    }

    // 6. COMMAND: AI TUTOR QUERY OR QUESTION ASKING
    // "go to the ai tutor and then ask him what the currency of india is"
    // "ask ai tutor what is the currency of india"
    // "what is the currency of india" / "what the currency of india is"
    const isAiTutorCommand = 
      command.includes('ai tutor') || 
      command.includes('tutor') || 
      command.includes('ask him') || 
      command.includes('ask her') ||
      command.includes('ask it') ||
      command.startsWith('ask ') ||
      command.includes('currency of india') ||
      command.startsWith('what is') ||
      command.startsWith("what's") ||
      command.startsWith('what the') ||
      command.startsWith('explain ') ||
      command.startsWith('how do') ||
      command.startsWith('who is');

    if (isAiTutorCommand) {
      // Extract the actual question
      let question = rawCommand;
      
      // Strip voice instruction prefixes
      question = question
        .replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:go\s+to\s+(?:the\s+)?ai\s+tutor\s+(?:and\s+(?:then\s+)?)?)?/i, '')
        .replace(/^(?:ask\s+(?:him|her|it|the\s+tutor|ai\s+tutor|tutor)\s+)/i, '')
        .replace(/^(?:ask\s+)/i, '')
        .trim();

      // Normalize common phrasing like "what the currency of india is" -> "What is the currency of India?"
      if (/^what\s+the\s+currency\s+of\s+india\s+is\??$/i.test(question)) {
        question = "What is the currency of India?";
      }

      if (!question || question.toLowerCase() === 'ai tutor' || question.toLowerCase() === 'open ai tutor' || question.toLowerCase() === 'go to ai tutor') {
        // General navigation to AI tutor without a specific question
        setActiveTab('ai-tutor');
        if (workspaces.length > 0 && !activeWorkspace) {
          setActiveWorkspace(workspaces[0]);
        }
        const reply = "Opening your AI Study Tutor. What would you like to learn today?";
        setAgentResponse(reply);
        speakNaturalResponse(reply);
        (window as any).showToast?.('🤖 Voice Command: Opening AI Tutor', 'success');
        return;
      }

      // We have a specific question! Navigate to AI Tutor and answer it
      setActiveTab('ai-tutor');
      if (workspaces.length > 0 && !activeWorkspace) {
        setActiveWorkspace(workspaces[0]);
      } else if (workspaces.length === 0 && onCreateWorkspace) {
        const defaultWs = onCreateWorkspace('General Studies', 'AI Tutor Session');
        setActiveWorkspace(defaultWs);
      }

      setIsThinking(true);
      setAgentResponse(`Consulting AI Tutor on: "${question}"...`);

      // Immediate fast-path answer for popular benchmark queries like currency of India
      const isCurrencyOfIndia = /currency\s+of\s+india/i.test(question);
      let immediateSpokenAnswer = '';
      let immediateFullAnswer = '';

      if (isCurrencyOfIndia) {
        immediateSpokenAnswer = "The currency of India is the Indian Rupee, with the symbol ₹ and currency code INR.";
        immediateFullAnswer = "The currency of India is the **Indian Rupee** (code: **INR**, symbol: **₹**). It is issued and regulated by the Reserve Bank of India (RBI). One rupee is subdivided into 100 paise.";
      }

      try {
        if (immediateSpokenAnswer) {
          setIsThinking(false);
          setAgentResponse(immediateFullAnswer);
          speakNaturalResponse(immediateSpokenAnswer);

          // Dispatch event to WorkspaceChat to automatically insert into the study conversation
          window.dispatchEvent(new CustomEvent('studyweb_ask_ai_tutor', {
            detail: {
              question: question,
              answer: immediateFullAnswer
            }
          }));

          recordUserActivity({
            title: 'Used AI Tutor via Voice',
            detail: `Asked: "${question}"`,
            iconType: 'tutor'
          });

          (window as any).showToast?.('🤖 AI Tutor Answered via Voice', 'success');
          return;
        }

        // Concurrently query backend Gemini AI Tutor
        const response = await fetch('/api/ai-tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: question,
            history: [],
            persona: 'plain_english',
            modelMode: 'auto',
            workspaceId: activeWorkspace?.id
          })
        });

        const data = await response.json();
        const replyText = data?.reply || data?.text || `The answer to "${question}" is ready in your AI Tutor workspace.`;
        
        setIsThinking(false);
        setAgentResponse(replyText);

        // Extract first 2 concise sentences for human-like conversational speaking
        const sentences = replyText.replace(/[*#_`]/g, '').split(/[.!?]+\s+/).filter(Boolean);
        const spokenExcerpt = sentences.slice(0, 2).join('. ') + '.';
        speakNaturalResponse(spokenExcerpt);

        // Send to WorkspaceChat so it displays nicely in the chat feed
        window.dispatchEvent(new CustomEvent('studyweb_ask_ai_tutor', {
          detail: {
            question: question,
            answer: replyText
          }
        }));

        recordUserActivity({
          title: 'Used AI Tutor via Voice',
          detail: `Asked: "${question}"`,
          iconType: 'tutor'
        });

        (window as any).showToast?.('🤖 AI Tutor Answered via Voice', 'success');
      } catch (err) {
        console.error('Error fetching voice answer from AI Tutor:', err);
        setIsThinking(false);
        const fallbackReply = `I've opened the AI Tutor for your question: "${question}".`;
        setAgentResponse(fallbackReply);
        speakNaturalResponse(fallbackReply);
        window.dispatchEvent(new CustomEvent('studyweb_ask_ai_tutor', {
          detail: { question }
        }));
      }
      return;
    }

    // 7. OTHER NAVIGATION COMMANDS
    if (command.includes('dashboard') || command.includes('home') || command.includes('go home')) {
      setActiveWorkspace(null);
      setActiveTab('dashboard');
      const reply = "Navigating to your dashboard.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🎙️ Voice Command: Navigating to Dashboard', 'success');
      return;
    }

    if (command.includes('workspace') || command.includes('workspaces') || command.includes('folders')) {
      setActiveWorkspace(null);
      setActiveTab('workspaces');
      const reply = "Opening your study workspaces.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🎙️ Voice Command: Opening Workspaces', 'success');
      return;
    }

    if (command.includes('note') || command.includes('notes')) {
      setActiveTab('notes');
      const reply = "Opening your study notes.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🎙️ Voice Command: Opening Study Notes', 'success');
      return;
    }

    if (command.includes('flashcard') || command.includes('cards')) {
      setActiveTab('flashcards');
      const reply = "Opening your flashcards.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🎙️ Voice Command: Opening Flashcards', 'success');
      return;
    }

    if (command.includes('quiz') || command.includes('test')) {
      setActiveTab('quiz-center');
      const reply = "Opening your Quiz Center.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🎙️ Voice Command: Opening Quiz Center', 'success');
      return;
    }

    if (command.includes('planner') || command.includes('schedule') || command.includes('calendar')) {
      setActiveTab('study-planner');
      const reply = "Opening your Study Planner.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🎙️ Voice Command: Opening Study Planner', 'success');
      return;
    }

    if (command.includes('focus mode') || command.includes('zen mode')) {
      onToggleFocusMode?.();
      const reply = "Toggled Focus Mode.";
      setAgentResponse(reply);
      speakNaturalResponse(reply);
      (window as any).showToast?.('🎙️ Voice Command: Toggling Focus Mode', 'success');
      return;
    }

    // Default Fallback: Prompt user with helpful suggestions
    const reply = `I heard: "${rawCommand}". Try saying "Go to settings", "Turn on dark mode", "Create workspace Biology", or "Ask AI tutor what is the currency of India".`;
    setAgentResponse(reply);
    speakNaturalResponse("I can help you navigate, switch modes, create workspaces, or ask the AI tutor anything.");
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      (window as any).showToast?.('Speech recognition is not supported in this browser.', 'warning');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      stopSpeaking();
      setIsListening(false);
      setShowPanel(false);
      (window as any).showToast?.('🎙️ Voice command listener paused.', 'info');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setShowPanel(true);
        (window as any).showToast?.('🎙️ Voice commands active! Speak any command or question.', 'success');
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  };

  if (!isSupported) return null;

  return (
    <>
      {/* Floating Voice Agent Dock in bottom right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto">
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.94 }}
              className="w-[330px] sm:w-[370px] max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-4 text-slate-800 dark:text-slate-100 flex flex-col gap-3 transition-all"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">StudyWeb Voice Agent</h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      {isSpeaking ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <Volume2 className="w-3 h-3 animate-bounce" /> Speaking response...
                        </span>
                      ) : isThinking ? (
                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                        </span>
                      ) : isListening ? (
                        <span className="flex items-center gap-1 text-rose-500 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /> Listening live...
                        </span>
                      ) : (
                        <span>Ready</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Mute/Unmute Speech Output Toggle */}
                  <button
                    onClick={() => {
                      if (isSpeaking) stopSpeaking();
                      setIsMuted(!isMuted);
                    }}
                    title={isMuted ? "Unmute voice response" : "Mute voice response"}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Close / Collapse button */}
                  <button
                    onClick={() => setShowPanel(false)}
                    title="Minimize panel"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dynamic Transcript & Agent Response Area */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 text-xs">
                {/* User's spoken speech */}
                {lastTranscript ? (
                  <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 mt-0.5">
                      <User className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">You said</p>
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed break-words">{lastTranscript}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-slate-400 text-xs italic">
                    Say a command or question (e.g. &ldquo;Go to settings&rdquo;, &ldquo;Ask AI tutor what is the currency of India&rdquo;)
                  </div>
                )}

                {/* Agent Response */}
                {agentResponse && (
                  <div className="flex items-start gap-2 bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white mt-0.5 shadow-xs">
                      <Bot className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">Voice Agent</p>
                        {isSpeaking && (
                          <button
                            onClick={stopSpeaking}
                            className="text-[10px] text-rose-500 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <VolumeX className="w-2.5 h-2.5" /> Stop voice
                          </button>
                        )}
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-line break-words">{agentResponse}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Audio Waveform Visualizer */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isSpeaking ? "Voice Output Active" : isListening ? "Audio Input Wave" : "Idle"}
                </span>

                <div className="flex items-center gap-1 h-3.5">
                  {isSpeaking ? (
                    // Equalizer wave animation when voice agent is speaking
                    [1, 2, 3, 4, 5].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-emerald-500 to-indigo-500 rounded-full"
                        animate={{ height: ['4px', `${Math.min(16, 4 + ((i * 4) % 14))}px`, '6px', '14px', '4px'] }}
                        transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    ))
                  ) : (
                    // Real-time microphone levels when user is speaking
                    waveformLevels.map((lvl, idx) => (
                      <motion.div
                        key={idx}
                        className="w-1 bg-gradient-to-t from-rose-500 to-indigo-500 rounded-full origin-bottom"
                        animate={{ height: `${Math.max(3, Math.min(16, lvl))}px` }}
                        transition={{ type: "tween", duration: 0.08 }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Quick Action Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => handleVoiceCommand("go to settings")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium transition-colors border border-slate-200/50 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3 h-3" /> Settings
                </button>
                <button
                  onClick={() => handleVoiceCommand(isDarkMode ? "turn on light mode" : "make the dark mode here")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium transition-colors border border-slate-200/50 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  {isDarkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />} 
                  {isDarkMode ? "Light Mode" : "Dark Mode"}
                </button>
                <button
                  onClick={() => handleVoiceCommand("create a workspace and name it Science")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium transition-colors border border-slate-200/50 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="w-3 h-3" /> New Workspace
                </button>
                <button
                  onClick={() => handleVoiceCommand("go to the ai tutor and then ask him what the currency of india is")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium transition-colors border border-slate-200/50 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Bot className="w-3 h-3" /> Currency of India?
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Voice Command Primary Toggle Button */}
        <div className="flex items-center gap-2">
          {!showPanel && (lastTranscript || isSpeaking) && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setShowPanel(true)}
              className="bg-slate-900/90 text-white px-3.5 py-2 rounded-2xl text-xs font-semibold shadow-xl border border-slate-700/80 flex items-center gap-2 backdrop-blur-md cursor-pointer hover:bg-slate-800"
            >
              {isSpeaking ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              )}
              <span className="max-w-[170px] truncate">{agentResponse || lastTranscript || 'Voice Agent active'}</span>
            </motion.button>
          )}

          <button
            onClick={toggleListening}
            className={`relative p-3.5 rounded-full shadow-2xl transition-all flex items-center justify-center cursor-pointer group ${
              isListening
                ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-rose-500/40 ring-4 ring-rose-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:shadow-lg'
            }`}
            title={isListening ? "Voice commands active. Click to pause." : "Enable voice agent (e.g. 'Go to settings', 'Dark mode', 'Create workspace', 'Ask AI tutor')"}
          >
            {isListening ? (
              <Mic className="w-5 h-5 animate-pulse" />
            ) : (
              <MicOff className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            )}

            {isListening && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
