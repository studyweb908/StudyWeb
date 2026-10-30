import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Mic, 
  Paperclip,
  X,
  RotateCcw, 
  Copy, 
  CheckCircle2, 
  Loader2, 
  ChevronDown, 
  BookOpen, 
  FileText,
  AlertTriangle,
  Globe,
  Volume2,
  VolumeX,
  Square,
  Headphones,
  Play,
  Check,
  Sliders,
  Trash2,
  Link2
} from 'lucide-react';
import { Workspace, WorkspaceFile } from './WorkspaceTypes';
import { useMicrophoneWaveform } from '../../hooks/useMicrophoneWaveform';
import { recordUserActivity } from '../../utils/userActivity';
import { supabase } from '../../lib/supabase';
import { AITutorBackgroundService, getChatHistoryKey } from '../../services/AITutorBackgroundService';
import { WorkspaceChatCache } from '../../services/WorkspaceChatCache';
import { FullScreenUploadOverlay } from './FullScreenUploadOverlay';
import { loadStoredWorkspaces } from '../../utils/workspaceStorage';
import { WorkspaceSyncService } from '../../services/WorkspaceSyncService';
import { toValidUuid } from '../../utils/uuid';

export type TutorPersona = string;

export type VoiceProfileId = 'male' | 'female';

export interface VoiceProfile {
  id: VoiceProfileId;
  name: string;
  genderLabel: string;
  gender: 'male' | 'female';
  geminiVoice: 'Fenrir' | 'Kore';
  description: string;
  icon: string;
  samplePhrase: string;
}

export const VOICE_PROFILES: Record<VoiceProfileId, VoiceProfile> = {
  male: {
    id: 'male',
    name: 'Male Voice',
    genderLabel: 'Male Voice',
    gender: 'male',
    geminiVoice: 'Fenrir',
    description: 'Deep, confident, and authoritative academic mentor',
    icon: '👨‍🏫',
    samplePhrase: "Greetings. Let's break down this concept step-by-step to master it."
  },
  female: {
    id: 'female',
    name: 'Female Voice',
    genderLabel: 'Female Voice',
    gender: 'female',
    geminiVoice: 'Kore',
    description: 'Warm, clear, and articulate academic guide',
    icon: '👩‍🏫',
    samplePhrase: "Hello! I'm your academic tutor. What questions or concepts shall we explore today?"
  }
};

export interface Citation {
  sourceName: string;
  page?: number;
  quote: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  source?: string;
  persona?: TutorPersona;
  citations?: Citation[];
  attachedFileNames?: string[];
  workspaceNotice?: string;
  activeWorkspaceContext?: string;
  activeContextFiles?: string[];
  followUpQuestions?: string[];
  suggestOutsideResearch?: boolean;
  originalQuery?: string;
  generatedImageUrl?: string;
  generatedImageCaption?: string;
  isFileReadyBadge?: boolean;
  readyFileName?: string;
  readyFileType?: string;
  isError?: boolean;
  failedPrompt?: string;
  errorCode?: string | number;
  errorDetails?: string;
}

interface AttachedDraftFile {
  id: string;
  name: string;
  size: string;
  type: string;
  content?: string;
  dataUrl?: string;
  base64?: string;
  mimeType?: string;
  url?: string;
  summary?: string;
  highlights?: string[];
  fileObj?: File;
}

interface WorkspaceChatProps {
  workspace: Workspace;
  workspaces?: Workspace[];
  userId?: string | null;
  onSelectWorkspace?: (ws: Workspace) => void;
  onUpdateWorkspace?: (updated: Workspace) => void;
  onOpenUploadModal?: () => void;
}

