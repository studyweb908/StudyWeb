import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  FileUp, 
  Image as ImageIcon, 
  Search, 
  Mic, 
  Maximize2, 
  Check, 
  AlertCircle,
  Clock,
  CornerDownLeft,
  ChevronRight,
  BookOpen,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Trophy,
  Volume2,
  VolumeX,
  Target,
  Plus,
  Trash2,
  FileText,
  X,
  Copy,
  Share2
} from 'lucide-react';
import { useMicrophoneWaveform } from '../../hooks/useMicrophoneWaveform';
import { useTaskContext } from '../../context/TaskContext';
import { recordUserActivity } from '../../utils/userActivity';
import { AITutorBackgroundService } from '../../services/AITutorBackgroundService';
import { FullScreenUploadOverlay } from './FullScreenUploadOverlay';
import { loadStoredWorkspaces, saveStoredWorkspaces } from '../../utils/workspaceStorage';
import { WorkspaceSyncService } from '../../services/WorkspaceSyncService';
import { AITutorContextDebugPanel } from './AITutorContextDebugPanel';
import AITutorAvatar from './AITutorAvatar';
import { ShareContentModal, triggerNativeDeviceShare } from './ShareContentModal';
import {
  fetchNaturalTtsAudio,
  getStoredVoiceProfileGender,
  prepareTextForNaturalSpeech,
  resolveGeminiVoiceForProfile,
  selectBestBrowserNaturalVoice
} from '../../utils/naturalTts';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  workspaceNotice?: string;
  citations?: Array<{
    sourceName: string;
    page?: number;
    quote: string;
  }>;
  source?: string;
  followUpQuestions?: string[];
  suggestOutsideResearch?: boolean;
  originalQuery?: string;
  generatedImageUrl?: string;
  generatedImageCaption?: string;
  isError?: boolean;
  failedPrompt?: string;
}

const CopySnippetButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="p-1 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-slate-200 ml-auto shrink-0"
      title="Copy snippet"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

