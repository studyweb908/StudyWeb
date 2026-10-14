import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalVoiceListenerProps {
  setActiveTab: (tab: string) => void;
  setActiveWorkspace: (ws: any) => void;
  onToggleFocusMode?: () => void;
}

export default function GlobalVoiceListener({ setActiveTab, setActiveWorkspace, onToggleFocusMode }: GlobalVoiceListenerProps) {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const [showIndicator, setShowIndicator] = useState(false);

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
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const spoken = (final || interim).toLowerCase().trim();
      if (spoken) {
        setLastTranscript(spoken);
        handleVoiceCommand(spoken);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Voice recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };
  }, [isListening]);

  const handleVoiceCommand = (command: string) => {
    if (command.includes('dashboard') || command.includes('home') || command.includes('go home')) {
      setActiveWorkspace(null);
      setActiveTab('dashboard');
      (window as any).showToast?.('🎙️ Voice Command: Navigating to Dashboard', 'success');
      setLastTranscript('');
    } else if (command.includes('ai tutor') || command.includes('tutor') || command.includes('open ai')) {
      setActiveTab('ai-tutor');
      (window as any).showToast?.('🎙️ Voice Command: Opening AI Tutor', 'success');
      setLastTranscript('');
    } else if (command.includes('workspace') || command.includes('workspaces') || command.includes('folders')) {
      setActiveWorkspace(null);
      setActiveTab('workspaces');
      (window as any).showToast?.('🎙️ Voice Command: Opening Study Workspaces', 'success');
      setLastTranscript('');
    } else if (command.includes('note') || command.includes('notes')) {
      setActiveTab('notes');
      (window as any).showToast?.('🎙️ Voice Command: Opening AI Study Notes', 'success');
      setLastTranscript('');
    } else if (command.includes('flashcard') || command.includes('cards')) {
      setActiveTab('flashcards');
      (window as any).showToast?.('🎙️ Voice Command: Opening Flashcards', 'success');
      setLastTranscript('');
    } else if (command.includes('quiz') || command.includes('test')) {
      setActiveTab('quiz-center');
      (window as any).showToast?.('🎙️ Voice Command: Opening Quiz Center', 'success');
      setLastTranscript('');
    } else if (command.includes('planner') || command.includes('schedule') || command.includes('calendar')) {
      setActiveTab('study-planner');
      (window as any).showToast?.('🎙️ Voice Command: Opening Study Planner', 'success');
      setLastTranscript('');
    } else if (command.includes('focus mode') || command.includes('zen mode')) {
      onToggleFocusMode?.();
      (window as any).showToast?.('🎙️ Voice Command: Toggling Focus Mode', 'success');
      setLastTranscript('');
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
      setIsListening(false);
      setShowIndicator(false);
      (window as any).showToast?.('🎙️ Voice command listener paused.', 'info');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setShowIndicator(true);
        (window as any).showToast?.('🎙️ Voice commands active! Try saying "Go to dashboard" or "Open AI tutor".', 'success');
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!isSupported) return null;

  return (
    <>
      {/* Floating Voice Command Toggle Button in bottom right */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <AnimatePresence>
          {showIndicator && lastTranscript && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl border border-slate-700 dark:border-slate-200 flex items-center gap-2"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="max-w-[180px] truncate">"{lastTranscript}"</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={toggleListening}
          className={`relative p-3.5 rounded-full shadow-xl transition-all flex items-center justify-center cursor-pointer group ${
            isListening
              ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-rose-500/30 ring-4 ring-rose-500/20 animate-pulse'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-indigo-500'
          }`}
          title={isListening ? "Voice commands active. Click to stop." : "Enable voice commands (e.g. 'Go to dashboard', 'Open AI tutor')"}
        >
          {isListening ? (
            <Mic className="w-5 h-5 animate-bounce" />
          ) : (
            <MicOff className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          )}

          {isListening && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
          )}
        </button>
      </div>
    </>
  );
}