export default function WorkspaceChat({
  workspace,
  workspaces,
  userId: propUserId,
  onSelectWorkspace,
  onUpdateWorkspace
}: WorkspaceChatProps) {
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(propUserId || null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (propUserId) setResolvedUserId(propUserId);
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) setResolvedUserId(session.user.id);
        if (session?.access_token) setAccessToken(session.access_token);
      });
    }
  }, [propUserId]);
  // Chat input and state
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState<boolean>(() => AITutorBackgroundService.isWorkspaceThinking(workspace.id));
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showFilesList, setShowFilesList] = useState(false);

  // Attached files for the current pending draft message
  const [attachedDrafts, setAttachedDrafts] = useState<AttachedDraftFile[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputUrl, setLinkInputUrl] = useState('');
  const [isAnalyzingLink, setIsAnalyzingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice dictation state
  const [isListening, setIsListening] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([8, 14, 10]);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastFinalTranscriptRef = useRef<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auditory Feedback (TTS) State
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('study_tutor_auto_speak');
      if (stored !== null) return stored === 'true';
    } catch {}
    return true; // Enabled by default for auditory feedback
  });

  const [selectedVoiceProfile, setSelectedVoiceProfile] = useState<VoiceProfileId>(() => {
    try {
      const stored = localStorage.getItem('study_tutor_voice_profile');
      if (stored === 'male' || stored === 'female') return stored;
    } catch {}
    return 'male'; // Default to Male Voice (1st option)
  });

  const [speechRate, setSpeechRate] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('study_tutor_speech_rate');
      if (stored) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 0.8 && val <= 1.5) return val;
      }
    } catch {}
    return 1.0;
  });

  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<string | null>(null);
  const voiceSettingsRef = useRef<HTMLDivElement>(null);

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [targetLoadingId, setTargetLoadingId] = useState<string | null>(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Full-screen circular upload overlay state for Chat uploads
  const [chatUploadOverlay, setChatUploadOverlay] = useState<{
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

  // Close voice settings on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (voiceSettingsRef.current && !voiceSettingsRef.current.contains(e.target as Node)) {
        setShowVoiceSettings(false);
      }
    };
    if (showVoiceSettings) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showVoiceSettings]);

  // Stop any active speech (both HTML5 audio and browser speech synthesis)
  const stopSpeech = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setSpeakingMessageId(null);
    setTargetLoadingId(null);
    setIsTtsLoading(false);
    setIsPlayingPreview(null);
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  // Natural speech text cleaner: strips markdown headers, bullet symbols, citation tags, and code blocks
  const cleanSpeechText = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/```[\s\S]*?```/g, '') // remove code blocks
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[Source:[^\]]+\]/gi, '') // remove citation source tags
      .replace(/\[\d+:\d+\]/g, '')
      .replace(/#{1,6}\s+/g, '') // remove markdown headings
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
      .replace(/\*(.*?)\*/g, '$1') // remove italics
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/[-*•]\s+/g, '') // remove bullet points
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();
  };

  const speakWithBrowserSynthesis = useCallback((textToSpeak: string, msgId: string, voiceIdOverride?: VoiceProfileId, customRate?: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeakingMessageId(null);
      setIsTtsLoading(false);
      setTargetLoadingId(null);
      setIsPlayingPreview(null);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak.slice(0, 1500));
      
      const targetProfile = VOICE_PROFILES[voiceIdOverride || selectedVoiceProfile] || VOICE_PROFILES.male;
      const targetGender = targetProfile.gender;

      const voices = window.speechSynthesis.getVoices() || [];
      let matchedVoice: SpeechSynthesisVoice | undefined;

      if (targetGender === 'female') {
        matchedVoice = voices.find(v => 
          v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Zira') || v.name.includes('Victoria') || (v.name.includes('Google') && v.name.includes('Female')) || v.name.includes('Female'))
        );
      } else {
        matchedVoice = voices.find(v => 
          v.lang.startsWith('en') && (v.name.includes('Daniel') || v.name.includes('Alex') || v.name.includes('David') || v.name.includes('George') || (v.name.includes('Google') && v.name.includes('Male')) || v.name.includes('Male'))
        );
      }

      const naturalVoice = matchedVoice || voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.rate = customRate || speechRate || 1.0;
      utterance.pitch = targetGender === 'female' ? 1.04 : 0.95;

      utterance.onstart = () => {
        setSpeakingMessageId(msgId);
        setIsTtsLoading(false);
        setTargetLoadingId(null);
      };

      utterance.onend = () => {
        setSpeakingMessageId(prev => prev === msgId ? null : prev);
        setIsPlayingPreview(null);
      };

      utterance.onerror = () => {
        setSpeakingMessageId(prev => prev === msgId ? null : prev);
        setIsTtsLoading(false);
        setTargetLoadingId(null);
        setIsPlayingPreview(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingMessageId(null);
      setIsTtsLoading(false);
      setTargetLoadingId(null);
      setIsPlayingPreview(null);
    }
  }, [selectedVoiceProfile, speechRate]);

  const handleSpeakMessage = useCallback(async (msgId: string, text: string, persona?: TutorPersona, voiceProfileOverride?: VoiceProfileId) => {
    // If currently speaking this message, clicking again toggles pause/stop
    if (speakingMessageId === msgId) {
      stopSpeech();
      return;
    }

    stopSpeech();
    const cleanText = cleanSpeechText(text);
    if (!cleanText) return;

    setTargetLoadingId(msgId);
    setIsTtsLoading(true);

    const activeProfile = VOICE_PROFILES[voiceProfileOverride || selectedVoiceProfile] || VOICE_PROFILES.male;

    try {
      // 1. Try high-fidelity Gemini 3.8 Flash Lite TTS endpoint
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6500);

      const res = await fetch('/api/ai-tutor-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voiceName: activeProfile.geminiVoice
        }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success && data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          audio.playbackRate = speechRate || 1.0;
          currentAudioRef.current = audio;

          audio.onplay = () => {
            setSpeakingMessageId(msgId);
            setIsTtsLoading(false);
            setTargetLoadingId(null);
          };

          audio.onended = () => {
            setSpeakingMessageId(prev => prev === msgId ? null : prev);
            currentAudioRef.current = null;
            setIsPlayingPreview(null);
          };

          audio.onerror = () => {
            currentAudioRef.current = null;
            speakWithBrowserSynthesis(cleanText, msgId, activeProfile.id, speechRate);
          };

          await audio.play();
          return;
        }
      }

      speakWithBrowserSynthesis(cleanText, msgId, activeProfile.id, speechRate);
    } catch {
      speakWithBrowserSynthesis(cleanText, msgId, activeProfile.id, speechRate);
    }
  }, [speakingMessageId, stopSpeech, selectedVoiceProfile, speechRate, speakWithBrowserSynthesis]);

  // Preview a voice profile sample phrase
  const handlePreviewVoice = (vProfile: VoiceProfile) => {
    if (speakingMessageId === `preview-${vProfile.id}`) {
      stopSpeech();
      setIsPlayingPreview(null);
      return;
    }
    setIsPlayingPreview(vProfile.id);
    handleSpeakMessage(`preview-${vProfile.id}`, vProfile.samplePhrase, 'socratic', vProfile.id);
  };

  // Animated soundwave pulses while listening
  useEffect(() => {
    let interval: any = null;
    if (isListening) {
      interval = setInterval(() => {
        setWaveformLevels([
          Math.floor(Math.random() * 14) + 6,
          Math.floor(Math.random() * 20) + 8,
          Math.floor(Math.random() * 16) + 6,
        ]);
      }, 140);
    } else {
      setWaveformLevels([8, 14, 10]);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  // Aggregate all user workspaces (props + local cache fallback) so the AI Tutor sees every workspace and uploaded item
  const allUserWorkspaces = useMemo(() => {
    const wsMap = new Map<string, Workspace>();
    const stored = loadStoredWorkspaces(resolvedUserId) || [];
    const storedGuest = resolvedUserId ? (loadStoredWorkspaces(null) || []) : [];

    const mergeIntoMap = (ws: Workspace) => {
      if (!ws || !ws.id) return;
      const existing = wsMap.get(ws.id);
      if (!existing) {
        wsMap.set(ws.id, ws);
      } else {
        const fileMap = new Map<string, WorkspaceFile>();
        [...(existing.files || []), ...(ws.files || [])].forEach(f => {
          if (!f) return;
          const key = String(f.id || f.name || '').trim().toLowerCase();
          const dupByName = Array.from(fileMap.values()).find(
            ef => ef.name && f.name && ef.name.trim().toLowerCase() === f.name.trim().toLowerCase()
          );
          if (dupByName) {
            const dupKey = String(dupByName.id || dupByName.name || '').trim().toLowerCase();
            fileMap.set(dupKey, {
              ...dupByName,
              ...f,
              summary: f.summary || dupByName.summary,
              transcription: f.transcription || dupByName.transcription,
              contentText: f.contentText || dupByName.contentText
            });
          } else if (key) {
            fileMap.set(key, f);
          }
        });

        const noteMap = new Map<string, any>();
        [...(existing.notes || []), ...(ws.notes || [])].forEach(n => {
          if (!n) return;
          const key = String(n.id || n.title || '').trim().toLowerCase();
          if (key) noteMap.set(key, n);
        });

        wsMap.set(ws.id, {
          ...existing,
          ...ws,
          files: Array.from(fileMap.values()),
          notes: Array.from(noteMap.values()),
          flashcards: (ws.flashcards && ws.flashcards.length > 0) ? ws.flashcards : (existing.flashcards || []),
          quizzes: (ws.quizzes && ws.quizzes.length > 0) ? ws.quizzes : (existing.quizzes || [])
        });
      }
    };

    storedGuest.forEach(mergeIntoMap);
    stored.forEach(mergeIntoMap);
    (workspaces || []).forEach(mergeIntoMap);
    if (workspace) mergeIntoMap(workspace);

    return Array.from(wsMap.values());
  }, [workspace, workspaces, resolvedUserId]);

  // Clean files list strictly scoped to the ACTIVE workspace so other workspaces (e.g. biology/cell) never bleed in
  const activeFiles = useMemo(() => {
    const seenKeys = new Set<string>();
    const rawFiles: Array<WorkspaceFile & { workspaceId?: string; workspaceName?: string }> = [];

    const pushFilesFromWorkspace = (ws: Workspace) => {
      (ws.files || []).forEach(f => {
        if (!f) return;
        const nameKey = String(f.name || f.id || '').trim().toLowerCase();
        if (!nameKey || seenKeys.has(nameKey)) return;
        seenKeys.add(nameKey);
        rawFiles.push({
          ...f,
          workspaceId: ws.id,
          workspaceName: ws.name || 'Workspace'
        });
      });
    };

    // Only include files belonging to the current active workspace
    if (workspace) {
      pushFilesFromWorkspace(workspace);
      const matchingSyncedWs = allUserWorkspaces.find(ws => ws.id === workspace.id);
      if (matchingSyncedWs) {
        pushFilesFromWorkspace(matchingSyncedWs);
      }
    }

    const isDummyStr = (s?: string) => {
      if (!s) return true;
      const lower = s.toLowerCase();
      return (
        lower.includes("comprehensively outlines") ||
        lower.includes("foundational definitions") ||
        lower.includes("critical frameworks") ||
        lower.includes("structural analysis") ||
        lower.includes("direct watch & in-app embed available") ||
        lower.includes("high-yield academic study guide for") ||
        lower.includes("uploaded and indexed into your workspace") ||
        lower.includes("ready for study questions") ||
        lower.includes("ready for ai tutor questions") ||
        lower.includes("uploaded to workspace") ||
        lower.includes("youtube is currently blocking us") ||
        lower.includes("preventing us from generating a summary") ||
        lower.includes("key takeaway 1") ||
        lower.includes("key takeaway 2") ||
        lower.includes("key takeaway 3") ||
        lower.includes("key take down") ||
        lower.includes("**channel:**") ||
        lower.includes("**duration:**") ||
        lower.includes("**direct video link:**") ||
        lower.includes("enjoy the videos") ||
        lower.includes("enjoy the videos and music you love") ||
        lower.includes("upload original content, and share it all") ||
        lower.includes("and the world on youtube") ||
        lower.includes("document 1246") ||
        lower.startsWith("mix -") ||
        lower.includes("youtube mix")
      );
    };

    const cleanMultiline = (text?: string) => {
      if (!text) return undefined;
      const filtered = text
        .split('\n')
        .filter(line => !isDummyStr(line))
        .join('\n')
        .trim();
      return filtered || undefined;
    };

    return rawFiles.map(f => {
      const cleanSummary = isDummyStr(f.summary)
        ? undefined
        : cleanMultiline(f.summary);
      const cleanHighlights = (f.highlights || []).filter((h: string) => h && !isDummyStr(h));
      const cleanTranscription = cleanMultiline(f.transcription || f.contentText);

      let hydratedBase64 = f.fileBase64;
      let hydratedMime = f.fileMimeType;
      if (!hydratedBase64 && typeof f.url === 'string' && f.url.startsWith('data:')) {
        const m = f.url.match(/^data:([^;]+);base64,(.+)$/);
        if (m) {
          hydratedMime = hydratedMime || m[1];
          hydratedBase64 = m[2];
        }
      }

      return {
        ...f,
        fileBase64: hydratedBase64,
        fileMimeType: hydratedMime,
        summary: cleanSummary || '',
        highlights: cleanHighlights,
        transcription: cleanTranscription
      };
    });
  }, [workspace, allUserWorkspaces]);

  const chatHistoryKey = `study_chat_history_${resolvedUserId || 'guest'}_${workspace.id}`;
  const prevWorkspaceIdRef = useRef<string>(workspace.id);

  const buildWelcomeMessage = useCallback((isReset = false): Message => {
    const hasDocs = activeFiles.length > 0;
    if (isReset) {
      return {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: hasDocs
          ? `✨ **Fresh Conversation Started!**\n\nI have **${activeFiles.length} study document${activeFiles.length === 1 ? '' : 's'}** ready in your workspace. What would you like to explore or ask about today?`
          : `✨ **Fresh Conversation Started!**\n\nWhat would you like to learn, solve, or explore right now?`,
        time: 'Just now'
      };
    }
    return {
      id: 'welcome-msg',
      sender: 'ai',
      text: hasDocs
        ? `👋 **Hi! I'm your AI Study Tutor${workspace.id !== 'general-study' ? ` for ${workspace.name}` : ''}!**\n\nI have your **${activeFiles.length} study document${activeFiles.length === 1 ? '' : 's'}** ready in this workspace. Ask me any question, speak using the **Voice** button, or attach documents with the **Attach** button!`
        : `👋 **Hi! I'm your AI Study Tutor!**\n\nAsk me any question about your studies, homework, or concepts. You can type, speak using **Voice Input**, or attach study materials using **Attach** to get started!`,
      time: 'Just now'
    };
  }, [activeFiles.length, workspace.id, workspace.name]);

  const isLegacyDummyMessage = (m: Message): boolean => {
    const t = String(m.text || '');
    return (
      t.includes('Addressing your question directly, the primary focus is understanding the underlying principles') ||
      t.includes('Every component interacts systematically. In study problems of this nature') ||
      t.includes('Identify the key relationship or concept asked in') ||
      t.includes('Interactive Concept Sandbox') ||
      t.includes("I'm ready in **")
    );
  };

  // Persistent conversation messages
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(chatHistoryKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleanMsgs = parsed.filter((m: Message) => !m.isError && !isLegacyDummyMessage(m));
          if (cleanMsgs.length > 0) return cleanMsgs;
        }
      }
    } catch {}

    const hasDocs = activeFiles.length > 0;
    return [{
      id: 'welcome-msg',
      sender: 'ai',
      text: hasDocs
        ? `👋 **Hi! I'm your AI Study Tutor${workspace.id !== 'general-study' ? ` for ${workspace.name}` : ''}!**\n\nI have your **${activeFiles.length} study document${activeFiles.length === 1 ? '' : 's'}** ready in this workspace. Ask me any question, speak using the **Voice** button, or attach documents with the **Attach** button!`
        : `👋 **Hi! I'm your AI Study Tutor!**\n\nAsk me any question about your studies, homework, or concepts. You can type, speak using **Voice Input**, or attach study materials using **Attach** to get started!`,
      time: 'Just now'
    }];
  });

  // When switching workspaces to open a new chat, delete older chat history and start fresh
  // (Ignore initial hydration transition from fallback 'general-study' so startup never flashes or wipes)
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== workspace.id) {
      const wasInitialFallback = prevWorkspaceIdRef.current === 'general-study';
      prevWorkspaceIdRef.current = workspace.id;
      if (!wasInitialFallback) {
        const freshWelcome = [buildWelcomeMessage(false)];
        AITutorBackgroundService.resetWorkspaceChat(workspace.id, resolvedUserId, freshWelcome as any);
        setMessages(freshWelcome);
        setInputValue('');
        setAttachedDrafts([]);
        setIsThinking(false);
        return;
      }
    }

    try {
      const stored = localStorage.getItem(chatHistoryKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleanMsgs = parsed.filter((m: Message) => !m.isError && !isLegacyDummyMessage(m));
          if (cleanMsgs.length > 0) {
            setMessages(cleanMsgs);
            return;
          }
        }
      }
    } catch {}
    setMessages([buildWelcomeMessage(false)]);
  }, [chatHistoryKey, workspace.id, resolvedUserId, buildWelcomeMessage]);

  // Listen for background AI Tutor query events, chat resets, and window focus/visibility changes
  useEffect(() => {
    const handleStatusChange = () => {
      const thinking = AITutorBackgroundService.isWorkspaceThinking(workspace.id);
      setIsThinking(thinking);
    };

    const handleMessageCompleted = (e: any) => {
      const detail = e.detail;
      if (!detail || detail.workspaceId !== workspace.id) return;
      const newMsg = detail.message;
      if (!newMsg) return;

      setIsThinking(false);
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (autoSpeak && !newMsg.isError) {
        handleSpeakMessage(newMsg.id, newMsg.text);
      }
    };

    const handleChatReset = (e: any) => {
      const detail = e.detail;
      const resetMsgs = Array.isArray(detail?.messages) && detail.messages.length > 0
        ? detail.messages
        : [buildWelcomeMessage(true)];
      setIsThinking(false);
      setInputValue('');
      setAttachedDrafts([]);
      setMessages(resetMsgs);
    };

    const handleVisibilityOrFocus = () => {
      try {
        const stored = localStorage.getItem(chatHistoryKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleanMsgs = parsed.filter((m: Message) => !m.isError && !isLegacyDummyMessage(m));
            if (cleanMsgs.length > 0) setMessages(cleanMsgs);
          }
        }
      } catch {}
      setIsThinking(AITutorBackgroundService.isWorkspaceThinking(workspace.id));
    };

    const handleFileReadyEvent = (e: any) => {
      const detail = e.detail;
      if (!detail || detail.workspaceId !== workspace.id) return;
      const readyFiles = Array.isArray(detail.files) ? detail.files : [];
      if (readyFiles.length === 0) return;

      const badgeMessages: Message[] = readyFiles.map((f: any, idx: number) => ({
        id: `file-ready-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'ai',
        text: `File ready: ${f.name || 'Study Material'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFileReadyBadge: true,
        readyFileName: f.name || 'Study Material',
        readyFileType: f.type || 'doc'
      }));

      setMessages(prev => [...prev, ...badgeMessages]);
    };

    window.addEventListener('studyweb-tutor-status-change', handleStatusChange);
    window.addEventListener('studyweb-tutor-message-completed', handleMessageCompleted);
    window.addEventListener('studyweb-tutor-chat-reset', handleChatReset);
    window.addEventListener('studyweb-workspace-file-ready', handleFileReadyEvent);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Initial check on mount or workspace update
    handleStatusChange();

    return () => {
      window.removeEventListener('studyweb-tutor-status-change', handleStatusChange);
      window.removeEventListener('studyweb-tutor-message-completed', handleMessageCompleted);
      window.removeEventListener('studyweb-tutor-chat-reset', handleChatReset);
      window.removeEventListener('studyweb-workspace-file-ready', handleFileReadyEvent);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [workspace.id, chatHistoryKey, autoSpeak, handleSpeakMessage, buildWelcomeMessage]);

  // Keep WorkspaceChatCache and localStorage synchronized with current messages
  useEffect(() => {
    try {
      if (messages.length > 0) {
        WorkspaceChatCache.saveMessages(workspace.id, resolvedUserId, messages as any);
      }
    } catch {}
  }, [messages, workspace.id, resolvedUserId]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, attachedDrafts]);

  // Record AI Tutor session entry in real time
  useEffect(() => {
    recordUserActivity({
      title: 'Used AI Tutor',
      detail: `Study session with AI Tutor in ${workspace.name}`,
      iconType: 'tutor'
    }, resolvedUserId);
  }, [workspace.id, resolvedUserId]);

  // Clear chat thread ("Clear Chat"): completely delete older chat from cache & storage while keeping workspace open
  const handleResetChat = () => {
    stopSpeech();
    setInputValue('');
    setAttachedDrafts([]);
    setIsThinking(false);
    const freshWelcome = [buildWelcomeMessage(true)];
    AITutorBackgroundService.resetWorkspaceChat(workspace.id, resolvedUserId, freshWelcome as any);
    setMessages(freshWelcome);

    // Explicitly notify backend server to clear conversation history in Gemini API session
    try {
      fetch('/api/ai-tutor-clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          userId: resolvedUserId
        })
      }).catch(() => {});
    } catch {}

    (window as any).showToast?.(
      'Your conversation history has been wiped clean in the backend and frontend. You can start a completely fresh topic with zero residual memory.',
      'info',
      3400,
      'Chat History Cleared'
    );
  };

  // File Attachment Handlers with deep binary & text reading, AI Vision analysis, and Supabase persistence
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    const lowerFirst = firstFile.name.toLowerCase();
    const detectedType = lowerFirst.endsWith('.pdf')
      ? 'pdf'
      : lowerFirst.match(/\.(png|jpg|jpeg|webp|gif|svg|bmp)$/)
      ? 'image'
      : lowerFirst.match(/\.(mp4|webm|mov|mkv)$/)
      ? 'video'
      : 'doc';

    setChatUploadOverlay({
      isOpen: true,
      progress: 12,
      fileName: files.length > 1 ? `${firstFile.name} (+${files.length - 1} more)` : firstFile.name,
      stepText: 'Reading document binary & text stream...',
      fileType: detectedType
    });

    const newDrafts: AttachedDraftFile[] = [];
    const analyzedWorkspaceFiles: WorkspaceFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let content: string | undefined = undefined;
      let dataUrl: string | undefined = undefined;
      let base64: string | undefined = undefined;
      let mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

      const lower = file.name.toLowerCase();
      const fileType: WorkspaceFile['type'] = lower.endsWith('.pdf')
        ? 'pdf'
        : (file.type.startsWith('image/') || lower.match(/\.(png|jpg|jpeg|webp|gif|svg|bmp)$/))
        ? 'image'
        : (file.type.startsWith('video/') || lower.match(/\.(mp4|webm|mov|mkv)$/))
        ? 'video'
        : 'doc';

      setChatUploadOverlay(prev => ({
        ...prev,
        progress: Math.min(55, Math.round(((i + 0.3) / files.length) * 50) + 15),
        fileName: file.name,
        stepText: `Reading ${file.name}...`
      }));

      // 1. Read as Data URL (base64) and compress images so they persist cleanly to Supabase
      try {
        const rawDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        if (fileType === 'image' && rawDataUrl.startsWith('data:image/') && rawDataUrl.length > 320_000) {
          const compressed = await new Promise<{ dataUrl: string; base64: string; mimeType: string }>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const maxDim = 1500;
              let w = img.width || 1200;
              let h = img.height || 900;
              if (w > maxDim || h > maxDim) {
                if (w >= h) {
                  h = Math.round((h * maxDim) / w);
                  w = maxDim;
                } else {
                  w = Math.round((w * maxDim) / h);
                  h = maxDim;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve({ dataUrl: rawDataUrl, base64: rawDataUrl.split(';base64,')[1] || '', mimeType });
                return;
              }
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, w, h);
              ctx.drawImage(img, 0, 0, w, h);
              let outUrl = canvas.toDataURL('image/jpeg', 0.82);
              if (outUrl.length > 420_000) {
                outUrl = canvas.toDataURL('image/jpeg', 0.65);
              }
              resolve({ dataUrl: outUrl, base64: outUrl.split(';base64,')[1] || '', mimeType: 'image/jpeg' });
            };
            img.onerror = () => resolve({ dataUrl: rawDataUrl, base64: rawDataUrl.split(';base64,')[1] || '', mimeType });
            img.src = rawDataUrl;
          });
          dataUrl = compressed.dataUrl;
          base64 = compressed.base64;
          mimeType = compressed.mimeType;
        } else {
          dataUrl = rawDataUrl;
          if (dataUrl && dataUrl.includes(';base64,')) {
            base64 = dataUrl.split(';base64,')[1];
          }
        }
      } catch (err: any) {
        console.error('[Chat File Read Error] [CHAT_FILE_READ_ERR]', err);
        (window as any).showToast?.(`[CHAT_FILE_READ_ERR] ${err?.message || 'Could not read file'}`, 'error', 5000, 'File Read Error');
      }

      // 2. Read text content for common textual formats
      if (
        file.type.startsWith('text/') || 
        file.name.endsWith('.md') || 
        file.name.endsWith('.txt') || 
        file.name.endsWith('.json') || 
        file.name.endsWith('.csv') ||
        file.name.endsWith('.tex')
      ) {
        try {
          content = await file.text();
        } catch {}
      }

      const formattedSize = `${Math.max(1, Math.round(file.size / 1024))} KB`;

      // 3. Analyze with Gemini Vision / Study Material Pipeline and persist to Supabase immediately
      setChatUploadOverlay(prev => ({
        ...prev,
        progress: Math.min(88, Math.round(((i + 0.7) / files.length) * 75) + 15),
        fileName: file.name,
        stepText: `Analyzing ${file.name} with AI & saving to Supabase...`
      }));

      let analyzedMaterial: any = null;
      try {
        const abortCtrl = new AbortController();
        const tId = setTimeout(() => abortCtrl.abort(), 45000);
        const procRes = await fetch('/api/study-materials/process', {
          method: 'POST',
          credentials: 'same-origin',
          signal: abortCtrl.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({
            workspaceId: toValidUuid(workspace.id),
            userId: resolvedUserId || undefined,
            name: file.name,
            type: fileType,
            size: formattedSize,
            content: content || undefined,
            url: dataUrl && dataUrl.length < 420_000 ? dataUrl : undefined,
            fileBase64: base64 || undefined,
            fileMimeType: mimeType || undefined
          })
        });
        clearTimeout(tId);

        if (procRes.ok) {
          const procData = await procRes.json();
          analyzedMaterial = procData.material;
        } else {
          const errJson = await procRes.json().catch(() => ({}));
          const errCode = errJson?.errorCode || `HTTP_${procRes.status}`;
          const errMsg = errJson?.error || `Failed to analyze ${file.name}`;
          console.error(`[Chat Upload Pipeline Error] [${errCode}] ${errMsg}`, errJson);
          (window as any).showToast?.(`[${errCode}] ${errMsg}`, 'error', 5500, 'AI Upload Error');
        }
      } catch (procErr: any) {
        const errCode = procErr?.name === 'AbortError' ? 'AI_UPLOAD_TIMEOUT' : 'AI_UPLOAD_ERR';
        console.error(`[Chat Upload Pipeline Error] [${errCode}]`, procErr);
        (window as any).showToast?.(`[${errCode}] ${procErr?.message || 'AI analysis error'}`, 'error', 5500, 'AI Upload Error');
      }

      const extractedSummary = analyzedMaterial?.summary || (content ? content.slice(0, 1000) : '');
      const extractedTranscript = analyzedMaterial?.transcription || analyzedMaterial?.contentText || content;
      const extractedHighlights = Array.isArray(analyzedMaterial?.highlights) && analyzedMaterial.highlights.length > 0
        ? analyzedMaterial.highlights
        : (content ? [content.slice(0, 300)] : []);
      const resolvedName = analyzedMaterial?.name || file.name;

      newDrafts.push({
        id: analyzedMaterial?.id || `draft-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name: resolvedName,
        size: formattedSize,
        type: fileType,
        content: extractedTranscript,
        summary: extractedSummary,
        highlights: extractedHighlights,
        dataUrl,
        base64,
        mimeType,
        fileObj: file
      });

      const wsFileObj: WorkspaceFile = {
        id: analyzedMaterial?.id || toValidUuid(`file-${Date.now()}-${i}`),
        name: resolvedName,
        size: formattedSize,
        type: fileType,
        uploadDate: new Date().toISOString(),
        status: 'indexed',
        tags: Array.isArray(analyzedMaterial?.tags) && analyzedMaterial.tags.length > 0 ? analyzedMaterial.tags : ['Chat Upload'],
        summary: extractedSummary,
        transcription: extractedTranscript,
        contentText: extractedTranscript,
        url: dataUrl || analyzedMaterial?.url,
        fileBase64: base64,
        fileMimeType: mimeType,
        highlights: extractedHighlights,
        formulas: analyzedMaterial?.formulas
      };

      analyzedWorkspaceFiles.push(wsFileObj);
      WorkspaceSyncService.saveWorkspaceFile(workspace.id, wsFileObj, resolvedUserId || undefined).catch((syncErr) => {
        console.error('[Supabase Error][ChatUploadSync]', syncErr);
      });
    }

    setChatUploadOverlay(prev => ({
      ...prev,
      progress: 96,
      stepText: 'Indexing into active workspace knowledge graph...'
    }));

    await new Promise(resolve => setTimeout(resolve, 120));

    setAttachedDrafts(prev => [...prev, ...newDrafts]);
    if (analyzedWorkspaceFiles.length > 0) {
      if (onUpdateWorkspace) {
        const updatedWs = {
          ...workspace,
          files: [
            ...analyzedWorkspaceFiles,
            ...(workspace.files || []).filter(ef => !analyzedWorkspaceFiles.some(af => af.id === ef.id || af.name === ef.name))
          ]
        };
        onUpdateWorkspace(updatedWs);
        WorkspaceSyncService.saveWorkspace(updatedWs, resolvedUserId || undefined).catch(() => {});
      }

      const readyBadges: Message[] = analyzedWorkspaceFiles.map((d, idx) => ({
        id: `file-ready-${Date.now()}-${idx}`,
        sender: 'ai',
        text: `File ready: ${d.name}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFileReadyBadge: true,
        readyFileName: d.name,
        readyFileType: d.type
      }));
      setMessages(prev => [...prev, ...readyBadges]);

      setChatUploadOverlay(prev => ({
        ...prev,
        progress: 100,
        stepText: 'Analyzed & saved to Supabase!'
      }));

      setTimeout(() => {
        setChatUploadOverlay(prev => ({ ...prev, isOpen: false }));
      }, 240);

      (window as any).showToast?.(
        `"${analyzedWorkspaceFiles.map(f => f.name).join(', ')}" was analyzed with AI and saved to Supabase.`,
        'success',
        3200,
        'Material Analyzed & Saved'
      );
    } else {
      setChatUploadOverlay(prev => ({ ...prev, isOpen: false }));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachedDraft = (id: string) => {
    setAttachedDrafts(prev => prev.filter(f => f.id !== id));
  };

  // Attach YouTube Video or Web Link directly in Chat with NotebookLM-style automatic naming & full transcript analysis
  const handleAttachLink = async () => {
    const rawUrl = linkInputUrl.trim();
    if (!rawUrl || isAnalyzingLink) return;
    const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const isYt = /(?:youtube\.com|youtu\.be)/i.test(normalizedUrl);

    setIsAnalyzingLink(true);
    setChatUploadOverlay({
      isOpen: true,
      progress: 18,
      fileName: isYt ? 'YouTube Video Resource' : normalizedUrl,
      stepText: isYt ? 'Extracting video transcript & chapters...' : 'Scraping webpage study content...',
      fileType: isYt ? 'video' : 'doc'
    });

    const progInterval = setInterval(() => {
      setChatUploadOverlay(prev => ({
        ...prev,
        progress: prev.progress < 88 ? prev.progress + 12 : prev.progress
      }));
    }, 180);

    try {
      let analyzedTitle = '';
      let fullText = '';
      let summaryText = '';
      let highlightsList: string[] = [];

      if (isYt) {
        const res = await fetch('/api/fetch-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: normalizedUrl })
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data) {
            analyzedTitle = (data.title || '').trim();
            fullText = (data.transcript || data.summary || '').trim();
            summaryText = (data.summary || '').trim();
            if (Array.isArray(data.highlights)) highlightsList = data.highlights;
          }
        }
      } else {
        const res = await fetch('/api/scrape-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: normalizedUrl })
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data) {
            analyzedTitle = (data.title || '').trim();
            fullText = (data.content || data.summary || '').trim();
            summaryText = (data.summary || '').trim();
            if (Array.isArray(data.highlights)) highlightsList = data.highlights;
          }
        }
      }

      if (!analyzedTitle || analyzedTitle.startsWith('http')) {
        analyzedTitle = isYt ? 'YouTube Video Study Guide' : 'Web Study Resource';
      }

      const newDraft: AttachedDraftFile = {
        id: `draft-link-${Date.now()}`,
        name: analyzedTitle,
        size: isYt ? 'Full Video' : 'Web Article',
        type: isYt ? 'video' : 'doc',
        url: normalizedUrl,
        content: fullText || summaryText || `Analyzed Source: ${analyzedTitle} (${normalizedUrl})`,
        summary: summaryText || fullText.slice(0, 1200),
        highlights: highlightsList
      };

      setAttachedDrafts(prev => [...prev, newDraft]);
      setLinkInputUrl('');
      setShowLinkInput(false);

      // Save analyzed link into workspace and show compact File Ready badge in chat without summarizing
      if (onUpdateWorkspace) {
        const wsLinkFile: WorkspaceFile = {
          id: `file-link-${Date.now()}`,
          name: analyzedTitle,
          size: newDraft.size,
          type: isYt ? 'video' : 'doc',
          uploadDate: new Date().toISOString(),
          status: 'indexed',
          tags: [isYt ? 'Video Study Guide' : 'Web Resource'],
          summary: newDraft.summary,
          transcription: newDraft.content,
          url: normalizedUrl,
          highlights: highlightsList
        };
        onUpdateWorkspace({
          ...workspace,
          files: [wsLinkFile, ...(workspace.files || [])]
        });
      }

      setMessages(prev => [
        ...prev,
        {
          id: `file-ready-link-${Date.now()}`,
          sender: 'ai',
          text: `Link ready: ${analyzedTitle}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isFileReadyBadge: true,
          readyFileName: analyzedTitle,
          readyFileType: isYt ? 'video' : 'url'
        }
      ]);

      clearInterval(progInterval);
      setChatUploadOverlay(prev => ({
        ...prev,
        fileName: analyzedTitle,
        progress: 100,
        stepText: 'Workspace knowledge base updated!'
      }));
      setTimeout(() => {
        setChatUploadOverlay(prev => ({ ...prev, isOpen: false }));
      }, 260);

      (window as any).showToast?.(
        `"${analyzedTitle}" is indexed & ready in your workspace.`,
        'success',
        3200,
        'Video / Link Ready'
      );
    } catch (err) {
      clearInterval(progInterval);
      setChatUploadOverlay(prev => ({ ...prev, isOpen: false }));
      console.warn('Failed to analyze link:', err);
    } finally {
      setIsAnalyzingLink(false);
    }
  };

  // Voice input handler: dual-engine real-time streaming recognition + Gemini AI audio transcription
  const toggleListening = async () => {
    // If currently listening, stop both engines
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

    // 1. Request microphone access
    let stream: MediaStream | null = null;
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
      }
    } catch (mediaErr) {
      console.warn('Microphone permission not granted:', mediaErr);
      (window as any).showToast?.(
        'Microphone access is required for voice input. Please enable microphone permissions in your browser.',
        'warning',
        3400,
        'Microphone Permission Needed'
      );
      return;
    }

    if (!stream) {
      (window as any).showToast?.(
        'Microphone access is required for voice input. Please enable microphone permissions in your browser.',
        'warning',
        3400,
        'Microphone Permission Needed'
      );
      return;
    }

    // 2. Start MediaRecorder on the microphone stream (buffering audio chunks)
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
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }

        // Check if Web Speech API already transcribed speech
        const speechCaptured = (lastFinalTranscriptRef.current || inputRef.current?.value || inputValue).trim();
        if (speechCaptured) {
          handleSend(speechCaptured);
          lastFinalTranscriptRef.current = '';
          return;
        }

        // Otherwise transcribe audio chunks via Gemini voice-transcribe service
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
                console.error('Transcription API error:', apiErr);
              } finally {
                setIsTranscribingVoice(false);
              }
            };
          } catch (err) {
            console.error('Audio processing error:', err);
            setIsTranscribingVoice(false);
          }
        }
      };

      mediaRecorder.start(250); // Collect audio slices continuously
      setIsListening(true);
    } catch (recErr) {
      console.warn('Could not initialize MediaRecorder:', recErr);
    }

    // 3. Concurrently start Web Speech Recognition for live text streaming into input
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
          console.warn('[SpeechRecognition] notice:', err?.error || err);
          // Don't stop listening; MediaRecorder is recording and will transcribe
        };

        recognition.onend = () => {
          // If recognition ended due to silence, stop media recorder to trigger final transcribe & send
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try { mediaRecorderRef.current.stop(); } catch {}
          }
        };

        recognition.start();
      } catch (e) {
        console.warn('SpeechRecognition failed to start, using MediaRecorder transcription:', e);
      }
    }
  };

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Send message
  const handleSend = async (customPrompt?: string, sendOptions?: { allowOutsideResearch?: boolean }) => {
    const textToSend = (customPrompt || inputValue).trim();
    if ((!textToSend && attachedDrafts.length === 0) || isThinking) return;

    const currentDrafts = [...attachedDrafts];
    const draftNames = currentDrafts.map(d => d.name);

    // Build user message with explicit description if prompt is empty
    const userMsgText = textToSend || (draftNames.length > 0
      ? `Please analyze my uploaded document (${draftNames.join(', ')}). Tell me what it is about, what key concepts are covered inside it, and explain it clearly.`
      : '');

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      attachedFileNames: draftNames.length > 0 ? draftNames : undefined,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    stopSpeech();
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setAttachedDrafts([]); // Clear attachment queue
    setIsThinking(true);

    // Record real-time user activity for asking AI Tutor
    recordUserActivity({
      title: 'Asked AI Tutor',
      detail: (userMsgText || `Study session in ${workspace.name}`).trim().slice(0, 50),
      iconType: 'tutor'
    });

    // Convert attached drafts into WorkspaceFile objects with base64 url and transcription
    const newlyConvertedFiles: WorkspaceFile[] = currentDrafts.map(d => {
      const lower = d.name.toLowerCase();
      const isVideoDraft = d.type === 'video' || (d.url && /(?:youtube\.com|youtu\.be)/i.test(d.url)) || lower.match(/\.(mp4|webm|mov|mkv|avi|m4v)$/);
      const fileType: WorkspaceFile['type'] = isVideoDraft
        ? 'video'
        : lower.endsWith('.pdf') 
        ? 'pdf' 
        : lower.match(/\.(png|jpg|jpeg|webp|gif|svg)$/) 
        ? 'image' 
        : lower.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/) 
        ? 'audio' 
        : 'doc';

      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: d.name,
        size: d.size,
        type: fileType,
        uploadDate: new Date().toISOString(),
        status: 'indexed',
        tags: isVideoDraft ? ['Video Study Guide', 'Chat Upload'] : ['Attachment', 'Chat Upload'],
        summary: d.summary || (d.content ? d.content.slice(0, 1000) : `Uploaded study material: ${d.name}`),
        transcription: d.content,
        url: d.url || d.dataUrl,
        fileBase64: d.base64,
        fileMimeType: d.mimeType,
        highlights: d.highlights && d.highlights.length > 0 ? d.highlights : [d.content ? d.content.slice(0, 300) : `Study document: ${d.name}`]
      };
    });

    // Save newly attached files into workspace only if not already added during handleFileSelect / handleAttachLink
    const existingWsFiles = workspace.files || [];
    const trulyNewFiles = newlyConvertedFiles.filter(
      nf => !existingWsFiles.some(ef => ef.name && nf.name && ef.name.trim().toLowerCase() === nf.name.trim().toLowerCase())
    );
    if (onUpdateWorkspace && trulyNewFiles.length > 0) {
      onUpdateWorkspace({
        ...workspace,
        files: [...trulyNewFiles, ...existingWsFiles]
      });
    }

    // Place newly attached files at the FRONT of effectiveFiles, deduplicated by name
    const newFileNames = new Set(newlyConvertedFiles.map(f => String(f.name || '').trim().toLowerCase()));
    const effectiveFiles = [
      ...newlyConvertedFiles.map(f => ({ ...f, workspaceId: workspace.id, workspaceName: workspace.name })),
      ...activeFiles.filter(af => !newFileNames.has(String(af.name || '').trim().toLowerCase()))
    ];
    const newFileIds = new Set(newlyConvertedFiles.map(f => f.id));

    // Create a compact, proxy-safe payload for attachedFiles in the ACTIVE workspace (including image base64 for all active workspace images)
    let includedBinaryCount = 0;
    const compactAttachedFiles = effectiveFiles.slice(0, 30).map((f: any) => {
      const isNewAttachment = newFileIds.has(f.id);
      const safeUrl = (typeof f.url === 'string' && !f.url.startsWith('data:')) ? f.url.slice(0, 1000) : undefined;
      let candidateB64 = typeof f.fileBase64 === 'string' ? f.fileBase64 : undefined;
      let candidateMime = f.fileMimeType;
      if (!candidateB64 && typeof f.url === 'string' && f.url.startsWith('data:')) {
        const m = f.url.match(/^data:([^;]+);base64,(.+)$/);
        if (m) {
          candidateMime = candidateMime || m[1];
          candidateB64 = m[2];
        }
      }
      const isActiveWorkspaceFile = !f.workspaceId || String(f.workspaceId) === String(workspace.id);
      const needsBinaryInspection = isNewAttachment || (isActiveWorkspaceFile && (f.type === 'image' || candidateMime?.startsWith('image/') || !f.transcription));
      let safeBase64: string | undefined = undefined;
      if (needsBinaryInspection && includedBinaryCount < 3 && typeof candidateB64 === 'string' && candidateB64.length < 6000000) {
        safeBase64 = candidateB64;
        includedBinaryCount++;
      }

      const fullTranscript = f.transcription || f.contentText;
      const defaultMimeType = candidateMime || (f.type === 'video' ? 'video/mp4' : f.type === 'pdf' ? 'application/pdf' : f.type === 'image' ? 'image/jpeg' : undefined);

      return {
        id: f.id,
        name: String(f.name || 'Study Material').slice(0, 200),
        type: f.type || 'doc',
        size: f.size,
        pages: f.pages,
        url: safeUrl,
        workspaceId: f.workspaceId || workspace.id,
        workspaceName: f.workspaceName || workspace.name,
        isDirectAttachment: isNewAttachment,
        summary: typeof f.summary === 'string' ? f.summary.slice(0, 3500) : undefined,
        highlights: Array.isArray(f.highlights) ? f.highlights.slice(0, 12).map((h: any) => String(h).slice(0, 500)) : undefined,
        formulas: Array.isArray(f.formulas) ? f.formulas.slice(0, 12).map((eq: any) => String(eq).slice(0, 250)) : undefined,
        transcription: typeof fullTranscript === 'string' ? fullTranscript.slice(0, 18000) : undefined,
        fileBase64: safeBase64,
        fileMimeType: safeBase64 ? defaultMimeType : undefined
      };
    });

    // Build compact overview of all workspaces and their files/notes/flashcards/quizzes so inventory queries show 100% of items
    const compactAllWorkspaces = allUserWorkspaces.map(ws => ({
      id: ws.id,
      name: ws.name || 'Workspace',
      subject: ws.subject || 'General',
      files: (ws.id === workspace.id && trulyNewFiles.length > 0 ? [...trulyNewFiles, ...(ws.files || [])] : (ws.files || [])).map(f => ({
        id: f.id,
        name: f.name,
        type: f.type || 'doc',
        size: f.size,
        pages: f.pages,
        url: (typeof f.url === 'string' && !f.url.startsWith('data:')) ? f.url.slice(0, 500) : undefined,
        summary: typeof f.summary === 'string' ? f.summary.slice(0, 1200) : undefined,
        transcription: typeof (f.transcription || f.contentText) === 'string' ? String(f.transcription || f.contentText).slice(0, 6000) : undefined,
        highlights: Array.isArray(f.highlights) ? f.highlights.slice(0, 6) : undefined
      })),
      notes: (ws.notes || []).map(n => ({
        id: n.id,
        title: n.title || 'Study Note',
        content: typeof n.content === 'string' ? n.content.replace(/<[^>]+>/g, ' ').slice(0, 2500) : '',
        tags: n.tags
      })),
      flashcardsCount: (ws.flashcards || []).length,
      flashcardTopics: (ws.flashcards || []).slice(0, 10).map((fc: any) => fc.front || fc.question || '').filter(Boolean),
      quizzesCount: (ws.quizzes || []).length,
      quizTitles: (ws.quizzes || []).slice(0, 10).map((qz: any) => qz.title || qz.question || '').filter(Boolean)
    }));

    // Exclude welcome greetings, file-ready badges, and error banners so history sent to Gemini is 100% clean conversation turns
    const history = messages
      .filter(m => !m.isError && !m.isFileReadyBadge && !m.id.startsWith('welcome-') && m.id !== 'welcome-msg')
      .slice(-6)
      .map(m => ({
        role: m.sender === 'ai' ? 'model' : 'user',
        content: String(m.text || '').slice(0, 1500)
      }));

    try {
      const aiMsg = await AITutorBackgroundService.sendTutorMessage({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        userId: resolvedUserId,
        prompt: userMsg.text,
        history,
        compactAttachedFiles,
        allWorkspaces: compactAllWorkspaces,
        accessToken,
        allowOutsideResearch: Boolean(sendOptions?.allowOutsideResearch),
        userMsg
      });

      setMessages(prev => {
        if (prev.some(m => m.id === aiMsg.id)) return prev;
        return [...prev, aiMsg as Message];
      });

      if (autoSpeak && !aiMsg.isError) {
        handleSpeakMessage(aiMsg.id, aiMsg.text);
      }
    } catch (err) {
      console.error('[WorkspaceChat] Error sending message to background tutor:', err);
    } finally {
      setIsThinking(false);
    }
  };

  // Auto-receive voice-directed queries and answers from Global Voice Agent
  useEffect(() => {
    const handleVoiceAsk = (e: any) => {
      const { question, answer } = e.detail || {};
      if (question && typeof question === 'string') {
        if (answer && typeof answer === 'string') {
          const userMsg: Message = {
            id: `msg-user-${Date.now()}`,
            sender: 'user',
            text: question,
            source: 'Voice Agent',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          const aiMsg: Message = {
            id: `msg-ai-${Date.now() + 1}`,
            sender: 'ai',
            text: answer,
            source: 'Gemini AI Tutor (Voice)',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, userMsg, aiMsg]);
        } else {
          handleSend(question);
        }
      }
    };
    window.addEventListener('studyweb_ask_ai_tutor', handleVoiceAsk);
    return () => window.removeEventListener('studyweb_ask_ai_tutor', handleVoiceAsk);
  }, [handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  // Minimalist Markdown Formatter
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-sm sm:text-[15px] leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1.5" />;

          // Heading 3
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-extrabold text-base text-slate-900 dark:text-white pt-1">
                {trimmed.replace('### ', '')}
              </h4>
            );
          }
          // Heading 2 or 1
          if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            return (
              <h3 key={idx} className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white pt-1">
                {trimmed.replace(/^#+\s*/, '')}
              </h3>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                <span 
                  className="flex-1"
                  dangerouslySetInnerHTML={{ 
                    __html: content
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                  }} 
                />
              </div>
            );
          }

          // Numbered lists
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 font-mono text-xs mt-0.5">
                  {numMatch[1]}.
                </span>
                <span 
                  className="flex-1"
                  dangerouslySetInnerHTML={{ 
                    __html: numMatch[2]
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                  }} 
                />
              </div>
            );
          }

          // Standard paragraph
          return (
            <p 
              key={idx} 
              dangerouslySetInnerHTML={{ 
                __html: trimmed
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
              }} 
            />
          );
        })}
      </div>
    );
  };

  // Workspace Logo & Icon helper: renders the workspace's actual icon/emoji or custom image with its theme accent
  const workspaceIcon = (workspace as any)?.logo || (workspace as any)?.icon || (workspace as any)?.logoUrl || workspace?.emoji || '🧬';
  const isWorkspaceImageLogo = typeof workspaceIcon === 'string' &&
    (workspaceIcon.startsWith('data:') || workspaceIcon.startsWith('http://') || workspaceIcon.startsWith('https://') || (workspaceIcon.startsWith('/') && !workspaceIcon.includes('logo-inner.png')));

  const renderWorkspaceLogo = (sizeClass = 'w-7 h-7 sm:w-8.5 sm:h-8.5', textClass = 'text-base sm:text-lg') => {
    const themeBg: Record<string, string> = {
      indigo: 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200/80 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-300',
      emerald: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-300',
      amber: 'bg-amber-50 dark:bg-amber-950/70 border-amber-200/80 dark:border-amber-800/60 text-amber-600 dark:text-amber-300',
      rose: 'bg-rose-50 dark:bg-rose-950/70 border-rose-200/80 dark:border-rose-800/60 text-rose-600 dark:text-rose-300',
      violet: 'bg-violet-50 dark:bg-violet-950/70 border-violet-200/80 dark:border-violet-800/60 text-violet-600 dark:text-violet-300',
      cyan: 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-200/80 dark:border-cyan-800/60 text-cyan-600 dark:text-cyan-300',
    };
    const currentThemeClass = themeBg[workspace.colorTheme || 'indigo'] || themeBg.indigo;

    return (
      <div 
        className={`${sizeClass} rounded-xl border flex items-center justify-center shrink-0 overflow-hidden shadow-2xs select-none ${currentThemeClass}`}
        title={`Workspace: ${workspace.name}`}
      >
        {isWorkspaceImageLogo ? (
          <img 
            src={workspaceIcon} 
            alt={`${workspace.name} Logo`} 
            className="w-full h-full object-cover select-none" 
          />
        ) : (
          <span className={`${textClass} leading-none select-none`}>
            {workspaceIcon}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full md:h-[calc(100vh-130px)] md:min-h-[500px] flex flex-col bg-white dark:bg-slate-950 md:rounded-2xl md:border md:border-slate-200/90 dark:md:border-slate-800 md:shadow-sm relative font-sans overflow-hidden">
      
      {/* ============================================================== */}
      {/* 1. MINIMALIST TOP HEADER                                       */}
      {/* ============================================================== */}
      <header className="px-2.5 sm:px-6 py-2 sm:py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-20">
        
        {/* Left: Workspace Logo & AI Tutor Branding */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {renderWorkspaceLogo('w-7 h-7 sm:w-8.5 sm:h-8.5', 'text-base sm:text-lg')}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-tight truncate">
                <span className="hidden xs:inline">AI Study Tutor</span>
                <span className="xs:hidden">AI Tutor</span>
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online & ready" />
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              {/* Workspace Switcher or Name */}
              {workspaces && workspaces.length > 1 && onSelectWorkspace ? (
                <div className="relative">
                  <button
                    onClick={() => setShowWorkspaceMenu(prev => !prev)}
                    className="text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors truncate max-w-[100px] xs:max-w-[140px] sm:max-w-xs"
                  >
                    <span className="truncate">{workspace.name}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  </button>

                  {showWorkspaceMenu && (
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 space-y-0.5">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Switch Study Workspace
                      </div>
                      {workspaces.map(ws => (
                        <button
                          key={ws.id}
                          onClick={() => {
                            onSelectWorkspace(ws);
                            setShowWorkspaceMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                            ws.id === workspace.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{ws.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {ws.files?.length || 0} docs
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[100px] xs:max-w-[140px] sm:max-w-xs">
                  {workspace.name}
                </span>
              )}

              {/* Source docs count pill */}
              {(workspace.files || []).length > 0 && (
                <button
                  onClick={() => setShowFilesList(prev => !prev)}
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 cursor-pointer transition-colors shrink-0"
                  title="Click to see loaded documents"
                >
                  <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-500" />
                  <span>{workspace.files.length} doc{workspace.files.length === 1 ? '' : 's'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Voice Settings & Clear Chat Button */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

          {/* AI Tutor Voice Settings Popover */}
          <div className="relative" ref={voiceSettingsRef}>
            <button
              type="button"
              onClick={() => setShowVoiceSettings(prev => !prev)}
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border active:scale-95 shadow-2xs ${
                showVoiceSettings || autoSpeak
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-750/80'
              }`}
              title="Voice Profile & Text-to-Speech Settings"
            >
              <Volume2 className={`w-3.5 h-3.5 ${autoSpeak ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline font-bold">
                {VOICE_PROFILES[selectedVoiceProfile]?.name || 'Voice'}
              </span>
              <span className="hidden md:inline text-[10px] opacity-75 font-normal">
                ({VOICE_PROFILES[selectedVoiceProfile]?.genderLabel.split(' ')[0]})
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showVoiceSettings && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                        Tutor Voice Settings
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">Auditory Socratic feedback & profiles</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVoiceSettings(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Auto-Speech Toggle Switch */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/70">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Auto-Speak Responses</span>
                      {autoSpeak && (
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">Active</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Read tutor feedback aloud automatically</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoSpeak;
                      setAutoSpeak(next);
                      try { localStorage.setItem('study_tutor_auto_speak', String(next)); } catch {}
                      if (!next) stopSpeech();
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      autoSpeak ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <motion.div 
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="bg-white w-4 h-4 rounded-full shadow-md"
                    />
                  </button>
                </div>

                {/* Voice Profile Selection */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-0.5">
                    Select Voice Profile
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(['male', 'female'] as VoiceProfileId[]).map((vKey) => {
                      const v = VOICE_PROFILES[vKey];
                      const isSelected = selectedVoiceProfile === vKey;
                      const isPreviewing = isPlayingPreview === vKey || speakingMessageId === `preview-${vKey}`;

                      return (
                        <div
                          key={vKey}
                          onClick={() => {
                            setSelectedVoiceProfile(vKey);
                            try { localStorage.setItem('study_tutor_voice_profile', vKey); } catch {}
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/60 border-indigo-400/80 dark:border-indigo-600/80 shadow-xs'
                              : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl shrink-0 select-none">{v.icon}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                  {v.name}
                                </span>
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-md ${
                                  v.genderLabel.includes('Female')
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : v.genderLabel.includes('Male')
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : v.genderLabel.includes('Dynamic')
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {v.genderLabel}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                                {v.description}
                              </p>
                            </div>
                          </div>

                          {/* Sample button & checkmark */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewVoice(v);
                              }}
                              className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                isPreviewing
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 border-slate-200 dark:border-slate-700'
                              }`}
                              title={`Preview ${v.name} voice`}
                            >
                              {isPreviewing ? (
                                <>
                                  <Square className="w-2.5 h-2.5 fill-current" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Sample</span>
                                </>
                              )}
                            </button>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Speech Pace Rate */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 px-0.5">
                    <span>Speech Pace</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{speechRate}x Speed</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { rate: 0.85, label: '0.85x' },
                      { rate: 1.0, label: '1.0x (Normal)' },
                      { rate: 1.15, label: '1.15x' },
                      { rate: 1.25, label: '1.25x' }
                    ].map(item => (
                      <button
                        key={item.rate}
                        type="button"
                        onClick={() => {
                          setSpeechRate(item.rate);
                          try { localStorage.setItem('study_tutor_speech_rate', String(item.rate)); } catch {}
                        }}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center ${
                          speechRate === item.rate
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clear Chat Button */}
          <button
            onClick={handleResetChat}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-850 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-750/80 hover:border-rose-200 dark:hover:border-rose-900/50 active:scale-95 shadow-2xs"
            title="Clear current conversation history while keeping workspace open"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span className="inline">Clear Chat</span>
          </button>
        </div>
      </header>

      {/* Popover file list if user taps document badge */}
      {showFilesList && (workspace.files || []).length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <span className="text-slate-400 font-medium shrink-0">Study documents:</span>
            {workspace.files.map(f => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium shrink-0"
              >
                <FileText className="w-3 h-3 text-indigo-500" />
                <span className="truncate max-w-[150px]">{f.name}</span>
              </span>
            ))}
          </div>
          <button
            onClick={() => setShowFilesList(false)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-3 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. FULL-WIDTH CONVERSATION AREA                                */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          

          {/* Conversation Stream */}
          {messages.map((msg) => {
            if (msg.isFileReadyBadge) {
              return (
                <div key={msg.id} className="flex items-center justify-center my-1">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold truncate max-w-[200px] sm:max-w-[300px]">
                      {msg.readyFileName || 'Study Material'}
                    </span>
                    <span className="text-emerald-700/80 dark:text-emerald-300/80 font-medium">
                      ready in workspace — ask about it anytime
                    </span>
                  </div>
                </div>
              );
            }

            return (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI Avatar */}
              {msg.sender === 'ai' && (
                <div className="shrink-0 mt-0.5">
                  {renderWorkspaceLogo('w-7 h-7 sm:w-8.5 sm:h-8.5', 'text-xs sm:text-sm')}
                </div>
              )}

              {/* Message Bubble Container */}
              <div className={`space-y-1.5 max-w-[88%] sm:max-w-2xl ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                
                {/* Bubble */}
                <div className={`p-4 sm:p-5 rounded-3xl ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white font-medium text-[15px] shadow-sm rounded-tr-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-xs'
                }`}>
                  
                  {/* AI Message Header with Active Context Attribution */}
                  {msg.sender === 'ai' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          AI Tutor
                        </span>
                        {!msg.isError && msg.id !== 'welcome-msg' && !msg.id.startsWith('welcome-') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200/70 dark:border-slate-700/70">
                            <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[220px] sm:max-w-[320px]">
                              {msg.activeContextFiles && msg.activeContextFiles.length > 0
                                ? `Context: ${msg.activeWorkspaceContext || workspace.name} (${msg.activeContextFiles.slice(0, 2).join(', ')}${msg.activeContextFiles.length > 2 ? ` +${msg.activeContextFiles.length - 2}` : ''})`
                                : `Context: ${msg.activeWorkspaceContext || workspace.name}`}
                            </span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {msg.time}
                      </span>
                    </div>
                  )}

                  {/* Out-of-Workspace Topic Notice Banner + Research Outside Workspace Button */}
                  {msg.sender === 'ai' && msg.workspaceNotice && !msg.isError && (
                    <div className="mb-3.5 p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-start gap-2 leading-snug">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block sm:inline">Workspace Context Check: </span>
                          <span>{msg.workspaceNotice}</span>
                        </div>
                      </div>
                      {msg.suggestOutsideResearch && (
                        <button
                          type="button"
                          disabled={isThinking}
                          onClick={() =>
                            handleSend(
                              msg.originalQuery || `Research and explain this topic in detail outside my workspace`,
                              { allowOutsideResearch: true }
                            )
                          }
                          className="h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs transition-all cursor-pointer self-start sm:self-center"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Research outside workspace</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Attached files indicator on user message */}
                  {msg.sender === 'user' && msg.attachedFileNames && msg.attachedFileNames.length > 0 && (
                    <div className="mb-2 pb-2 border-b border-indigo-500/40 flex flex-wrap gap-1.5 justify-end">
                      {msg.attachedFileNames.map((fn, fIdx) => (
                        <span
                          key={fIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-700/80 text-white text-[11px] font-semibold"
                        >
                          <Paperclip className="w-3 h-3 text-indigo-200" />
                          <span className="truncate max-w-[150px]">{fn}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Body Text or Error Banner */}
                  {msg.isError ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>
                          {msg.errorCode && msg.errorCode !== 'unknown'
                            ? `Failed to generate response (${msg.errorCode})`
                            : 'Failed to generate response'}
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 dark:text-rose-300 font-normal leading-relaxed break-words">
                        {msg.text || "There was a problem contacting the Gemini API. Please try again."}
                      </p>
                      {msg.failedPrompt && (
                        <button
                          type="button"
                          onClick={() => handleSend(msg.failedPrompt)}
                          disabled={isThinking}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry Question</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    renderMessageContent(msg.text)
                  )}

                  {/* Automatically Generated Image / Educational Diagram */}
                  {msg.sender === 'ai' && msg.generatedImageUrl && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-sm">
                      <img
                        src={msg.generatedImageUrl}
                        alt={msg.generatedImageCaption || 'Generated educational diagram'}
                        className="w-full h-auto max-h-[380px] object-contain bg-slate-950"
                      />
                      <div className="px-3.5 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-300">
                        <span className="font-semibold truncate">
                          {msg.generatedImageCaption || 'AI Tutor Generated Visual Diagram'}
                        </span>
                        <a
                          href={msg.generatedImageUrl}
                          download={`studyweb-diagram-${msg.id}.svg`}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0 transition-colors"
                        >
                          Download Visual
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Clean Citation Footnotes */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-400">Sources:</span>
                      {msg.citations.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium"
                        >
                          <BookOpen className="w-3 h-3 text-indigo-500" />
                          <span>{c.sourceName}</span>
                          {c.page && <span className="opacity-70">p.{c.page}</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Clickable Follow-Up Question Chips */}
                  {msg.sender === 'ai' && !msg.isError && msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Suggested Follow-Up Questions
                        </span>
                        {msg.suggestOutsideResearch && (
                          <button
                            type="button"
                            disabled={isThinking}
                            onClick={() =>
                              handleSend(
                                msg.originalQuery || `Research this topic in depth outside my workspace`,
                                { allowOutsideResearch: true }
                              )
                            }
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Globe className="w-3 h-3" />
                            <span>Research outside workspace</span>
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.followUpQuestions.map((followUpQ, fqIdx) => (
                          <button
                            key={fqIdx}
                            type="button"
                            disabled={isThinking}
                            onClick={() => handleSend(followUpQ)}
                            className="text-left px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/70 dark:hover:bg-indigo-950/50 border border-slate-200/80 hover:border-indigo-300 dark:border-slate-700/80 dark:hover:border-indigo-700 text-xs font-semibold text-slate-700 hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-300 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {followUpQ}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Bubble Actions: Listen (TTS) & Copy */}
                {msg.sender === 'ai' && !msg.isError && (
                  <div className="flex items-center gap-2 pl-2 text-xs text-slate-400 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSpeakMessage(msg.id, msg.text, msg.persona)}
                      className={`flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                        speakingMessageId === msg.id
                          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 font-bold shadow-2xs'
                          : 'hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-750'
                      }`}
                      title={speakingMessageId === msg.id ? "Stop auditory playback" : "Listen to this tutor explanation aloud"}
                    >
                      {speakingMessageId === msg.id ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current text-indigo-600 dark:text-indigo-400" />
                          <span>Stop</span>
                          {/* Animated sound wave bars */}
                          <div className="flex items-center gap-0.5 ml-0.5">
                            <span className="w-0.5 h-2.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-0.5 h-3.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-0.5 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </>
                      ) : isTtsLoading && targetLoadingId === msg.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                          <span>Preparing Voice...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1 rounded-xl text-xs border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-750"
                      title="Copy text to clipboard"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {msg.sender === 'user' && (
                <div className="w-9 h-9 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  You
                </div>
              )}
            </div>
            );
          })}

          {/* Thinking Indicator */}
          {isThinking && (
            <div className="flex gap-2.5 sm:gap-3.5 items-center">
              <div className="shrink-0">
                {renderWorkspaceLogo('w-7 h-7 sm:w-8.5 sm:h-8.5 animate-pulse', 'text-xs sm:text-sm')}
              </div>
              <div className="px-3.5 py-2.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-2 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 animate-pulse shrink-0" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MINIMALIST FULL-WIDTH CHAT INPUT DOCK + CLAUDE FOLLOW-UPS   */}
      {/* ============================================================== */}
      <footer className="p-2 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shrink-0">
        <div className="max-w-3xl mx-auto space-y-2.5">
          
          {/* Claude-Style Bottom Follow-Up Questions Bar (anchored at bottom of screen above input) */}
          {(() => {
            const latestAiMsg = [...messages].reverse().find(m => m.sender === 'ai' && !m.isError && !m.isFileReadyBadge && m.id !== 'welcome-msg' && !m.id.startsWith('welcome-'));
            if (!isThinking && latestAiMsg && latestAiMsg.followUpQuestions && latestAiMsg.followUpQuestions.length > 0) {
              return (
                <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>Follow-up questions</span>
                    </span>
                    {latestAiMsg.suggestOutsideResearch && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSend(
                            latestAiMsg.originalQuery || 'Research this topic in depth outside my workspace',
                            { allowOutsideResearch: true }
                          )
                        }
                        className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Research outside workspace</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {latestAiMsg.followUpQuestions.slice(0, 3).map((qText, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleSend(qText)}
                        className="text-left px-3 py-2 rounded-xl bg-white hover:bg-indigo-50/80 dark:bg-slate-950 dark:hover:bg-indigo-950/40 border border-slate-200/80 hover:border-indigo-300 dark:border-slate-800 dark:hover:border-indigo-700 text-xs font-semibold text-slate-700 hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-300 flex items-center justify-between gap-2 transition-all cursor-pointer group shadow-2xs"
                      >
                        <span className="line-clamp-1">{qText}</span>
                        <Send className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Quick Prompt Suggestions when chat is fresh */}
          {messages.length <= 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider pl-1 shrink-0">Try:</span>
              {[
                { label: "📂 What is in my study material?", prompt: "What is in my study material? Explain everything uploaded in this workspace." },
                { label: "⚡ Summarize uploaded material", prompt: "Can you explain the main concepts and details from my uploaded workspace material?" },
                { label: "📝 Quiz me on key terms", prompt: "Create a 3-question quick quiz based on my workspace study material." }
              ].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(item.prompt)}
                  disabled={isThinking}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 dark:bg-slate-850 dark:hover:bg-indigo-950/50 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-800 font-medium whitespace-nowrap cursor-pointer transition-colors active:scale-95 text-[11px] sm:text-xs shrink-0"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Attached Files Queue (Visual chips indicating attached documents) */}
          {attachedDrafts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 animate-in fade-in slide-in-from-bottom-1">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 pl-1 shrink-0">
                <Paperclip className="w-3.5 h-3.5" />
                Attached ({attachedDrafts.length}):
              </span>
              {attachedDrafts.map((draft) => (
                <span
                  key={draft.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-850 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">{draft.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({draft.size})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachedDraft(draft.id)}
                    className="p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                    title="Remove attached file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Inline YouTube / Web Link Analyzer Bar */}
          {showLinkInput && (
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/70">
              <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 ml-1 shrink-0" />
              <input
                type="url"
                value={linkInputUrl}
                onChange={(e) => setLinkInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAttachLink();
                  }
                }}
                placeholder="Paste YouTube video link or article URL for full explanation..."
                className="flex-1 min-w-0 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                disabled={isAnalyzingLink}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAttachLink}
                disabled={!linkInputUrl.trim() || isAnalyzingLink}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isAnalyzingLink ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Watching & Indexing...</span>
                  </>
                ) : (
                  <span>Analyze Link</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkInputUrl('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Close link input"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden Native File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Clean Input Bar */}
          <div className="flex items-end gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-xs max-w-full">
            
            {/* 1. ATTACH BUTTON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking}
              className="h-9 w-9 sm:h-10 sm:w-auto sm:px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/70 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 shadow-2xs group mb-0.5"
              title="Attach study material (PDF, image, notes, or document)"
              aria-label="Attach study file"
            >
              <Paperclip className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 transition-colors" />
              <span className="text-xs font-bold hidden sm:inline text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                Attach
              </span>
            </button>

            {/* 1B. YOUTUBE / WEB LINK BUTTON */}
            <button
              type="button"
              onClick={() => setShowLinkInput(prev => !prev)}
              disabled={isThinking}
              className={`h-9 w-9 sm:h-10 sm:w-auto sm:px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border shadow-2xs group mb-0.5 ${
                showLinkInput
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/70 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700'
              }`}
              title="Attach a YouTube video or web link for full explanation"
              aria-label="Attach YouTube or Web Link"
            >
              <Link2 className={`w-4 h-4 transition-colors ${showLinkInput ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400'}`} />
              <span className={`text-xs font-bold hidden sm:inline ${showLinkInput ? 'text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300'}`}>
                Link
              </span>
            </button>

            {/* 2. VOICE INPUT BUTTON */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isThinking || isTranscribingVoice}
              className={`h-9 w-9 sm:h-10 sm:w-auto sm:px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border mb-0.5 ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/25 animate-pulse'
                  : isTranscribingVoice
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/70 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700 shadow-2xs group'
              }`}
              title={
                isTranscribingVoice
                  ? "Transcribing voice with AI..."
                  : isListening
                  ? "Listening... Speak your question, then click to stop and send"
                  : "Voice Input: Speak your question"
              }
              aria-label="Voice Input"
            >
              {isTranscribingVoice ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span className="text-xs font-bold text-white hidden sm:inline">Converting...</span>
                </>
              ) : isListening ? (
                <>
                  <div className="flex items-center gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1 bg-white rounded-full animate-bounce"
                        style={{ height: `${waveformLevels[i] || 12}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-white hidden sm:inline ml-1">Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 transition-colors" />
                  <span className="text-xs font-bold hidden sm:inline text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                    Voice
                  </span>
                </>
              )}
            </button>

            {/* 3. Textarea Input Box (Auto-resizing) */}
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={
                attachedDrafts.length > 0 
                  ? "Instructions for document..." 
                  : "Ask your AI tutor anything..."
              }
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              disabled={isThinking}
              className="flex-1 min-w-0 px-2 sm:px-3 py-2 bg-transparent text-[15px] sm:text-base font-normal text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none leading-relaxed max-h-[120px] custom-scrollbar mb-0.5"
            />

            {/* 4. Send Button */}
            <button
              type="button"
              onClick={() => {
                handleSend();
                if (inputRef.current) inputRef.current.style.height = 'auto';
              }}
              disabled={(!inputValue.trim() && attachedDrafts.length === 0) || isThinking}
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-indigo-600/25 shrink-0 active:scale-95 mb-0.5"
              title="Send message"
            >
              {isThinking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

        </div>
      </footer>

      <FullScreenUploadOverlay
        isOpen={chatUploadOverlay.isOpen}
        progress={chatUploadOverlay.progress}
        fileName={chatUploadOverlay.fileName}
        stepText={chatUploadOverlay.stepText}
        fileType={chatUploadOverlay.fileType}
      />

    </div>
  );
}
