import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  X, 
  Loader2, 
  Bot, 
  User, 
  Settings, 
  Moon, 
  Sun, 
  FolderPlus, 
  BookOpen,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMicrophoneWaveform } from '../hooks/useMicrophoneWaveform';
import { recordUserActivity } from '../utils/userActivity';
import { Workspace } from './Dashboard/WorkspaceTypes';
import { voiceResponseEngine, queryGeminiVoice } from '../services/voiceResponseEngine';

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

  const recognitionRef = useRef<any>(null);
  const lastProcessedCommandRef = useRef<string>('');
  const lastProcessedTimeRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  const waveformLevels = useMicrophoneWaveform(isListening && !isSpeaking);

  // Play vocal confirmation using the TTS response engine
  const speakConfirmation = (text: string, onDone?: () => void) => {
    if (isMuted) {
      onDone?.();
      return;
    }

    voiceResponseEngine.speak(text, {
      onStart: () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        // Pause microphone while speaking to avoid capturing computer audio output
        if (recognitionRef.current && isListening) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }
      },
      onEnd: () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onDone?.();
        // Resume listening if active
        if (isListening && recognitionRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current) {
              try {
                recognitionRef.current.start();
              } catch {}
            }
          }, 350);
        }
      },
      onError: () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onDone?.();
      }
    });
  };

  const stopSpeaking = () => {
    voiceResponseEngine.stop();
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
      if (isListening && !isSpeakingRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };
  }, [isListening]);

  // Handle incoming voice utterances
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

    // 1. ACTION: MUTE OR STOP SPEAKING
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
      setAgentResponse("Muted vocal speech.");
      return;
    }

    // 2. ACTION: SETTINGS & PROFILE NAVIGATION
    if (
      command.includes('go to settings') ||
      command.includes('open settings') ||
      command.includes('show settings') ||
      command.includes('profile settings') ||
      command === 'settings' ||
      command === 'preferences'
    ) {
      setActiveTab('profile');
      const confirmation = "Opening your settings and profile preferences.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      (window as any).showToast?.('🎙️ Voice Command: Opening Settings', 'success');
      return;
    }

    // 3. ACTION: LOG OUT
    if (
      command.includes('log out') || 
      command.includes('logout') || 
      command.includes('log me out') ||
      command.includes('sign out') ||
      command.includes('sign me out')
    ) {
      const confirmation = "Opening your logout confirmation. Let me know if you need anything else!";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      (window as any).showToast?.('🎙️ Voice Command: Confirming Logout', 'info');
      if (onLogout) {
        onLogout();
      }
      return;
    }

    // 4. ACTION: DARK MODE & LIGHT MODE
    if (
      command.includes('dark mode') || 
      command.includes('dark theme') || 
      command.includes('make it dark') ||
      command.includes('make the dark mode') ||
      command.includes('switch to dark mode')
    ) {
      if (onSetDarkMode) {
        onSetDarkMode(true);
      } else if (onToggleTheme && !isDarkMode) {
        onToggleTheme();
      }
      const confirmation = "Switched to dark mode for you.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      (window as any).showToast?.('🌙 Voice Command: Switched to Dark Mode', 'success');
      return;
    }

    if (
      command.includes('light mode') || 
      command.includes('light theme') || 
      command.includes('day mode') ||
      command.includes('make it light') ||
      command.includes('switch to light mode')
    ) {
      if (onSetDarkMode) {
        onSetDarkMode(false);
      } else if (onToggleTheme && isDarkMode) {
        onToggleTheme();
      }
      const confirmation = "Switched to light mode for you.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      (window as any).showToast?.('☀️ Voice Command: Switched to Light Mode', 'success');
      return;
    }

    if (command === 'toggle theme' || command === 'toggle dark mode' || command === 'switch theme') {
      onToggleTheme?.();
      const confirmation = "Theme mode toggled.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      return;
    }

    // 5. ACTION: CREATE A WORKSPACE
    const createWorkspaceRegex = /(?:create|make|add)(?:\s+a)?(?:\s+new)?\s+workspace(?:\s+and\s+name\s+it|\s+named|\s+called|\s+with\s+name|\s+name)?\s+(.+)/i;
    const createMatch = command.match(createWorkspaceRegex);

    if (createMatch && createMatch[1]) {
      let rawName = createMatch[1].trim();
      rawName = rawName.replace(/[.,!?;]+$/, '').trim();

      let wsName = rawName;
      if (wsName.toLowerCase() === 'this' || wsName.toLowerCase() === 'it' || wsName.toLowerCase() === 'something') {
        wsName = 'Study Workspace';
      } else {
        wsName = wsName
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      if (onCreateWorkspace) {
        onCreateWorkspace(wsName);
      }
      setActiveTab('workspaces');

      const confirmation = `I've created the workspace "${wsName}" for you and opened it!`;
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      (window as any).showToast?.(`📁 Voice Command: Created Workspace "${wsName}"`, 'success');
      return;
    }

    // 6. ACTION: OTHER APP NAVIGATION
    if (command === 'go home' || command === 'home' || command === 'dashboard' || command === 'go to dashboard') {
      setActiveWorkspace(null);
      setActiveTab('dashboard');
      const confirmation = "Taking you to your dashboard.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      (window as any).showToast?.('🎙️ Voice Command: Navigating to Dashboard', 'success');
      return;
    }

    if (command === 'workspaces' || command === 'study workspaces' || command === 'open workspaces' || command === 'folders') {
      setActiveWorkspace(null);
      setActiveTab('workspaces');
      const confirmation = "Opening your study workspaces.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      return;
    }

    if (command === 'notes' || command === 'study notes' || command === 'open notes' || command === 'ai study notes') {
      setActiveTab('notes');
      const confirmation = "Opening your study notes.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      return;
    }

    if (command === 'flashcards' || command === 'cards' || command === 'open flashcards') {
      setActiveTab('flashcards');
      const confirmation = "Opening your flashcards.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      return;
    }

    if (command === 'quiz' || command === 'quizzes' || command === 'quiz center' || command === 'practice quiz') {
      setActiveTab('quiz-center');
      const confirmation = "Opening your Quiz Center.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      return;
    }

    if (command === 'planner' || command === 'study planner' || command === 'schedule' || command === 'calendar') {
      setActiveTab('study-planner');
      const confirmation = "Opening your Study Planner.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      return;
    }

    if (command.includes('focus mode') || command.includes('zen mode')) {
      onToggleFocusMode?.();
      const confirmation = "Focus mode toggled.";
      setAgentResponse(confirmation);
      speakConfirmation(confirmation);
      return;
    }

    // 7. GENERAL KNOWLEDGE QUERIES & AI TUTOR QUESTIONS VIA GEMINI API
    // Checks for questions, queries, explanations, or direct academic queries
    const isExplicitAiTutorPrompt = 
      command.includes('ai tutor') || 
      command.includes('ask tutor') || 
      command.includes('ask him') || 
      command.includes('ask her');

    const isQuestionQuery = 
      isExplicitAiTutorPrompt ||
      command.startsWith('what is') ||
      command.startsWith("what's") ||
      command.startsWith('what are') ||
      command.startsWith('what the') ||
      command.startsWith('who is') ||
      command.startsWith('who was') ||
      command.startsWith('where is') ||
      command.startsWith('when did') ||
      command.startsWith('how do') ||
      command.startsWith('how does') ||
      command.startsWith('why is') ||
      command.startsWith('why do') ||
      command.startsWith('explain ') ||
      command.startsWith('tell me about ') ||
      command.startsWith('calculate ') ||
      command.startsWith('define ') ||
      command.includes('currency of') ||
      command.includes('capital of') ||
      command.startsWith('ask ');

    if (isQuestionQuery) {
      let cleanQuery = rawCommand;
      // Strip voice navigation framing
      cleanQuery = cleanQuery
        .replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:go\s+to\s+(?:the\s+)?ai\s+tutor\s+(?:and\s+(?:then\s+)?)?)?/i, '')
        .replace(/^(?:ask\s+(?:him|her|it|the\s+tutor|ai\s+tutor|tutor)\s+)/i, '')
        .replace(/^(?:ask\s+)/i, '')
        .trim();

      // Normalize phrasing e.g. "what the currency of India is"
      if (/^what\s+the\s+currency\s+of\s+india\s+is\??$/i.test(cleanQuery)) {
        cleanQuery = "What is the currency of India?";
      }

      // If user literally just said "open ai tutor" without a query
      if (!cleanQuery || cleanQuery.toLowerCase() === 'ai tutor' || cleanQuery.toLowerCase() === 'open ai tutor') {
        setActiveTab('ai-tutor');
        if (workspaces.length > 0 && !activeWorkspace) {
          setActiveWorkspace(workspaces[0]);
        }
        const confirmation = "Opening your AI Study Tutor. What would you like to learn today?";
        setAgentResponse(confirmation);
        speakConfirmation(confirmation);
        return;
      }

      // Query Gemini API directly for human-like general knowledge vocal answer
      setIsThinking(true);
      setAgentResponse(`Querying Gemini AI on: "${cleanQuery}"...`);

      // If the user asked via AI Tutor framing, navigate to AI Tutor
      if (isExplicitAiTutorPrompt || command.includes('ai tutor')) {
        setActiveTab('ai-tutor');
        if (workspaces.length > 0 && !activeWorkspace) {
          setActiveWorkspace(workspaces[0]);
        } else if (workspaces.length === 0 && onCreateWorkspace) {
          const defaultWs = onCreateWorkspace('General Studies', 'AI Tutor Session');
          setActiveWorkspace(defaultWs);
        }
      }

      try {
        const geminiResult = await queryGeminiVoice(cleanQuery);
        setIsThinking(false);
        setAgentResponse(geminiResult.answer);

        // Vocalize answer with human-like text-to-speech engine
        speakConfirmation(geminiResult.spokenText);

        // Synchronize with AI Tutor chat interface
        window.dispatchEvent(new CustomEvent('studyweb_ask_ai_tutor', {
          detail: {
            question: cleanQuery,
            answer: geminiResult.answer
          }
        }));

        recordUserActivity({
          title: 'AI Voice Query',
          detail: `Asked: "${cleanQuery}"`,
          iconType: 'tutor'
        });

        (window as any).showToast?.('💡 Gemini AI Answered via Voice', 'success');
      } catch (err) {
        console.error('Gemini voice query execution failed:', err);
        setIsThinking(false);
        const fallback = `I have received your question: "${cleanQuery}". Let's explore it in the AI Tutor.`;
        setAgentResponse(fallback);
        speakConfirmation(fallback);
      }
      return;
    }

    // Unrecognized utterance fallback: Direct query to Gemini API so ANY general statement gets answered!
    setIsThinking(true);
    setAgentResponse(`Thinking about "${rawCommand}"...`);
    try {
      const geminiResult = await queryGeminiVoice(rawCommand);
      setIsThinking(false);
      setAgentResponse(geminiResult.answer);
      speakConfirmation(geminiResult.spokenText);
    } catch {
      setIsThinking(false);
      const help = `I heard: "${rawCommand}". Try saying "Go to settings", "Turn on dark mode", "Create workspace Biology", or ask any question like "What is the speed of light?".`;
      setAgentResponse(help);
      speakConfirmation("I am your voice assistant. You can give commands or ask me any general knowledge questions.");
    }
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
      (window as any).showToast?.('🎙️ Voice listener paused.', 'info');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setShowPanel(true);
        (window as any).showToast?.('🎙️ Voice listener active! Ask any question or command.', 'success');
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
              className="w-[330px] sm:w-[380px] max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-4 text-slate-800 dark:text-slate-100 flex flex-col gap-3 transition-all"
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
                          <Volume2 className="w-3 h-3 animate-bounce" /> Speaking vocal answer...
                        </span>
                      ) : isThinking ? (
                        <span className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Loader2 className="w-3 h-3 animate-spin" /> Querying Gemini API...
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
                      const nextMute = !isMuted;
                      setIsMuted(nextMute);
                      voiceResponseEngine.setMuted(nextMute);
                    }}
                    title={isMuted ? "Unmute vocal responses" : "Mute vocal responses"}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Close / Collapse button */}
                  <button
                    onClick={() => setShowPanel(false)}
                    title="Minimize panel"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                    Say any action or question (e.g. &ldquo;Go to settings&rdquo;, &ldquo;What is the speed of light?&rdquo;)
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
                        <p className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">Voice Confirmation & Answer</p>
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
                  {isSpeaking ? "Vocal Engine Speaking" : isListening ? "Microphone Input" : "Idle"}
                </span>

                <div className="flex items-center gap-1 h-3.5">
                  {isSpeaking ? (
                    // Equalizer wave animation when TTS response engine is speaking
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

              {/* Quick Action & General Knowledge Chips */}
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
                  onClick={() => handleVoiceCommand("create a workspace and name it Physics")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium transition-colors border border-slate-200/50 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="w-3 h-3" /> Create Workspace
                </button>
                <button
                  onClick={() => handleVoiceCommand("what is the currency of India?")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium transition-colors border border-slate-200/50 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Bot className="w-3 h-3" /> Currency of India?
                </button>
                <button
                  onClick={() => handleVoiceCommand("what is the speed of light?")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium transition-colors border border-slate-200/50 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Speed of Light?
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
            title={isListening ? "Voice commands active. Click to pause." : "Enable voice agent (e.g. 'Go to settings', 'Dark mode', 'Create workspace', ask any question)"}
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