function parseTextWithHighlights(
  text: string,
  msgId: string,
  citations: Message['citations'] | undefined,
  hoveredCitation: any,
  setHoveredCitation: (cite: any) => void,
  setActiveCitation: (cite: any) => void
) {
  if (!citations || citations.length === 0) {
    return <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>') }} />;
  }

  const regex = /<cite id="(\d+)">([\s\S]*?)<\/cite>|\[(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  const renderTooltip = (citeId: string, cite: any) => (
    <AnimatePresence>
      {hoveredCitation?.id === citeId && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-xl shadow-xl border border-slate-850 dark:border-slate-800 backdrop-blur-md z-[100] text-[11px] text-left leading-relaxed flex flex-col gap-1.5 cursor-default"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 mb-1 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-extrabold text-[10px] text-slate-200 truncate">{cite.sourceName}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {cite.page !== undefined && (
                <span className="font-bold text-[8px] text-amber-400 font-mono bg-amber-500/10 px-1 py-0.5 rounded uppercase tracking-wider">
                  Page {cite.page}
                </span>
              )}
              <CopySnippetButton text={cite.quote} />
            </div>
          </div>
          <p className="italic font-medium text-slate-300 leading-normal line-clamp-3 relative pl-2 border-l-2 border-indigo-500">
            "{cite.quote}"
          </p>
          <div 
            className="text-[10px] text-indigo-400 mt-1 font-bold flex items-center gap-1 cursor-pointer hover:text-indigo-300 transition-colors w-fit"
            onClick={(e) => { e.stopPropagation(); setActiveCitation(cite); }}
          >
            <span>View Source</span>
            <span>&rarr;</span>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95 dark:border-t-slate-950/95" />
        </motion.div>
      )}
    </AnimatePresence>
  );

  while ((match = regex.exec(text)) !== null) {
    const preText = text.substring(lastIndex, match.index);
    if (preText) {
      parts.push(<span key={`pre-${match.index}`} dangerouslySetInnerHTML={{ __html: preText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>') }} />);
    }

    if (match[1]) {
      // <cite id="...">
      const citeIdx = parseInt(match[1], 10);
      const citeContent = match[2];
      const citeData = citations[citeIdx];
      const citeId = `${msgId}-inline-${citeIdx}-${match.index}`;

      if (citeData) {
        parts.push(
          <span 
            key={`cite-${match.index}`}
            className="bg-amber-500/20 text-amber-900 dark:text-amber-200 px-1 rounded cursor-pointer transition-colors hover:bg-amber-500/30 border-b border-amber-500/30 inline-block my-0.5 relative z-10"
            onMouseEnter={() => setHoveredCitation({
              id: citeId,
              sourceName: citeData.sourceName,
              page: citeData.page,
              quote: citeData.quote
            })}
            onMouseLeave={() => setHoveredCitation(null)}
            onClick={() => setActiveCitation(citeData)}
          >
            <span dangerouslySetInnerHTML={{ __html: citeContent.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>') }} />
            {renderTooltip(citeId, citeData)}
          </span>
        );
      } else {
        parts.push(<span key={`cite-${match.index}`}>{citeContent}</span>);
      }
    } else if (match[3]) {
      // [1] format
      const citeIdx = parseInt(match[3], 10) - 1;
      const citeData = citations[citeIdx];
      const citeId = `${msgId}-inline-${citeIdx}-${match.index}`;

      if (citeData) {
        parts.push(
          <span 
            key={`bracket-${match.index}`}
            className="inline-flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded px-1.5 mx-0.5 cursor-pointer transition-colors relative z-10"
            onMouseEnter={() => setHoveredCitation({
              id: citeId,
              sourceName: citeData.sourceName,
              page: citeData.page,
              quote: citeData.quote
            })}
            onMouseLeave={() => setHoveredCitation(null)}
            onClick={() => setActiveCitation(citeData)}
          >
            [{match[3]}]
            {renderTooltip(citeId, citeData)}
          </span>
        );
      } else {
        parts.push(<span key={`bracket-${match.index}`}>[{match[3]}]</span>);
      }
    }

    lastIndex = regex.lastIndex;
  }

  const postText = text.substring(lastIndex);
  if (postText) {
    parts.push(<span key={`post-${lastIndex}`} dangerouslySetInnerHTML={{ __html: postText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>') }} />);
  }

  return <>{parts}</>;
}

export default function AITutorWorkspace() {
  const { activeWorkspace } = useTaskContext();
  const targetWsId = activeWorkspace?.id || 'general-study';

  const renderWorkspaceLogo = (sizeClass = 'w-7 h-7 sm:w-9 sm:h-9', _textClass = 'text-base sm:text-lg') => {
    return (
      <AITutorAvatar
        workspace={activeWorkspace}
        sizeClass={sizeClass}
      />
    );
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hi! I'm your AI Study Assistant. Ask me anything about your uploaded materials, and I'll explain concepts, create summaries, or test your knowledge.",
      time: 'Just now'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSemanticSearch, setShowSemanticSearch] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [citationMode, setCitationMode] = useState(true);
  const [showMobileDocs, setShowMobileDocs] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{
    name: string;
    type: string;
    size?: string;
    url?: string;
    fileBase64?: string;
    fileMimeType?: string;
    transcription?: string;
  }[]>([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [activeCitation, setActiveCitation] = useState<{
    sourceName: string;
    page?: number;
    quote: string;
  } | null>(null);
  const [hoveredCitation, setHoveredCitation] = useState<{
    id: string;
    sourceName: string;
    page?: number;
    quote: string;
  } | null>(null);

  // Auditory TTS state
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsSeqRef = useRef(0);

  const stopTutorSpeech = () => {
    ttsSeqRef.current += 1;
    if (ttsAbortRef.current) {
      try { ttsAbortRef.current.abort(); } catch {}
      ttsAbortRef.current = null;
    }
    if (audioPlayerRef.current) {
      try { audioPlayerRef.current.pause(); } catch {}
      audioPlayerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    setSpeakingMsgId(null);
  };

  const handleSpeakTutor = async (id: string, text: string) => {
    if (speakingMsgId === id) {
      stopTutorSpeech();
      return;
    }
    stopTutorSpeech();

    const clean = prepareTextForNaturalSpeech(text);
    if (!clean) return;

    const seq = ++ttsSeqRef.current;
    const abortCtrl = new AbortController();
    ttsAbortRef.current = abortCtrl;
    const gender = getStoredVoiceProfileGender();
    const resolvedVoice = resolveGeminiVoiceForProfile(gender);

    try {
      setSpeakingMsgId(id);
      const ttsResult = await fetchNaturalTtsAudio({
        text: clean,
        persona: 'socratic',
        voiceName: resolvedVoice,
        timeoutMs: 25000,
        signal: abortCtrl.signal
      });

      if (ttsSeqRef.current !== seq || abortCtrl.signal.aborted) return;

      if (ttsResult?.audioBase64) {
        const audio = new Audio(`data:${ttsResult.mimeType};base64,${ttsResult.audioBase64}`);
        audioPlayerRef.current = audio;
        audio.onended = () => {
          audioPlayerRef.current = null;
          setSpeakingMsgId(null);
        };
        audio.onerror = () => {
          audioPlayerRef.current = null;
          setSpeakingMsgId(null);
        };
        await audio.play();
        return;
      }
    } catch {}

    if (ttsSeqRef.current !== seq || abortCtrl.signal.aborted) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(clean.slice(0, 1500));
      const bestVoice = selectBestBrowserNaturalVoice(gender);
      if (bestVoice) u.voice = bestVoice;
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onend = () => setSpeakingMsgId(null);
      u.onerror = () => setSpeakingMsgId(null);
      window.speechSynthesis.speak(u);
    }
  };

  // Pomodoro Focus Timer States
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [completedCycles, setCompletedCycles] = useState(0);
  const [sessionGoalInput, setSessionGoalInput] = useState('');
  const [sessionGoals, setSessionGoals] = useState<{ id: string; text: string; done: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('studyweb_session_goals');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [timerSoundMuted, setTimerSoundMuted] = useState(true);
  const [focusAmbiance, setFocusAmbiance] = useState('Deep Focus Lo-Fi');
  const [shareModalData, setShareModalData] = useState<{ answer: string; question?: string } | null>(null);

  // Motivational Focus quotes
  const focusQuotes = [
    { quote: "Focus is a muscle, and you are building it right now.", author: "StudyWeb Guide" },
    { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { quote: "Your focus determines your reality.", author: "Qui-Gon Jinn" },
    { quote: "There are no shortcuts to any place worth going.", author: "Beverly Sills" },
    { quote: "Deep work is the superpower of the 21st century.", author: "Cal Newport" }
  ];
  const [currentQuoteIdx] = useState(() => Math.floor(Math.random() * focusQuotes.length));

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Record AI Tutor usage when entering AI Tutor
  useEffect(() => {
    recordUserActivity({
      title: 'Used AI Tutor',
      detail: 'Personalized AI study session',
      iconType: 'tutor'
    });
  }, []);

  // Focus Timer Tick logic - Optimized to avoid drift and interval rebuilding every second
  useEffect(() => {
    let intervalId: any = null;
    if (timerIsActive) {
      intervalId = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerIsActive]);

  // Handle Focus Timer completion events safely
  useEffect(() => {
    if (timerSeconds === 0 && timerIsActive) {
      setTimerIsActive(false);
      
      // Mode completed triggers
      if (timerMode === 'focus') {
        const nextCycles = completedCycles + 1;
        setCompletedCycles(nextCycles);
        
        // Push tutor notification message
        const congratMsg = {
          id: Date.now().toString(),
          sender: 'ai',
          text: `🎉 **Awesome study sprint, Alex!** You have completed Focus Cycle #${nextCycles}. Take a quick rest now. The brain processes complex memory during break periods!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, congratMsg]);
        
        if (nextCycles % 4 === 0) {
          setTimerMode('longBreak');
          setTimerSeconds(15 * 60);
          (window as any).showToast?.('🏆 Spectacular work! You have finished 4 complete focus sprints. Treat yourself to a 15-minute long break!', 'success');
        } else {
          setTimerMode('shortBreak');
          setTimerSeconds(5 * 60);
          (window as any).showToast?.('🌸 Focus session complete! Take a 5-minute break to stretch and rest.', 'info');
        }
      } else {
        setTimerMode('focus');
        setTimerSeconds(25 * 60);
        
        const focusRestartMsg = {
          id: Date.now().toString(),
          sender: 'ai',
          text: `💪 **Break period finished!** Let's lock back in for another 25-minute deep focus sprint. What concept should we break down first?`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, focusRestartMsg]);
        (window as any).showToast?.("💪 Let's get back to work! Focus session is starting.", 'success');
      }
    }
  }, [timerSeconds, timerIsActive, timerMode, completedCycles]);

  const formatTimerTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSetTimerPreset = (minutes: number, mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setTimerIsActive(false);
    setTimerMode(mode);
    setTimerSeconds(minutes * 60);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionGoalInput.trim()) return;
    setSessionGoals(prev => [
      ...prev,
      { id: Date.now().toString(), text: sessionGoalInput.trim(), done: false }
    ]);
    setSessionGoalInput('');
  };

  const toggleGoal = (id: string) => {
    setSessionGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  };

  const deleteGoal = (id: string) => {
    setSessionGoals(prev => prev.filter(g => g.id !== id));
  };

  // Progressive ChatGPT-style word-by-word streaming state
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamedWordCount, setStreamedWordCount] = useState<number>(0);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatFeedRef = useRef<HTMLDivElement | null>(null);

  const stopStreamingAnimation = () => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setStreamingMsgId(null);
  };

  const scrollChatToBottom = (behavior: ScrollBehavior = 'smooth', force = false) => {
    const container = chatFeedRef.current;
    if (container) {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (force || distanceFromBottom < 320) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior
        });
      }
      return;
    }
    chatEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  const startStreamingMessage = (msg: Message) => {
    if (!msg || msg.sender !== 'ai' || msg.isError || msg.id === 'welcome-msg' || msg.id.startsWith('welcome-')) {
      return;
    }
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    const tokens = String(msg.text || '').match(/\S+\s*|\n+/g) || [String(msg.text || '')];
    if (tokens.length <= 2) {
      setStreamingMsgId(null);
      requestAnimationFrame(() => scrollChatToBottom('smooth', true));
      return;
    }

    const wordsPerTick = Math.max(1, Math.min(4, Math.ceil(tokens.length / 90)));
    let currentCount = Math.min(tokens.length, wordsPerTick);
    setStreamingMsgId(msg.id);
    setStreamedWordCount(currentCount);
    requestAnimationFrame(() => scrollChatToBottom('smooth', true));

    streamTimerRef.current = setInterval(() => {
      currentCount += wordsPerTick;
      if (currentCount >= tokens.length) {
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        setStreamedWordCount(tokens.length);
        setStreamingMsgId(null);
        requestAnimationFrame(() => {
          scrollChatToBottom('smooth', true);
          setTimeout(() => scrollChatToBottom('smooth', false), 120);
        });
      } else {
        setStreamedWordCount(currentCount);
        scrollChatToBottom('smooth', false);
      }
    }, 22);
  };

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollChatToBottom('smooth', true);
  }, [messages.length, isThinking]);



  const handleSemanticSearch = async (queryToSearch: string) => {
    if (!queryToSearch.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: `Search documents for: "${queryToSearch}"`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setSearchQuery('');
    setIsSearching(true);
    setShowSemanticSearch(false);

    try {
      const response = await fetch("/api/knowledge/search", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToSearch,
          workspaceId: targetWsId
        })
      });

      if (!response.ok) {
        throw new Error("Search request failed");
      }
      
      const data = await response.json();
      
      const formattedResults = data.results?.map((res: any, idx: number) => {
        return `<cite id="${idx}">Excerpt from ${res.source_type || 'Document'}: ${res.text || res.content}</cite>`;
      }).join('\n\n') || 'No excerpts found.';

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Here are the semantic search results for "${queryToSearch}":\n\n${formattedResults}`,
        citations: data.results?.map((res: any) => ({
          sourceName: res.source_type || 'Workspace Document',
          quote: res.text || res.content || 'No content preview available'
        })) || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, aiMsg]);
      startStreamingMessage(aiMsg);
    } catch (err: any) {
      console.warn("Semantic search failed:", err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Unable to search workspace documents for "${queryToSearch}" right now. Please try again in a moment.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearChat = (showNotification = true) => {
    stopTutorSpeech();
    stopStreamingAnimation();
    setInputValue('');
    setSearchQuery('');
    setIsThinking(false);
    setIsSearching(false);
    setActiveCitation(null);
    setHoveredCitation(null);
    const wsLabel = activeWorkspace?.name ? ` in **${activeWorkspace.name}**` : '';
    const freshMsg: Message = {
      id: `welcome-${Date.now()}`,
      sender: 'ai',
      text: `✨ **Chat Cleared!**\n\nYour active workspace${wsLabel} is still open and ready. Ask me any new question or topic whenever you're ready!`,
      time: 'Just now'
    };
    AITutorBackgroundService.resetWorkspaceChat(targetWsId, null, [freshMsg] as any);
    setMessages([freshMsg]);

    // Explicitly notify backend server to clear conversation history in Gemini API session
    try {
      fetch('/api/ai-tutor-clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: targetWsId
        })
      }).catch(() => {});
    } catch {}

    if (showNotification) {
      (window as any).showToast?.(
        'Your conversation history has been wiped clean while keeping your active workspace open for a new topic.',
        'info',
        3400,
        'Chat History Cleared'
      );
    }
  };

  useEffect(() => {
    handleClearChat(false);
  }, [targetWsId]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() && attachedFiles.length === 0) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend || `Analyzed uploaded attachments: ${attachedFiles.map(f => f.name).join(', ')}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    recordUserActivity({
      title: 'Asked AI Tutor',
      detail: (textToSend || 'Study consultation').trim().slice(0, 50),
      iconType: 'tutor'
    });

    // Exclude welcome messages so history sent to backend is 100% clean conversation turns
    const history = messages
      .filter(m => !m.isError && !m.id.startsWith('welcome-') && m.id !== 'welcome-msg')
      .slice(-8)
      .map(m => ({
        role: m.sender === 'ai' ? 'model' : 'user',
        content: m.text
      }));

    try {
      const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('studyweb_active_user_id') : null;
      const storedWorkspaces = loadStoredWorkspaces(activeUserId) || [];
      const wsMap = new Map<string, any>();
      storedWorkspaces.forEach(w => { if (w && w.id) wsMap.set(w.id, w); });
      if (activeWorkspace && activeWorkspace.id) {
        wsMap.set(activeWorkspace.id, activeWorkspace);
      }
      const allWorkspacesList = Array.from(wsMap.values());

      const isGeneralMode = !activeWorkspace || targetWsId === 'general-study' || targetWsId === 'local-workspace';

      // Strictly scope workspaceFilesPayload to the ACTIVE workspace so files never bleed into General Study Mode
      const currentWs = !isGeneralMode ? ((activeWorkspace && wsMap.get(activeWorkspace.id)) || activeWorkspace) : null;
      const seenNames = new Set<string>();
      const workspaceFilesPayload: any[] = [];
      let totalB64Chars = 0;
      const MAX_B64_CHARS = 2_800_000;

      if (currentWs && Array.isArray(currentWs.files)) {
        currentWs.files.forEach((wf: any) => {
          const key = String(wf.name || wf.id || '').trim().toLowerCase();
          if (!key || seenNames.has(key)) return;
          seenNames.add(key);
          let extractedBase64 = wf.fileBase64;
          let extractedMime = wf.fileMimeType;
          if (!extractedBase64 && typeof wf.url === 'string' && wf.url.startsWith('data:') && wf.url.includes(';base64,')) {
            const [header, b64] = wf.url.split(';base64,');
            if (b64 && b64.length < 700000) {
              extractedBase64 = b64;
              extractedMime = extractedMime || header.replace('data:', '');
            }
          }
          if (typeof extractedBase64 === 'string' && totalB64Chars + extractedBase64.length <= MAX_B64_CHARS) {
            totalB64Chars += extractedBase64.length;
          } else {
            extractedBase64 = undefined;
          }
          workspaceFilesPayload.push({
            id: wf.id,
            name: wf.name,
            type: wf.type,
            size: wf.size,
            url: (typeof wf.url === 'string' && !wf.url.startsWith('data:')) ? wf.url : undefined,
            workspaceId: currentWs.id,
            workspaceName: currentWs.name || 'Workspace',
            summary: wf.summary,
            transcription: wf.transcription || wf.contentText || wf.summary,
            contentText: wf.contentText || wf.transcription || wf.summary,
            highlights: wf.highlights,
            fileBase64: extractedBase64,
            fileMimeType: extractedBase64 ? extractedMime : undefined,
            isDirectAttachment: false
          });
        });
      }

      const directAttachedPayload = attachedFiles.map(f => {
        let safeB64 = typeof f.fileBase64 === 'string' ? f.fileBase64 : undefined;
        if (safeB64 && totalB64Chars + safeB64.length <= MAX_B64_CHARS) {
          totalB64Chars += safeB64.length;
        } else {
          safeB64 = undefined;
        }
        return {
          ...f,
          url: (typeof f.url === 'string' && !f.url.startsWith('data:')) ? f.url : undefined,
          fileBase64: safeB64,
          fileMimeType: safeB64 ? f.fileMimeType : undefined,
          workspaceId: targetWsId,
          workspaceName: isGeneralMode ? 'General Study' : (activeWorkspace?.name || 'Workspace'),
          isDirectAttachment: true
        };
      });

      const combinedFiles = [
        ...directAttachedPayload,
        ...workspaceFilesPayload.filter(wf => !directAttachedPayload.some(df => df.name === wf.name))
      ];

      const compactAllWorkspaces = isGeneralMode
        ? []
        : allWorkspacesList.map(ws => ({
            id: ws.id,
            name: ws.name || 'Workspace',
            subject: ws.subject || 'General',
            files: (ws.files || []).map((f: any) => ({
              id: f.id,
              name: f.name,
              type: f.type || 'doc',
              size: f.size,
              pages: f.pages,
              url: (typeof f.url === 'string' && !f.url.startsWith('data:')) ? f.url.slice(0, 500) : undefined,
              summary: typeof f.summary === 'string' ? f.summary.slice(0, 1200) : undefined,
              transcription: typeof (f.transcription || f.contentText) === 'string' ? String(f.transcription || f.contentText).slice(0, 6000) : undefined
            })),
            notes: (ws.notes || []).map((n: any) => ({
              id: n.id,
              title: n.title || 'Study Note',
              content: typeof n.content === 'string' ? n.content.replace(/<[^>]+>/g, ' ').slice(0, 2500) : ''
            })),
            flashcardsCount: (ws.flashcards || []).length,
            quizzesCount: (ws.quizzes || []).length
          }));

      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: textToSend || `Please analyze my attached documents: ${attachedFiles.map(f => f.name).join(', ')}`,
          history,
          persona: 'plain_english',
          deepResearch,
          citationMode,
          workspaceId: targetWsId,
          workspaceName: isGeneralMode ? 'General Study' : (activeWorkspace?.name || 'Workspace'),
          tutorMode: isGeneralMode ? 'general' : 'workspace',
          userId: activeUserId || undefined,
          attachedFiles: combinedFiles,
          allWorkspaces: compactAllWorkspaces,
          model: selectedModel
        })
      });

      let data: any = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
      } else {
        await response.text().catch(() => "");
      }

      if (!response.ok || !data) {
        const errCode = data?.errorCode || `HTTP_${response.status}`;
        const errDetail = data?.error || data?.message || "Service unavailable. Please try again.";
        const errorWithCode: any = new Error(`[${errCode}] ${errDetail}`);
        errorWithCode.code = errCode;
        throw errorWithCode;
      }

      if (typeof window !== 'undefined' && data?.contextResolution) {
        window.dispatchEvent(
          new CustomEvent('studyweb_context_resolution', { detail: data.contextResolution })
        );
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply || data.text || "No response text received.",
        workspaceNotice: data.workspaceNotice || undefined,
        citations: data.citations,
        source: data.source,
        followUpQuestions: Array.isArray(data.followUpQuestions) ? data.followUpQuestions : [],
        suggestOutsideResearch: Boolean(data.suggestOutsideResearch),
        originalQuery: textToSend,
        generatedImageUrl: data.generatedImageUrl,
        generatedImageCaption: data.generatedImageCaption,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      startStreamingMessage(aiMsg);
    } catch (error: any) {
      const errCode = error?.code || 'AI_TUTOR_ERR';
      const cleanError = error?.message && !error.message.includes("<!doctype") && !error.message.includes("<html")
        ? error.message
        : `[${errCode}] Server connection issue`;
      console.error("[AI Tutor Error]", { code: errCode, message: cleanError, error });
      (window as any).showToast?.(cleanError, 'error', 5500, 'AI Tutor Error');

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `⚠️ **AI Tutor Notice**\n\nI was unable to generate a response right now (${cleanError}).`,
        isError: true,
        failedPrompt: textToSend,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsThinking(false);
      setAttachedFiles([]);
    }
  };

  const docInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastFinalTranscriptRef = useRef<string>('');
  const waveformLevels = useMicrophoneWaveform(isListening);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processUploadedFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isImg = file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|svg|bmp)$/.test(lowerName);
    let typeLabel = isImg ? 'image' : lowerName.endsWith('.pdf') ? 'pdf' : 'doc';

    let dataUrl: string | undefined = undefined;
    let fileBase64: string | undefined = undefined;
    let mimeType = file.type || (lowerName.endsWith('.pdf') ? 'application/pdf' : isImg ? 'image/jpeg' : 'application/octet-stream');

    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      if (dataUrl && dataUrl.includes(';base64,')) {
        fileBase64 = dataUrl.split(';base64,')[1];
      }
    } catch {}

    let transcription: string | undefined = undefined;
    if (file.type.startsWith('text/') || lowerName.endsWith('.md') || lowerName.endsWith('.txt') || lowerName.endsWith('.json') || lowerName.endsWith('.csv')) {
      try {
        transcription = await file.text();
      } catch {}
    }

    let summary: string | undefined = undefined;
    let contentText: string | undefined = transcription;
    let highlights: string[] = [];
    let formulas: string[] = [];
    const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('studyweb_active_user_id') : null;
    const fileId = `file-tutor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      const res = await fetch('/api/study-materials/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          materialId: fileId,
          workspaceId: targetWsId,
          userId: activeUserId || undefined,
          name: file.name,
          fileName: file.name,
          type: typeLabel.toLowerCase(),
          fileType: typeLabel,
          size: formatFileSize(file.size),
          fileSize: formatFileSize(file.size),
          url: undefined,
          fileUrl: undefined,
          fileBase64: fileBase64 && fileBase64.length <= 2_800_000 ? fileBase64 : undefined,
          fileMimeType: mimeType,
          content: transcription || '',
          rawText: transcription || ''
        })
      });
      if (res.ok) {
        const parsed = await res.json().catch(() => null);
        const mat = parsed?.material || parsed?.file;
        if (mat) {
          summary = mat.summary || summary;
          transcription = mat.transcription || mat.contentText || transcription;
          contentText = mat.contentText || mat.transcription || contentText;
          if (Array.isArray(mat.highlights)) highlights = mat.highlights;
          if (Array.isArray(mat.formulas)) formulas = mat.formulas;
        }
      } else {
        const errBody = await res.json().catch(() => ({}));
        const errCode = errBody?.errorCode || `HTTP_${res.status}`;
        console.error('[Study Material Upload Error]', { code: errCode, message: errBody?.error || res.statusText });
      }
    } catch (err: any) {
      console.error('[Study Material Upload Error]', err);
    }

    const uploadedFileRecord: any = {
      id: fileId,
      name: file.name,
      type: typeLabel,
      size: formatFileSize(file.size),
      uploadDate: 'Just now',
      status: 'ready',
      url: dataUrl,
      fileBase64,
      fileMimeType: mimeType,
      summary,
      transcription,
      contentText,
      highlights,
      formulas,
      isDirectAttachment: true
    };

    // Persist to activeWorkspace & Supabase
    try {
      const stored = loadStoredWorkspaces(activeUserId) || [];
      const updatedWorkspaces = stored.map((ws: any) => {
        if (ws.id === targetWsId) {
          const existingFiles = Array.isArray(ws.files) ? ws.files.filter((f: any) => f.name !== file.name) : [];
          return { ...ws, files: [uploadedFileRecord, ...existingFiles] };
        }
        return ws;
      });
      saveStoredWorkspaces(updatedWorkspaces, activeUserId);
      if (activeUserId && targetWsId) {
        await WorkspaceSyncService.saveWorkspaceFile(activeUserId, targetWsId, uploadedFileRecord);
      }
    } catch (syncErr) {
      console.error('[Supabase Error][AITutorWorkspace File Persist]', syncErr);
    }

    return uploadedFileRecord;
  };

  const [tutorUploadOverlay, setTutorUploadOverlay] = useState<{
    isOpen: boolean;
    progress: number;
    fileName: string;
    stepText: string;
    fileType: string;
  }>({
    isOpen: false,
    progress: 0,
    fileName: '',
    stepText: '',
    fileType: 'doc'
  });

  const runFilesUploadWithOverlay = async (filesArray: File[]) => {
    if (filesArray.length === 0) return;
    const first = filesArray[0];
    const lower = first.name.toLowerCase();
    const fType = lower.endsWith('.pdf')
      ? 'pdf'
      : lower.match(/\.(png|jpg|jpeg|webp|gif|svg)$/)
      ? 'image'
      : 'doc';

    setTutorUploadOverlay({
      isOpen: true,
      progress: 15,
      fileName: filesArray.length > 1 ? `${first.name} (+${filesArray.length - 1} more)` : first.name,
      stepText: 'Reading & parsing study file...',
      fileType: fType
    });

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      setTutorUploadOverlay(prev => ({
        ...prev,
        progress: Math.min(85, Math.round(((i + 0.5) / filesArray.length) * 70) + 15),
        fileName: file.name,
        stepText: `Extracting content from ${file.name}...`
      }));
      const processed = await processUploadedFile(file);
      setAttachedFiles(prev => {
        if (prev.some(f => f.name === file.name)) return prev;
        return [...prev, processed];
      });
    }

    setTutorUploadOverlay(prev => ({
      ...prev,
      progress: 100,
      stepText: 'Workspace knowledge base updated!'
    }));

    setTimeout(() => {
      setTutorUploadOverlay(prev => ({ ...prev, isOpen: false }));
    }, 2200);

    (window as any).showToast?.(
      `"${filesArray.map(f => f.name).join(', ')}" was uploaded and attached to your AI Tutor session.`,
      'success',
      3200,
      'Material Uploaded & Ready'
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileCategory: 'document' | 'image') => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files) as File[];
    if (filesArray.length === 0) return;
    await runFilesUploadWithOverlay(filesArray);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files) return;
    const filesArray = Array.from(e.dataTransfer.files) as File[];
    if (filesArray.length === 0) return;
    await runFilesUploadWithOverlay(filesArray);
  };

  const startSpeechRecognition = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      setIsListening(false);
      return;
    }

    lastFinalTranscriptRef.current = '';
    audioChunksRef.current = [];

    // 1. Request microphone stream
    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
      }
    } catch (mediaErr) {
      console.warn("Microphone access prompt error:", mediaErr);
      (window as any).showToast?.("Microphone permission required for voice input.", "warning");
      return;
    }

    if (!stream) {
      (window as any).showToast?.("Microphone access is required for voice input.", "warning");
      return;
    }

    // 2. Start MediaRecorder for audio capture
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
          audioStreamRef.current = null;
        }

        const speechCaptured = (lastFinalTranscriptRef.current || inputValue).trim();
        if (speechCaptured) {
          handleSend(speechCaptured);
          lastFinalTranscriptRef.current = '';
          return;
        }

        if (audioChunksRef.current.length > 0) {
          setIsTranscribingVoice(true);
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Data = reader.result as string;
              try {
                const resp = await fetch('/api/voice-transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    audioBase64: base64Data,
                    mimeType: audioBlob.type
                  })
                });
                const json = await resp.json();
                if (json.text && json.text.trim()) {
                  setInputValue(json.text.trim());
                  handleSend(json.text.trim());
                }
              } catch (apiErr) {
                console.error("Transcription API error:", apiErr);
              } finally {
                setIsTranscribingVoice(false);
              }
            };
          } catch (err) {
            console.error("Audio processing error:", err);
            setIsTranscribingVoice(false);
          }
        }
      };

      mediaRecorder.start(250);
      setIsListening(true);
    } catch (recErr) {
      console.warn("Could not start MediaRecorder:", recErr);
    }

    // 3. Web Speech Recognition for live real-time speech preview
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
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
          const spoken = (final || interim).trim();
          if (spoken) {
            setInputValue(spoken);
          }
          if (final.trim()) {
            lastFinalTranscriptRef.current = final.trim();
          }
        };

        recognition.onerror = (err: any) => {
          console.warn("Speech recognition notice:", err?.error || err);
        };

        recognition.onend = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try { mediaRecorderRef.current.stop(); } catch {}
          }
        };

        recognition.start();
      } catch (e) {
        console.warn("Speech recognition failed to initialize:", e);
      }
    }
  };

  return (
    <div className="w-full h-[calc(100dvh-130px)] sm:h-[calc(100dvh-140px)] md:h-[calc(100vh-100px)] min-h-[420px] max-w-full flex flex-row relative bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm text-left">
      {/* Left Sidebar: Attached Materials */}
      <div className="w-72 border-r border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/10 flex flex-col h-full shrink-0 hidden md:flex">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h4 className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">Attached Materials</h4>
          </div>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">
            {attachedFiles.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
          {attachedFiles.length === 0 ? (
            <div className="text-center py-10 px-4">
              <FileUp className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2 animate-pulse" />
              <p className="text-[10px] text-slate-400 font-bold">No documents attached.</p>
              <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">Drag files or click the attachment icon to upload files for deep chunk-level RAG indexing!</p>
            </div>
          ) : (
            attachedFiles.map((file, idx) => {
              const lastAIMsg = [...messages].reverse().find(m => m.sender === 'ai');
              const fileKeyword = file.name.split('.')[0].toLowerCase();
              const isCitedInLastResponse = lastAIMsg?.citations?.some(c => 
                c.sourceName.toLowerCase() === file.name.toLowerCase() ||
                file.name.toLowerCase().includes(c.sourceName.toLowerCase()) ||
                c.sourceName.toLowerCase().includes(file.name.toLowerCase()) ||
                (fileKeyword.length > 4 && c.sourceName.toLowerCase().includes(fileKeyword))
              );

              const matchingCitations = lastAIMsg?.citations?.filter(c => 
                c.sourceName.toLowerCase() === file.name.toLowerCase() ||
                file.name.toLowerCase().includes(c.sourceName.toLowerCase()) ||
                c.sourceName.toLowerCase().includes(file.name.toLowerCase()) ||
                (fileKeyword.length > 4 && c.sourceName.toLowerCase().includes(fileKeyword))
              ) || [];

              return (
                <div 
                  key={idx}
                  onClick={() => {
                    if (matchingCitations.length > 0) {
                      setActiveCitation({
                        sourceName: file.name,
                        page: matchingCitations[0].page,
                        quote: matchingCitations[0].quote
                      });
                    } else {
                      setActiveCitation({
                        sourceName: file.name,
                        quote: `This file is attached. Ask the AI study partner questions or requests for summaries referencing this material.`
                      });
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs flex flex-col gap-1.5 ${
                    isCitedInLastResponse
                      ? 'border-amber-400 dark:border-amber-500/80 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm ring-1 ring-amber-400/30'
                      : 'border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-200 dark:hover:border-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isCitedInLastResponse ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate flex-1 leading-tight">{file.name}</span>
                  </div>

                  {isCitedInLastResponse && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                        <Sparkles className="w-2 h-2" /> Cited
                      </span>
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                        View Citation &rarr;
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full h-full border-r border-slate-100 dark:border-slate-800/60 overflow-hidden">
        {/* Top Controller Bar */}
        <div className="px-3 sm:px-6 py-2 sm:py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {renderWorkspaceLogo('w-7 h-7 sm:w-9 sm:h-9', 'text-base sm:text-lg')}
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5 truncate">
                <span>AI Tutor</span>
                <span className="text-[8.5px] sm:text-[9.5px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                  Autonomous
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block truncate">Academic reasoning & homework solver</p>
            </div>
          </div>

          {/* Workspace controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto max-w-full scrollbar-none py-0.5">

            {/* Focus Timer Button */}
            <button
              onClick={() => setShowFocusTimer(!showFocusTimer)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                showFocusTimer 
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
              title="Toggle integrated Pomodoro study timer"
            >
              <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${timerIsActive ? 'animate-pulse text-rose-500' : 'text-slate-400'}`} />
              <span>Timer</span>
            </button>

            {/* Deep Research mode */}
            <button
              onClick={() => setDeepResearch(!deepResearch)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                deepResearch 
                  ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-200' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="Enable extensive deep-search analysis"
            >
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${deepResearch ? 'bg-indigo-600 animate-ping' : 'bg-slate-300'}`} />
              <span>Deep</span>
            </button>
            
            {/* Semantic Search Toggle */}
            <button
              onClick={() => setShowSemanticSearch(prev => !prev)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                showSemanticSearch
                  ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-200' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="Semantic Search through workspace documents"
            >
              <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Search</span>
            </button>

            {/* Citation Mode */}
            <button
              onClick={() => setCitationMode(!citationMode)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                citationMode 
                  ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-200' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200'
              }`}
            >
              <span>Citations</span>
              {citationMode ? <Check className="w-3 h-3 text-emerald-500" /> : <RefreshCw className="w-2.5 h-2.5 text-slate-400" />}
            </button>

            {/* Clear Chat Button */}
            <button
              onClick={() => handleClearChat(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/50 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 active:scale-95"
              title="Clear current conversation history while keeping workspace open"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>

        {/* Developer-Only Context Resolution Debug Bar */}
        <AITutorContextDebugPanel
          activeWorkspaceId={targetWsId}
          activeWorkspaceName={activeWorkspace?.name || 'Workspace'}
          attachedFiles={attachedFiles}
          allWorkspaces={activeWorkspace ? [activeWorkspace] : []}
        />

        {/* Main Chat Feed */}
        <div
          ref={chatFeedRef}
          className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/5 scroll-smooth"
        >
          {messages.map((msg, msgIdx) => {
            const isMsgStreaming = streamingMsgId === msg.id && msg.sender === 'ai' && !msg.isError;
            const visibleMsgText = isMsgStreaming
              ? (String(msg.text || '').match(/\S+\s*|\n+/g) || [String(msg.text || '')]).slice(0, streamedWordCount).join('')
              : msg.text;
            return (
            <div 
              key={msg.id}
              className={`flex gap-2.5 sm:gap-4 max-w-3xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 flex items-center justify-center flex-shrink-0">
                {msg.sender === 'user' ? (
                  <div className="w-full h-full rounded-[8px] sm:rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[10px] sm:text-xs">
                    ME
                  </div>
                ) : (
                  renderWorkspaceLogo('w-full h-full', 'text-xs sm:text-sm')
                )}
              </div>

              {/* Chat bubble body */}
              <div className={`space-y-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'} max-w-[85%] sm:max-w-none`}>
                <div className={`px-3.5 sm:px-6 py-3 sm:py-5 rounded-[16px] sm:rounded-[20px] text-xs sm:text-[15px] leading-[1.6] sm:leading-[1.65] ${
                  msg.sender === 'user'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-tr-none shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800/60 rounded-tl-none shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)]'
                }`}>
                  {msg.sender === 'ai' && msg.workspaceNotice && (
                    <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Not in uploaded workspace files: </span>
                        <span>{msg.workspaceNotice}</span>
                      </div>
                    </div>
                  )}
                  {/* Simulated Markdown renderer */}
                  <div className="space-y-3 sm:space-y-4 whitespace-pre-wrap break-words">
                    {visibleMsgText.split(/(?=\n\n###|\n\n```|\n\n- )/g).map((block, idx) => {
                      const paragraph = block.trim();
                      if (!paragraph) return null;
                      
                      if (paragraph.startsWith('```')) {
                        const lines = paragraph.split('\n');
                        const lang = lines[0].replace('```', '').trim();
                        const code = lines.slice(1, -1).join('\n') || lines.slice(1).join('\n').replace('```', '');
                        return (
                          <div key={idx} className="bg-slate-900 dark:bg-slate-950 rounded-xl overflow-hidden my-2 sm:my-3 shadow-sm max-w-full">
                            {lang && (
                              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 dark:bg-slate-900 border-b border-slate-700 dark:border-slate-800 text-[11px] font-mono text-slate-400">
                                <span>{lang}</span>
                                <CopySnippetButton text={code} />
                              </div>
                            )}
                            <div className="p-3 sm:p-4 overflow-x-auto scrollbar-none max-w-full">
                              <pre className="font-mono text-xs sm:text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words"><code>{code}</code></pre>
                            </div>
                          </div>
                        );
                      }
                      
                      if (paragraph.startsWith('###')) {
                        return <h4 key={idx} className="font-bold text-slate-900 dark:text-white pt-1 text-base sm:text-lg tracking-tight">{paragraph.replace(/^###\s*/, '').trim()}</h4>;
                      }
                      
                      if (paragraph.startsWith('-')) {
                        return (
                          <ul key={idx} className="list-disc pl-4 sm:pl-5 space-y-1.5 marker:text-indigo-400">
                            {paragraph.split('\n').map((li, liIdx) => {
                              const cleanedLi = li.replace(/^-\s*/, '').trim();
                              if (!cleanedLi) return null;
                              return <li key={liIdx}>{parseTextWithHighlights(cleanedLi, msg.id, msg.citations, hoveredCitation, setHoveredCitation, setActiveCitation)}</li>;
                            })}
                          </ul>
                        );
                      }
                      
                      if (paragraph.startsWith('$')) {
                        return <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl font-mono text-xs sm:text-[13px] overflow-x-auto scrollbar-none text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50 my-2">{paragraph.replace(/\$\$/g, '')}</div>;
                      }
                      
                      // Split by normal paragraphs
                      return (
                        <div key={idx} className="space-y-3 sm:space-y-4">
                          {paragraph.split('\n\n').map((p, pIdx) => {
                             if (!p.trim()) return null;
                             return <p key={pIdx}>{parseTextWithHighlights(p, msg.id, msg.citations, hoveredCitation, setHoveredCitation, setActiveCitation)}</p>;
                          })}
                        </div>
                      );
                    })}
                    {isMsgStreaming && (
                      <span className="inline-block w-2 h-2 ml-1 align-middle rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                    )}
                  </div>

                  {/* Citations block */}
                  {!isMsgStreaming && msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 mt-2.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Citations:</span>
                      {msg.citations.map((cite, idx) => {
                        const citeId = `${msg.id}-${idx}`;
                        return (
                          <div
                            key={idx}
                            className="relative"
                            onMouseEnter={() => setHoveredCitation({
                              id: citeId,
                              sourceName: cite.sourceName,
                              page: cite.page,
                              quote: cite.quote
                            })}
                            onMouseLeave={() => setHoveredCitation(null)}
                          >
                            <button
                              onClick={() => setActiveCitation(cite)}
                              className="px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded transition-all cursor-pointer flex items-center gap-1 text-left"
                            >
                              <FileText className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                              <span>[{idx + 1}] {cite.sourceName.slice(0, 14)}{cite.sourceName.length > 14 ? '...' : ''}</span>
                            </button>

                            <AnimatePresence>
                              {hoveredCitation?.id === citeId && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 sm:w-72 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-xl shadow-xl border border-slate-850 dark:border-slate-800 backdrop-blur-md z-[100] text-[11px] text-left leading-relaxed flex flex-col gap-1.5 cursor-default"
                                >
                                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 mb-1 shrink-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                      <span className="font-extrabold text-[10px] text-slate-200 truncate">{cite.sourceName}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {cite.page !== undefined && (
                                        <span className="font-bold text-[8px] text-amber-400 font-mono bg-amber-500/10 px-1 py-0.5 rounded uppercase tracking-wider">
                                          Page {cite.page}
                                        </span>
                                      )}
                                      <CopySnippetButton text={cite.quote} />
                                    </div>
                                  </div>
                                  <p className="italic font-medium text-slate-300 leading-normal line-clamp-3 relative pl-2 border-l-2 border-indigo-500">
                                    "{cite.quote}"
                                  </p>
                                  <div 
                                    className="text-[10px] text-indigo-400 mt-1 font-bold flex items-center gap-1 cursor-pointer hover:text-indigo-300 transition-colors w-fit"
                                    onClick={(e) => { e.stopPropagation(); setActiveCitation(cite); }}
                                  >
                                    <span>View Source</span>
                                    <span>&rarr;</span>
                                  </div>
                                  {/* Triangle arrow */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95 dark:border-t-slate-950/95" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {msg.sender === 'ai' && msg.generatedImageUrl && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-sm">
                      <img
                        src={msg.generatedImageUrl}
                        alt={msg.generatedImageCaption || 'Generated educational diagram'}
                        className="w-full h-auto max-h-[360px] object-contain bg-slate-950"
                      />
                      <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-300">
                        <span className="font-semibold truncate">
                          {msg.generatedImageCaption || 'AI Tutor Generated Visual Diagram'}
                        </span>
                      </div>
                    </div>
                  )}

                  {msg.isError && msg.failedPrompt && (
                    <div className="pt-2 border-t border-rose-200/50 dark:border-rose-900/50 mt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleSend(msg.failedPrompt!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry question</span>
                      </button>
                    </div>
                  )}

                  {msg.sender === 'ai' && !isMsgStreaming && !msg.isError && msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2.5 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>Suggested Follow-Up Questions</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {msg.followUpQuestions.map((question, qIdx) => (
                          <button
                            key={qIdx}
                            type="button"
                            disabled={isThinking}
                            onClick={() => handleSend(question)}
                            className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-indigo-50/80 dark:bg-slate-800/60 dark:hover:bg-indigo-950/40 border border-slate-200/80 hover:border-indigo-300 dark:border-slate-700/70 dark:hover:border-indigo-500/40 text-xs font-medium text-slate-700 hover:text-indigo-700 dark:text-slate-300 dark:hover:text-indigo-300 transition-all flex items-center justify-between gap-2 group cursor-pointer disabled:opacity-50"
                          >
                            <span className="line-clamp-2 leading-snug">{question}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 px-1 mt-0.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{msg.time}</span>
                  {msg.sender === 'ai' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSpeakTutor(msg.id, msg.text)}
                        className={`text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded-md ${
                          speakingMsgId === msg.id
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 font-bold'
                            : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300'
                        }`}
                        title="Listen to Socratic tutor response aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{speakingMsgId === msg.id ? 'Stop Audio' : 'Listen'}</span>
                      </button>
                      {!msg.isError && (
                        <button
                          type="button"
                          onClick={() => {
                            let prevQuestion: string | undefined = msg.originalQuery;
                            if (!prevQuestion && msgIdx > 0) {
                              for (let i = msgIdx - 1; i >= 0; i--) {
                                if (messages[i]?.sender === 'user' && messages[i]?.text) {
                                  prevQuestion = messages[i].text;
                                  break;
                                }
                              }
                            }
                            triggerNativeDeviceShare({
                              type: 'ai-answer',
                              aiAnswerText: msg.text,
                              questionText: prevQuestion,
                              workspaceName: activeWorkspace?.name || 'AI Tutor',
                              imageUrl: msg.generatedImageUrl,
                              imageCaption: msg.generatedImageCaption,
                            });
                          }}
                          className="text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Share this AI Tutor answer"
                        >
                          <Share2 className="w-3 h-3 text-indigo-500" />
                          <span>Share</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            );
          })}

          {/* Crisp Boxless StudyWeb Brand Logo Subtle Scale Indicator */}
          <AnimatePresence>
            {isThinking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2 }}
                className="flex items-center pl-1 py-2 mr-auto"
                role="status"
                aria-label="Generating response"
              >
                <AITutorAvatar
                  workspace={activeWorkspace}
                  sizeClass="w-7 h-7 sm:w-8 sm:h-8"
                  animateThinking={true}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={chatEndRef} />
        </div>



        {/* Message Input & Attachment Dock */}
        <div className="p-2.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 relative">

          {/* Render attached files summary inside input container */}
          <AnimatePresence>
            {attachedFiles.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 px-1"
              >
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold border border-slate-200 dark:border-slate-700">
                    <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500" />
                    <span className="truncate max-w-[120px] sm:max-w-none">{file.name}</span>
                    <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold ml-1 text-[10px]">&times;</button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Semantic Search UI Overlay */}
          <AnimatePresence>
            {showSemanticSearch && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 w-full mb-2 sm:mb-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-2.5 sm:p-3 shadow-lg flex items-center gap-2 sm:gap-3 z-10"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
                </div>
                <form 
                  onSubmit={(e) => {
                     e.preventDefault();
                     handleSemanticSearch(searchQuery);
                  }}
                  className="flex-1 flex items-center gap-2"
                >
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Search notes & docs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm focus:outline-none text-slate-800 dark:text-white placeholder-slate-400"
                  />
                  <button type="submit" disabled={isSearching || !searchQuery.trim()} className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0">
                    {isSearching ? <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" /> : <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                    <span>{isSearching ? '...' : 'Search'}</span>
                  </button>
                </form>
                <button type="button" onClick={() => setShowSemanticSearch(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex items-center border rounded-2xl overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-indigo-600/20 transition-all px-2 sm:px-3 py-1.5 sm:py-2 max-w-full ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-500/30' 
                : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 focus-within:border-indigo-600 dark:focus-within:border-indigo-500'
            }`}
          >
            {/* File Attachments Trigger */}
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
              title="Attach study documents or PDFs"
            >
              <FileUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
              title="Attach an image of a math problem"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={startSpeechRecognition}
              className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25 animate-pulse'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title={isListening ? "Listening... click to stop and send" : "Voice input: speak your question"}
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Core Input Field */}
            <div className="flex-1 relative flex items-center min-w-0">
              <input
                type="text"
                required={attachedFiles.length === 0}
                placeholder={isDragging ? "Drop files!" : "Ask your AI tutor..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none pr-8 sm:pr-12"
              />
              <AnimatePresence>
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-2 flex items-center gap-0.5 h-4"
                  >
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-red-500 rounded-full origin-bottom"
                        animate={{ height: `${waveformLevels[i]}px` }}
                        transition={{ type: "tween", duration: 0.1 }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>



            {/* Send Action */}
            <button
              type="submit"
              className="p-2 sm:p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow shadow-indigo-600/20 cursor-pointer flex items-center justify-center shrink-0"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </form>

          {/* Hidden native input elements for real uploading */}
          <input
            type="file"
            ref={docInputRef}
            onChange={(e) => handleFileChange(e, 'document')}
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
          />
          <input
            type="file"
            ref={imgInputRef}
            onChange={(e) => handleFileChange(e, 'image')}
            className="hidden"
            multiple
            accept="image/*"
          />

          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2.5 font-medium">
            StudyWeb AI may occasionally misinterpret specific diagram margins. Check critical derivations.
          </p>
        </div>
      </div>

      {/* Right Focus Timer Sidebar Column */}
      <AnimatePresence>
        {showFocusTimer && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="absolute top-0 right-0 bottom-0 z-20 lg:relative lg:z-auto w-[340px] max-w-[85vw] h-full border-l border-slate-100 dark:border-slate-800/80 bg-white/95 lg:bg-slate-50/50 dark:bg-slate-900/95 lg:dark:bg-slate-950/20 backdrop-blur-xl lg:backdrop-blur-none flex flex-col shrink-0 overflow-y-auto custom-scrollbar text-left shadow-2xl lg:shadow-none"
          >
            {/* Sidebar Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-rose-500 animate-pulse" />
                <span className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Focus Desk</span>
              </div>
              <button 
                onClick={() => setShowFocusTimer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Timer Core Panel */}
            <div className="p-5 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-850 shadow-sm text-center space-y-4">
                {/* Mode indicators */}
                <div className="flex justify-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl text-[10px] font-bold">
                  <button 
                    onClick={() => handleSetTimerPreset(25, 'focus')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      timerMode === 'focus' 
                        ? 'bg-rose-500 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Focus (25m)
                  </button>
                  <button 
                    onClick={() => handleSetTimerPreset(5, 'shortBreak')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      timerMode === 'shortBreak' 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Short (5m)
                  </button>
                  <button 
                    onClick={() => handleSetTimerPreset(15, 'longBreak')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      timerMode === 'longBreak' 
                        ? 'bg-sky-500 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Long (15m)
                  </button>
                </div>

                {/* Giant Timer Readout */}
                <div className="py-2">
                  <span className="block font-mono text-5xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                    {formatTimerTime(timerSeconds)}
                  </span>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mt-1">
                    {timerMode === 'focus' ? '🎯 Stay Locked In' : '☕ Refreshing Break'}
                  </p>
                </div>

                {/* Micro Progress Bar */}
                {(() => {
                  const maxSec = timerMode === 'focus' ? 25 * 60 : timerMode === 'shortBreak' ? 5 * 60 : 15 * 60;
                  const percent = ((maxSec - timerSeconds) / maxSec) * 100;
                  const color = timerMode === 'focus' ? 'bg-rose-500' : timerMode === 'shortBreak' ? 'bg-emerald-500' : 'bg-sky-500';
                  return (
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                      <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${percent}%` }} />
                    </div>
                  );
                })()}

                {/* Controls Bar */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setTimerIsActive(false);
                      setTimerSeconds(timerMode === 'focus' ? 25 * 60 : timerMode === 'shortBreak' ? 5 * 60 : 15 * 60);
                    }}
                    className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    title="Reset focus clock"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setTimerIsActive(!timerIsActive)}
                    className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      timerMode === 'focus'
                        ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10'
                        : timerMode === 'shortBreak'
                        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                        : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/10'
                    }`}
                  >
                    {timerIsActive ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Start</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setTimerSoundMuted(!timerSoundMuted)}
                    className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    title={timerSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
                  >
                    {timerSoundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </div>

              {/* Stats & Streaks */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Completed Sprints</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Session Score: {completedCycles} cycles</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <div 
                      key={num} 
                      className={`w-2.5 h-2.5 rounded-full border ${
                        completedCycles >= num 
                          ? 'bg-rose-500 border-rose-600' 
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                      title={`Sprint ${num}`}
                    />
                  ))}
                </div>
              </div>

              {/* Sprint Goal Checklist */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Syllabus Sprint Goals</span>
                </h4>

                <form onSubmit={handleAddGoal} className="flex gap-1.5">
                  <input
                    type="text"
                    value={sessionGoalInput}
                    onChange={(e) => setSessionGoalInput(e.target.value)}
                    placeholder="Add a priority item..."
                    className="flex-1 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg text-xs text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200/50 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {sessionGoals.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2 font-medium">No active focus goals. Add one above!</p>
                  ) : (
                    sessionGoals.map((goal) => (
                      <div 
                        key={goal.id} 
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input 
                            type="checkbox"
                            checked={goal.done}
                            onChange={() => toggleGoal(goal.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className={`text-[11px] truncate font-medium ${goal.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {goal.text}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Ambient Focus Music/Ambiance controller */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Soundscape</p>
                <select
                  value={focusAmbiance}
                  onChange={(e) => setFocusAmbiance(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
                >
                  <option>Deep Focus Lo-Fi</option>
                  <option>Gentle Rain Chords</option>
                  <option>Library Whispers</option>
                  <option>White Noise Fan</option>
                </select>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 italic text-center font-medium">
                  {timerIsActive ? `🔊 Playing ${focusAmbiance}...` : '⏸️ Soundtrack paused'}
                </p>
              </div>

              {/* Quote Widget */}
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center space-y-1">
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 italic leading-relaxed font-semibold">
                  "{focusQuotes[currentQuoteIdx].quote}"
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  — {focusQuotes[currentQuoteIdx].author}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Citation Detail Modal Overlay */}
      <AnimatePresence>
        {activeCitation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveCitation(null)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-left"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-xl flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {activeCitation.sourceName}
                    </h4>
                    {activeCitation.page !== undefined && (
                      <p className="text-[11px] text-slate-500 font-bold mt-0.5">Page {activeCitation.page}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setActiveCitation(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row flex-1 min-h-0">
                {/* Left side: Context details */}
                <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 p-6 bg-slate-50/30 dark:bg-slate-900/50 flex flex-col gap-6 overflow-y-auto">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      Extracted Excerpt
                    </span>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-medium italic relative shadow-inner">
                      <span className="absolute -top-2 left-2 text-3xl font-serif text-amber-500/30 select-none">"</span>
                      <p className="relative z-10 pl-2">{activeCitation.quote}</p>
                    </div>
                  </div>
                  
                  <div className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 mt-auto">
                    <strong className="block text-slate-700 dark:text-slate-300 mb-1">Source Verification</strong>
                    This snippet was dynamically extracted using semantically aligned embeddings. Review the original source document context to ensure full analytical accuracy.
                  </div>
                </div>

                {/* Right side: PDF mock view */}
                <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 md:p-8 overflow-y-auto relative">
                  <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded flex flex-col min-h-full">
                    <div className="h-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center px-4 justify-between text-slate-400 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                      </div>
                      <span className="font-mono text-[10px]">{activeCitation.sourceName.split('/').pop() || 'document.pdf'}</span>
                    </div>
                    <div className="p-8 md:p-12 font-serif text-sm leading-loose text-slate-500 dark:text-slate-400 flex-1">
                      <div className="space-y-4 blur-[2px] opacity-40 select-none">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                      </div>
                      
                      <div className="my-8 space-y-4">
                        <div className="text-xs font-sans text-amber-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Highlighted Match - Page {activeCitation.page || 1}
                        </div>
                        <div className="p-1 -mx-1 bg-amber-200/40 dark:bg-amber-500/20 text-slate-800 dark:text-slate-200 rounded">
                          <p className="font-medium text-[15px]">{activeCitation.quote}</p>
                        </div>
                      </div>

                      <div className="space-y-4 blur-[2px] opacity-40 select-none">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/5" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FullScreenUploadOverlay
        isOpen={tutorUploadOverlay.isOpen}
        progress={tutorUploadOverlay.progress}
        fileName={tutorUploadOverlay.fileName}
        stepText={tutorUploadOverlay.stepText}
        fileType={tutorUploadOverlay.fileType}
      />

      <ShareContentModal
        isOpen={!!shareModalData}
        onClose={() => setShareModalData(null)}
        type="ai-answer"
        aiAnswerText={shareModalData?.answer || ''}
        questionText={shareModalData?.question}
        workspaceName={activeWorkspace?.name || 'AI Tutor'}
      />
    </div>
  );
}
