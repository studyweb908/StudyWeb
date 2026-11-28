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
  Link2,
  Share2
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
import AITutorAvatar from './AITutorAvatar';
import MarkdownMathRenderer from './MarkdownMathRenderer';
import { ShareContentModal, triggerNativeDeviceShare } from './ShareContentModal';
import {
  fetchNaturalTtsAudio,
  prepareTextForNaturalSpeech,
  selectBestBrowserNaturalVoice
} from '../../utils/naturalTts';
import { PendingQuizIntent } from '../../utils/quizHistoryStorage';

function parseQuizNavigationIntent(
  promptText: string,
  recentMessages: Array<{ sender: 'user' | 'ai'; text: string; originalQuery?: string; isError?: boolean }>,
  activeWorkspaceId: string
): PendingQuizIntent | null {
  const lower = promptText.toLowerCase();
  const asksToOpenQuizzes =
    /\b(quizzes?\s+(section|tab|page|center|hub|area)|go\s+(to|into)\s+(the\s+)?quizzes?|open\s+(the\s+)?quizzes?|take\s+me\s+to\s+(the\s+)?quizzes?)\b/i.test(lower) ||
    (/\b(create|generate|make|build)\b/i.test(lower) &&
      /\bquiz(zes)?\b/i.test(lower) &&
      (/\b(internet|online|web|search|fill\s+in\s+the\s+blanks?|match\s+the\s+following)\b/i.test(lower) ||
        /\bin\s+(the\s+)?quiz(zes)?\b/i.test(lower)));

  if (!asksToOpenQuizzes) return null;

  let quizType: PendingQuizIntent['quizType'] = 'MCQ';
  if (/\b(match\s+the\s+following|matching)\b/i.test(lower)) {
    quizType = 'MatchFollowing';
  } else if (/\b(fill\s+in\s+the\s+blanks?|fill\s+blanks?|blanks)\b/i.test(lower)) {
    quizType = 'FillBlank';
  } else if (/\b(true\s*(?:or|\/)\s*false|t\/f)\b/i.test(lower)) {
    quizType = 'TF';
  }

  let difficulty: PendingQuizIntent['difficulty'] = 'Medium';
  if (/\b(hard|difficult|challenging|advanced)\b/i.test(lower)) {
    difficulty = 'Hard';
  } else if (/\b(easy|simple|basic|beginner)\b/i.test(lower)) {
    difficulty = 'Easy';
  }

  const countMatch = lower.match(/\b(\d{1,2})\s*(?:questions?|qs|mcqs?|quizzes?|items?)\b/i) ||
    lower.match(/\b(?:of|with)\s*(\d{1,2})\b/i);
  const count = countMatch ? Math.min(25, Math.max(1, parseInt(countMatch[1], 10))) : 5;

  const mentionsUploaded = /\b(uploaded|my\s+files?|my\s+notes?|workspace|documents?|pdfs?)\b/i.test(lower);
  const mentionsInternet = /\b(internet|online|web|search)\b/i.test(lower);

  // Extract explicit topic from prompt
  let topic = '';
  const searchMatch = promptText.match(/(?:search(?:\s+for)?|look\s+up|find)\s+["']?([^"']+?)["']?(?:\s+(?:and|then|from|on|in|to)\b|$)/i);
  const topicPrepMatch = promptText.match(/(?:about|on|regarding|from\s+(?:the\s+)?(?:internet\s+(?:about|on)\s+)?|topic(?:\s+of)?)\s+["']?([a-z0-9][^,.!?;]{2,70})["']?(?:$|[,.!?;])/i);

  if (searchMatch && searchMatch[1]) {
    topic = searchMatch[1]
      .replace(/\b(the\s+internet|online|web|resources?|for|me|a|quiz|quizzes|section)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if ((!topic || topic.length < 2) && topicPrepMatch && topicPrepMatch[1]) {
    const candidate = topicPrepMatch[1]
      .replace(/\b(the\s+quizzes?\s+section|quizzes?\s+section|the\s+internet|online|web|my\s+uploaded\s+materials?|uploaded\s+files?|that\s+very\s+topic|this\s+topic|that\s+topic|it|this|that)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (candidate.length >= 2) topic = candidate;
  }

  // Resolve contextual topic from recent chat turns if user said "that topic" / "what we just searched"
  const isGenericPronoun = !topic || /^(this|that|it|same|above|previous|topic)$/i.test(topic);
  if (isGenericPronoun && !mentionsUploaded) {
    const reversed = [...recentMessages].reverse();
    for (const m of reversed) {
      if (m.isError) continue;
      if (m.sender === 'user' && m.text && m.text.length > 3) {
        const cleaned = m.text
          .replace(/^(what\s+is|explain|tell\s+me\s+about|search(?:\s+for)?|research)\s+/i, '')
          .replace(/[?!.]+$/, '')
          .trim();
        if (cleaned && !/quizzes?\s+section/i.test(cleaned)) {
          topic = cleaned.slice(0, 80);
          break;
        }
      }
      if (m.originalQuery) {
        topic = m.originalQuery.slice(0, 80);
        break;
      }
    }
  }

  const sourceType: 'uploaded' | 'internet' =
    mentionsUploaded && !mentionsInternet && !topic
      ? 'uploaded'
      : mentionsInternet || Boolean(topic)
      ? 'internet'
      : 'uploaded';

  return {
    sourceType,
    topic: topic || undefined,
    workspaceId: activeWorkspaceId,
    quizType,
    count,
    difficulty,
    autoStart: true
  };
}

export type TutorPersona = string;

export type VoiceProfileId = 'male' | 'female';

export interface VoiceProfile {
  id: VoiceProfileId;
  name: string;
  genderLabel: string;
  gender: 'male' | 'female';
  geminiVoice: 'Charon' | 'Zephyr' | 'Fenrir' | 'Kore' | 'Puck';
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
    geminiVoice: 'Charon',
    description: 'Calm, natural, conversational male human mentor',
    icon: '👨‍🏫',
    samplePhrase: "Hey there. Let's walk through this idea together, nice and easy."
  },
  female: {
    id: 'female',
    name: 'Female Voice',
    genderLabel: 'Female Voice',
    gender: 'female',
    geminiVoice: 'Zephyr',
    description: 'Warm, relaxed, natural female study guide',
    icon: '👩‍🏫',
    samplePhrase: "Hi! I'm right here with you. What topic would you like to unpack today?"
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
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setResolvedUserId(session.user.id);
      setAccessToken(session?.access_token || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) setResolvedUserId(session.user.id);
      setAccessToken(session?.access_token || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [propUserId]);
  // Chat input and state
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState<boolean>(() => AITutorBackgroundService.isWorkspaceThinking(workspace.id));
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showFilesList, setShowFilesList] = useState(false);

  // Attached files for the current pending draft message
  const [attachedDrafts, setAttachedDrafts] = useState<AttachedDraftFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsRequestSeqRef = useRef(0);

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

  // Stop any active speech (in-flight fetch, HTML5 audio, and browser speech synthesis)
  const stopSpeech = useCallback(() => {
    ttsRequestSeqRef.current += 1;
    if (ttsAbortRef.current) {
      try {
        ttsAbortRef.current.abort();
      } catch {}
      ttsAbortRef.current = null;
    }
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

  // Natural speech text cleaner: removes markdown/citations and converts math notation to spoken phrasing
  const cleanSpeechText = (raw: string): string => prepareTextForNaturalSpeech(raw);

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
      const bestVoice = selectBestBrowserNaturalVoice(targetProfile.gender);
      if (bestVoice) utterance.voice = bestVoice;

      utterance.rate = customRate || speechRate || 1.0;
      utterance.pitch = 1.0;

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
    // If currently speaking or loading this message, clicking again toggles stop
    if (speakingMessageId === msgId || targetLoadingId === msgId) {
      stopSpeech();
      return;
    }

    stopSpeech();
    const cleanText = cleanSpeechText(text);
    if (!cleanText) return;

    const reqSeq = ++ttsRequestSeqRef.current;
    const abortController = new AbortController();
    ttsAbortRef.current = abortController;

    setTargetLoadingId(msgId);
    setIsTtsLoading(true);

    const activeProfile = VOICE_PROFILES[voiceProfileOverride || selectedVoiceProfile] || VOICE_PROFILES.male;

    try {
      const ttsResult = await fetchNaturalTtsAudio({
        text: cleanText,
        voiceName: activeProfile.geminiVoice,
        persona: persona || 'socratic',
        timeoutMs: 25000,
        signal: abortController.signal
      });

      if (ttsRequestSeqRef.current !== reqSeq || abortController.signal.aborted) {
        return;
      }

      if (ttsResult?.audioBase64) {
        const audio = new Audio(`data:${ttsResult.mimeType};base64,${ttsResult.audioBase64}`);
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
          if (ttsRequestSeqRef.current === reqSeq) {
            speakWithBrowserSynthesis(cleanText, msgId, activeProfile.id, speechRate);
          }
        };

        await audio.play();
        return;
      }

      if (ttsRequestSeqRef.current === reqSeq && !abortController.signal.aborted) {
        speakWithBrowserSynthesis(cleanText, msgId, activeProfile.id, speechRate);
      }
    } catch {
      if (ttsRequestSeqRef.current === reqSeq && !abortController.signal.aborted) {
        speakWithBrowserSynthesis(cleanText, msgId, activeProfile.id, speechRate);
      }
    }
  }, [speakingMessageId, targetLoadingId, stopSpeech, selectedVoiceProfile, speechRate, speakWithBrowserSynthesis]);

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

  // Aggregate user workspaces strictly for the active user (never merge unrelated guest caches)
  const allUserWorkspaces = useMemo(() => {
    const wsMap = new Map<string, Workspace>();
    const stored = loadStoredWorkspaces(resolvedUserId) || [];

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

    stored.forEach(mergeIntoMap);
    (workspaces || []).forEach(mergeIntoMap);
    if (workspace) mergeIntoMap(workspace);

    return Array.from(wsMap.values());
  }, [workspace, workspaces, resolvedUserId]);

  // Clean files list strictly scoped to the ACTIVE workspace so other workspaces never bleed in,
  // and completely empty in General Study Mode
  const activeFiles = useMemo(() => {
    if (!workspace || workspace.id === 'general-study') {
      return [];
    }

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
    pushFilesFromWorkspace(workspace);
    const matchingSyncedWs = allUserWorkspaces.find(ws => ws.id === workspace.id);
    if (matchingSyncedWs) {
      pushFilesFromWorkspace(matchingSyncedWs);
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
          ? `✨ **Fresh Conversation Started!**\n\nI have **${activeFiles.length} uploaded item${activeFiles.length === 1 ? '' : 's'}** ready to analyze. Ask me anything about your materials or any topic you'd like to explore!`
          : `✨ **Fresh Conversation Started!**\n\nAsk me anything—or upload notes, PDFs, images, or links and I'll analyze them for you!`,
        time: 'Just now'
      };
    }
    return {
      id: 'welcome-msg',
      sender: 'ai',
      text: hasDocs
        ? `👋 **Hi! I'm your AI Tutor${workspace.id !== 'general-study' ? ` for ${workspace.name}` : ''}!**\n\nI can analyze your **${activeFiles.length} uploaded item${activeFiles.length === 1 ? '' : 's'}** or answer any question using web knowledge. Type a question, use **Voice**, or attach more materials anytime!`
        : `👋 **Hi! How can I help you today?**\n\nAsk me any question just like ChatGPT, Claude, or Gemini—or upload notes, PDFs, images, or links using **Attach** and I'll analyze all of them for you!`,
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
        ? `👋 **Hi! I'm your AI Tutor${workspace.id !== 'general-study' ? ` for ${workspace.name}` : ''}!**\n\nI can analyze your **${activeFiles.length} uploaded item${activeFiles.length === 1 ? '' : 's'}** or answer any question using web knowledge. Type a question, use **Voice**, or attach more materials anytime!`
        : `👋 **Hi! How can I help you today?**\n\nAsk me any question just like ChatGPT, Claude, or Gemini—or upload notes, PDFs, images, or links using **Attach** and I'll analyze all of them for you!`,
      time: 'Just now'
    }];
  });

  // Progressive ChatGPT-style word-by-word streaming state
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamedWordCount, setStreamedWordCount] = useState<number>(0);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamedMessageIdsRef = useRef<Set<string>>(new Set());
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const stopStreamingAnimation = useCallback(() => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setStreamingMsgId(null);
  }, []);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = 'smooth', force = false) => {
    const container = chatScrollContainerRef.current;
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
  }, []);

  const startStreamingMessage = useCallback((msg: Message) => {
    if (!msg || msg.sender !== 'ai' || msg.isError || msg.isFileReadyBadge || msg.id === 'welcome-msg' || msg.id.startsWith('welcome-')) {
      return;
    }
    if (streamedMessageIdsRef.current.has(msg.id)) {
      return;
    }
    streamedMessageIdsRef.current.add(msg.id);

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

    // Fast, natural ChatGPT-style word-by-word cadence
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
  }, [scrollChatToBottom]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  // When switching between General Study Mode and Workspaces (or between Workspaces),
  // clear transient streaming/drafts and load that mode/workspace's isolated conversation history
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== workspace.id) {
      prevWorkspaceIdRef.current = workspace.id;
      stopStreamingAnimation();
      setInputValue('');
      setAttachedDrafts([]);
      setIsThinking(AITutorBackgroundService.isWorkspaceThinking(workspace.id));
    }

    try {
      const stored = localStorage.getItem(chatHistoryKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleanMsgs = parsed.filter((m: Message) => !m.isError && !isLegacyDummyMessage(m));
          if (cleanMsgs.length > 0) {
            cleanMsgs.forEach((m: Message) => streamedMessageIdsRef.current.add(m.id));
            setMessages(cleanMsgs);
            return;
          }
        }
      }
    } catch {}
    setMessages([buildWelcomeMessage(false)]);
  }, [chatHistoryKey, workspace.id, resolvedUserId, buildWelcomeMessage, stopStreamingAnimation]);

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
      startStreamingMessage(newMsg);

      if (autoSpeak && !newMsg.isError) {
        handleSpeakMessage(newMsg.id, newMsg.text);
      }
    };

    const handleChatReset = (e: any) => {
      const detail = e.detail;
      const resetMsgs = Array.isArray(detail?.messages) && detail.messages.length > 0
        ? detail.messages
        : [buildWelcomeMessage(true)];
      stopStreamingAnimation();
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

    const applyScannedNotePayload = (payload: any) => {
      if (!payload || !payload.draft) return;
      if (payload.workspaceId && payload.workspaceId !== workspace.id && workspace.id !== 'general-study') {
        return;
      }
      const draft = payload.draft;
      setAttachedDrafts(prev => {
        if (prev.some(d => d.id === draft.id)) return prev;
        return [...prev, draft];
      });
      const badgeMsg: Message = {
        id: `scan-ready-${draft.id}`,
        sender: 'ai',
        text: `File ready: ${draft.name || 'Scanned Note'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFileReadyBadge: true,
        readyFileName: draft.name || 'Scanned Note',
        readyFileType: 'image'
      };
      setMessages(prev => {
        if (prev.some(m => m.id === badgeMsg.id)) return prev;
        return [...prev, badgeMsg];
      });
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    };

    const handleScannedNoteEvent = (e: any) => {
      applyScannedNotePayload(e.detail);
      if ((window as any).__studywebPendingScannedNote?.draft?.id === e.detail?.draft?.id) {
        delete (window as any).__studywebPendingScannedNote;
      }
    };

    if ((window as any).__studywebPendingScannedNote) {
      const pending = (window as any).__studywebPendingScannedNote;
      if (!pending.workspaceId || pending.workspaceId === workspace.id || workspace.id === 'general-study') {
        applyScannedNotePayload(pending);
        delete (window as any).__studywebPendingScannedNote;
      }
    }

    window.addEventListener('studyweb-tutor-status-change', handleStatusChange);
    window.addEventListener('studyweb-tutor-message-completed', handleMessageCompleted);
    window.addEventListener('studyweb-tutor-chat-reset', handleChatReset);
    window.addEventListener('studyweb-workspace-file-ready', handleFileReadyEvent);
    window.addEventListener('studyweb-scanned-note-ready', handleScannedNoteEvent);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Initial check on mount or workspace update
    handleStatusChange();

    return () => {
      window.removeEventListener('studyweb-tutor-status-change', handleStatusChange);
      window.removeEventListener('studyweb-tutor-message-completed', handleMessageCompleted);
      window.removeEventListener('studyweb-tutor-chat-reset', handleChatReset);
      window.removeEventListener('studyweb-workspace-file-ready', handleFileReadyEvent);
      window.removeEventListener('studyweb-scanned-note-ready', handleScannedNoteEvent);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [workspace.id, chatHistoryKey, autoSpeak, handleSpeakMessage, buildWelcomeMessage, startStreamingMessage, stopStreamingAnimation]);

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
    scrollChatToBottom('smooth', true);
  }, [messages.length, isThinking, attachedDrafts.length, scrollChatToBottom]);

  const [shareModalData, setShareModalData] = useState<{ answer: string; question?: string } | null>(null);

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
    stopStreamingAnimation();
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

        if (fileType === 'image' && rawDataUrl) {
          const compressed = await new Promise<{ dataUrl: string; base64: string; mimeType: string }>((resolve) => {
            const cleanMime = (mimeType || '').toLowerCase().trim() === 'image/jpg'
              ? 'image/jpeg'
              : (['image/jpeg', 'image/png', 'image/webp'].includes((mimeType || '').toLowerCase().trim())
                  ? mimeType.toLowerCase().trim()
                  : 'image/jpeg');
            if (rawDataUrl.length <= 240_000 && (rawDataUrl.startsWith('data:image/jpeg') || rawDataUrl.startsWith('data:image/png') || rawDataUrl.startsWith('data:image/webp'))) {
              resolve({ dataUrl: rawDataUrl, base64: rawDataUrl.split(';base64,')[1] || '', mimeType: cleanMime });
              return;
            }
            const img = new Image();
            img.onload = () => {
              const maxDim = 1280;
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
                resolve({ dataUrl: rawDataUrl, base64: rawDataUrl.split(';base64,')[1] || '', mimeType: cleanMime });
                return;
              }
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, w, h);
              ctx.drawImage(img, 0, 0, w, h);
              let outUrl = canvas.toDataURL('image/jpeg', 0.78);
              if (outUrl.length > 280_000) {
                outUrl = canvas.toDataURL('image/jpeg', 0.62);
              }
              resolve({ dataUrl: outUrl, base64: outUrl.split(';base64,')[1] || '', mimeType: 'image/jpeg' });
            };
            img.onerror = () => resolve({ dataUrl: rawDataUrl, base64: rawDataUrl.split(';base64,')[1] || '', mimeType: cleanMime });
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
        console.error('[Chat File Read Error]', err);
        (window as any).showToast?.('Something went wrong. There is a server error. Please try again.', 'error', 5000, 'Server Error');
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
        stepText: `Uploading and analyzing ${file.name}...`
      }));

      let analyzedMaterial: any = null;
      try {
        const abortCtrl = new AbortController();
        const tId = setTimeout(() => abortCtrl.abort(), 45000);
        const procBody = JSON.stringify({
          workspaceId: toValidUuid(workspace.id),
          userId: resolvedUserId || undefined,
          supabaseToken: accessToken || undefined,
          name: file.name,
          type: fileType,
          size: formattedSize,
          content: content || undefined,
          fileBase64: base64 || undefined,
          fileMimeType: mimeType || undefined
        });
        let procRes = await fetch('/api/study-materials/process', {
          method: 'POST',
          credentials: 'same-origin',
          signal: abortCtrl.signal,
          headers: {
            'Content-Type': 'application/json'
          },
          body: procBody
        });
        if (procRes.status === 400) {
          procRes = await fetch('/api/study-materials/process', {
            method: 'POST',
            credentials: 'omit',
            signal: abortCtrl.signal,
            headers: {
              'Content-Type': 'application/json'
            },
            body: procBody
          });
        }
        clearTimeout(tId);

        let uploadErrMsg: string | null = null;
        if (procRes.ok) {
          const procData = await procRes.json();
          if (procData?.material && procData.material.status !== 'failed') {
            analyzedMaterial = procData.material;
          } else {
            uploadErrMsg = procData?.error || `Failed to analyze ${file.name}.`;
            console.error('[Chat Upload Pipeline Error]', uploadErrMsg, procData);
          }
        } else {
          const errJson = await procRes.json().catch(() => ({}));
          const errCode = errJson?.errorCode || `HTTP_${procRes.status}`;
          uploadErrMsg = errJson?.error || `Failed to analyze ${file.name} (${errCode}).`;
          console.error(`[Chat Upload Pipeline Error] [${errCode}] ${uploadErrMsg}`, errJson);
        }

        if (uploadErrMsg && !content) {
          const genericServerErr = 'Something went wrong. There is a server error. Please try again.';
          setUploadError(genericServerErr);
          setMessages(prev => [
            ...prev,
            {
              id: `upload-err-${Date.now()}-${i}`,
              sender: 'ai',
              text: genericServerErr,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isError: true
            }
          ]);
          continue;
        }
      } catch (procErr: any) {
        console.error('[Chat Upload Pipeline Error]', procErr);
        if (!content) {
          const genericServerErr = 'Something went wrong. There is a server error. Please try again.';
          setUploadError(genericServerErr);
          setMessages(prev => [
            ...prev,
            {
              id: `upload-err-${Date.now()}-${i}`,
              sender: 'ai',
              text: genericServerErr,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isError: true
            }
          ]);
          continue;
        }
      }

      setUploadError(null);
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
        stepText: 'Analyzed & saved to your workspace!'
      }));

      setTimeout(() => {
        setChatUploadOverlay(prev => ({ ...prev, isOpen: false }));
      }, 2200);

      (window as any).showToast?.(
        `"${analyzedWorkspaceFiles.map(f => f.name).join(', ')}" was analyzed and saved to your workspace.`,
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
      let processedMaterialId = `file-link-${Date.now()}`;

      let token: string | undefined;
      let userId: string | undefined;
      try {
        if (supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          token = sessionData?.session?.access_token;
          userId = sessionData?.session?.user?.id;
        }
      } catch {}

      const res = await fetch('/api/study-materials/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: toValidUuid(workspace.id),
          userId: userId || undefined,
          supabaseToken: token || undefined,
          name: normalizedUrl,
          type: isYt ? 'video' : 'url',
          size: isYt ? 'Full Video' : 'Web Link',
          url: normalizedUrl
        })
      });

      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload?.error || `Failed to analyze link (HTTP ${res.status}).`);
      }

      const data = await res.json().catch(() => null);
      const mat = data?.material || data?.file || data;
      if (!mat || mat.status === 'failed') {
        throw new Error(data?.error || 'Could not extract readable study content from that link.');
      }

      if (mat.id) processedMaterialId = mat.id;
      analyzedTitle = (mat.name || mat.title || '').trim();
      fullText = (mat.transcription || mat.contentText || mat.content_text || mat.summary || '').trim();
      summaryText = (mat.summary || '').trim();
      if (Array.isArray(mat.highlights)) highlightsList = mat.highlights;

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

      setUploadError(null);
      setAttachedDrafts(prev => [...prev, newDraft]);
      setLinkInputUrl('');
      setShowLinkInput(false);

      // Save analyzed link into workspace and show compact File Ready badge in chat without summarizing
      if (onUpdateWorkspace) {
        const wsLinkFile: WorkspaceFile = {
          id: processedMaterialId,
          name: analyzedTitle,
          size: newDraft.size,
          type: isYt ? 'video' : 'url',
          uploadDate: new Date().toISOString(),
          status: 'completed',
          tags: [isYt ? 'Video Study Guide' : 'Web Resource'],
          summary: newDraft.summary,
          transcription: newDraft.content,
          url: normalizedUrl,
          highlights: highlightsList
        };
        onUpdateWorkspace({
          ...workspace,
          files: [wsLinkFile, ...(workspace.files || []).filter(f => f.id !== processedMaterialId)]
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
      }, 2200);

      (window as any).showToast?.(
        `"${analyzedTitle}" is indexed & ready in your workspace.`,
        'success',
        3200,
        'Video / Link Ready'
      );
    } catch (err: any) {
      clearInterval(progInterval);
      setChatUploadOverlay(prev => ({ ...prev, isOpen: false }));
      console.error('[Link Analysis Error]', err);
      const genericServerErr = 'Something went wrong. There is a server error. Please try again.';
      setUploadError(genericServerErr);
      setMessages(prev => [
        ...prev,
        {
          id: `link-err-${Date.now()}`,
          sender: 'ai',
          text: genericServerErr,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
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

    // Check if user requested opening the Quizzes section to auto-create a quiz
    const quizIntent = parseQuizNavigationIntent(userMsgText, messages, workspace.id);
    if (quizIntent && !sendOptions?.allowOutsideResearch && currentDrafts.length === 0) {
      const typeDisplay =
        quizIntent.quizType === 'FillBlank'
          ? 'Fill in the Blanks'
          : quizIntent.quizType === 'MatchFollowing'
          ? 'Match the Following'
          : quizIntent.quizType === 'TF'
          ? 'True / False'
          : 'Multiple Choice';
      const targetDesc = quizIntent.topic
        ? `from internet resources on **${quizIntent.topic}**`
        : `from your uploaded materials in **${workspace.name}**`;
      const confirmMsg: Message = {
        id: `msg-ai-quiz-nav-${Date.now()}`,
        sender: 'ai',
        text: `Opening the **Quizzes** section now to automatically create a **${quizIntent.count}-question ${quizIntent.difficulty} ${typeDisplay}** quiz ${targetDesc}!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, confirmMsg]);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('studyweb-open-quizzes-intent', { detail: quizIntent }));
      }, 350);
      return;
    }

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

    const isGeneralStudyMode = !workspace?.id || workspace.id === 'general-study';

    // Create a compact, Vercel-safe (<4.5MB total JSON) payload for attachedFiles
    let includedBinaryCount = 0;
    let totalInlineBase64Chars = 0;
    const MAX_TOTAL_INLINE_BASE64_CHARS = 2_800_000;
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
      const isActiveWorkspaceFile = !isGeneralStudyMode && (!f.workspaceId || String(f.workspaceId) === String(workspace.id));
      const isPdfOrImage =
        f.type === 'image' ||
        f.type === 'pdf' ||
        candidateMime?.startsWith('image/') ||
        candidateMime === 'application/pdf';
      const needsBinaryInspection = isNewAttachment || (isActiveWorkspaceFile && (isPdfOrImage || !f.transcription));
      let safeBase64: string | undefined = undefined;
      if (
        needsBinaryInspection &&
        includedBinaryCount < 4 &&
        typeof candidateB64 === 'string' &&
        candidateB64.length > 0 &&
        candidateB64.length <= 2_400_000 &&
        totalInlineBase64Chars + candidateB64.length <= MAX_TOTAL_INLINE_BASE64_CHARS
      ) {
        safeBase64 = candidateB64;
        includedBinaryCount++;
        totalInlineBase64Chars += candidateB64.length;
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

    // Build compact overview of workspaces ONLY in Workspace Mode (strictly empty in General Study Mode so workspaces never bleed in)
    const compactAllWorkspaces = isGeneralStudyMode
      ? []
      : allUserWorkspaces.map(ws => ({
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
        tutorMode: isGeneralStudyMode ? 'general' : 'workspace',
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
      startStreamingMessage(aiMsg as Message);

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
          const cleanSubj = question.replace(/[?!.]+$/, '').slice(0, 48).trim() || workspace.name || 'this topic';
          const aiMsg: Message = {
            id: `msg-ai-${Date.now() + 1}`,
            sender: 'ai',
            text: answer,
            source: 'StudyWeb AI Tutor',
            originalQuery: question,
            followUpQuestions: [
              `Ask me a follow-up interview question on "${cleanSubj}"`,
              `Give me a practical step-by-step example of "${cleanSubj}"`,
              `Quiz me with 3 practice questions on "${cleanSubj}"`
            ],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, userMsg, aiMsg]);
          startStreamingMessage(aiMsg);
        } else {
          handleSend(question);
        }
      }
    };
    window.addEventListener('studyweb_ask_ai_tutor', handleVoiceAsk);
    return () => window.removeEventListener('studyweb_ask_ai_tutor', handleVoiceAsk);
  }, [handleSend, startStreamingMessage, workspace.name]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  // Full GFM Markdown + KaTeX LaTeX/Chemistry renderer with live streaming cursor support
  const renderMessageContent = (text: string, isStreaming = false) => {
    return <MarkdownMathRenderer content={text} isStreaming={isStreaming} />;
  };

  const renderWorkspaceLogo = (sizeClass = 'w-7 h-7 sm:w-8.5 sm:h-8.5', _textClass = 'text-base sm:text-lg') => {
    return (
      <AITutorAvatar
        workspace={workspace}
        sizeClass={sizeClass}
      />
    );
  };

  return (
    <div className="w-full h-full md:h-[calc(100vh-130px)] md:min-h-[500px] flex flex-col bg-white dark:bg-slate-950 md:rounded-2xl md:border md:border-slate-200/90 dark:md:border-slate-800 md:shadow-sm relative font-sans overflow-hidden">
      
      {/* ============================================================== */}
      {/* 1. MINIMALIST TOP HEADER                                       */}
      {/* ============================================================== */}
      <header className="px-2.5 sm:px-6 py-2 sm:py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-20">
        
        {/* Left: Workspace Logo & AI Tutor Branding */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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
              {workspaces && workspaces.length >= 1 && onSelectWorkspace ? (
                <div className="relative">
                  <button
                    onClick={() => setShowWorkspaceMenu(prev => !prev)}
                    className="text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors truncate max-w-[100px] xs:max-w-[140px] sm:max-w-xs"
                  >
                    <span className="truncate">{workspace.name}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  </button>

                  {showWorkspaceMenu && (
                    <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Switch Study Workspace
                      </div>
                      <button
                        key="general-study-opt"
                        onClick={() => {
                          onSelectWorkspace({
                            id: 'general-study',
                            name: 'General Study',
                            subject: 'All Subjects',
                            description: 'Open AI study assistant for any topic, homework, or concept.',
                            colorTheme: 'indigo',
                            emoji: '🎓',
                            visibility: 'private',
                            template: 'notes',
                            pinned: false,
                            favorite: false,
                            files: [],
                            nodes: [],
                            links: [],
                            flashcards: [],
                            quizzes: [],
                            notes: [],
                            plannerTasks: [],
                            streak: 1,
                            studyHours: 0,
                            lastOpened: new Date().toISOString()
                          } as Workspace);
                          setShowWorkspaceMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                          workspace.id === 'general-study'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AITutorAvatar workspace={{ id: 'general-study' }} sizeClass="w-5 h-5" />
                          <span className="truncate">General Study</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal shrink-0">
                          All Subjects
                        </span>
                      </button>
                      {workspaces.filter(ws => ws.id !== 'general-study').map(ws => (
                        <button
                          key={ws.id}
                          onClick={() => {
                            onSelectWorkspace(ws);
                            setShowWorkspaceMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                            ws.id === workspace.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <AITutorAvatar workspace={ws} sizeClass="w-5 h-5" />
                            <span className="truncate">{ws.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal shrink-0">
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
              <div className="fixed inset-x-3 top-14 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 sm:p-4 z-50 space-y-3 sm:space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight truncate">
                        Tutor Voice Settings
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium truncate">Auditory Socratic feedback & profiles</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVoiceSettings(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Auto-Speech Toggle Switch */}
                <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/70">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-1.5">
                      <span>Auto-Speak Responses</span>
                      {autoSpeak && (
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">Active</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">Read tutor feedback aloud automatically</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoSpeak;
                      setAutoSpeak(next);
                      try { localStorage.setItem('study_tutor_auto_speak', String(next)); } catch {}
                      if (!next) stopSpeech();
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
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
                          className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/60 border-indigo-400/80 dark:border-indigo-600/80 shadow-xs'
                              : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-lg sm:text-xl shrink-0 select-none">{v.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                  {v.name}
                                </span>
                                <span className={`text-[9px] sm:text-[9.5px] font-bold px-1.5 py-0.2 rounded-md ${
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
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 sm:truncate leading-tight mt-0.5">
                                {v.description}
                              </p>
                            </div>
                          </div>

                          {/* Sample button & checkmark */}
                          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewVoice(v);
                              }}
                              className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
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
                  <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                    {[
                      { rate: 0.85, label: '0.85x', mobileLabel: '0.85x' },
                      { rate: 1.0, label: '1.0x (Normal)', mobileLabel: '1.0x' },
                      { rate: 1.15, label: '1.15x', mobileLabel: '1.15x' },
                      { rate: 1.25, label: '1.25x', mobileLabel: '1.25x' }
                    ].map(item => (
                      <button
                        key={item.rate}
                        type="button"
                        onClick={() => {
                          setSpeechRate(item.rate);
                          try { localStorage.setItem('study_tutor_speech_rate', String(item.rate)); } catch {}
                        }}
                        className={`py-1.5 px-1 sm:px-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer text-center ${
                          speechRate === item.rate
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="sm:hidden">{item.mobileLabel}</span>
                        <span className="hidden sm:inline">{item.label}</span>
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
            className="px-2 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-850 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-750/80 hover:border-rose-200 dark:hover:border-rose-900/50 active:scale-95 shadow-2xs whitespace-nowrap shrink-0"
            title="Clear current conversation history while keeping workspace open"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="hidden sm:inline">Clear Chat</span>
            <span className="sm:hidden">Clear</span>
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
      <div
        ref={chatScrollContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 custom-scrollbar scroll-smooth"
      >
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          

          {/* Conversation Stream */}
          {messages.map((msg, msgIdx) => {
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

            const isMsgStreaming = streamingMsgId === msg.id && msg.sender === 'ai' && !msg.isError;
            const visibleMsgText = isMsgStreaming
              ? (String(msg.text || '').match(/\S+\s*|\n+/g) || [String(msg.text || '')]).slice(0, streamedWordCount).join('')
              : msg.text;

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
                  
                  {/* AI Message Header with Workspace Material Attribution (only shown when uploaded files were analyzed) */}
                  {msg.sender === 'ai' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          AI Tutor
                        </span>
                        {!msg.isError && msg.id !== 'welcome-msg' && !msg.id.startsWith('welcome-') && msg.activeContextFiles && msg.activeContextFiles.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200/70 dark:border-slate-700/70">
                            <BookOpen className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[220px] sm:max-w-[320px]">
                              {msg.activeWorkspaceContext
                                ? `${msg.activeWorkspaceContext}: ${msg.activeContextFiles.slice(0, 2).join(', ')}${msg.activeContextFiles.length > 2 ? ` +${msg.activeContextFiles.length - 2}` : ''}`
                                : `${msg.activeContextFiles.slice(0, 2).join(', ')}${msg.activeContextFiles.length > 2 ? ` +${msg.activeContextFiles.length - 2}` : ''}`}
                            </span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {msg.time}
                      </span>
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
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="font-bold text-rose-700 dark:text-rose-300 text-xs">
                          Server Error
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 dark:text-rose-300 font-normal leading-relaxed break-words">
                        Something went wrong. There is a server error. Please try again.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
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
                    </div>
                  ) : (
                    renderMessageContent(visibleMsgText, isMsgStreaming)
                  )}

                  {/* Automatically Generated Image / Educational Diagram */}
                  {msg.sender === 'ai' && !isMsgStreaming && msg.generatedImageUrl && (
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
                  {!isMsgStreaming && msg.citations && msg.citations.length > 0 && (
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

                  {/* Clickable Follow-Up Question Chips Inside Each AI Message Bubble */}
                  {msg.sender === 'ai' && !isMsgStreaming && !msg.isError && !msg.isFileReadyBadge && msg.id !== 'welcome-msg' && !msg.id.startsWith('welcome-') && (() => {
                    const effectiveFollowUps = (msg.followUpQuestions && msg.followUpQuestions.length > 0)
                      ? msg.followUpQuestions
                      : [
                          `Explain this concept step by step with an example`,
                          `Summarize the main takeaways simply`,
                          `Create 3 practice quiz questions to test my understanding`
                        ];
                    return (
                      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>Suggested Follow-Up Questions</span>
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                          {effectiveFollowUps.slice(0, 3).map((followUpQ, fqIdx) => (
                            <button
                              key={fqIdx}
                              type="button"
                              disabled={isThinking}
                              onClick={() => handleSend(followUpQ)}
                              className="text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/70 dark:hover:bg-indigo-950/50 border border-slate-200/80 hover:border-indigo-300 dark:border-slate-700/80 dark:hover:border-indigo-700 text-xs font-semibold text-slate-700 hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-300 inline-flex items-center justify-between gap-2 transition-all cursor-pointer disabled:opacity-50 group"
                            >
                              <span>{followUpQ}</span>
                              <Send className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* AI Bubble Actions: Listen (TTS) & Copy */}
                {msg.sender === 'ai' && !isMsgStreaming && !msg.isError && (
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
                          workspaceName: workspace.name,
                          imageUrl: msg.generatedImageUrl,
                          imageCaption: msg.generatedImageCaption,
                        });
                      }}
                      className="hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer transition-colors px-2.5 py-1 rounded-xl text-xs border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-750"
                      title="Share this AI Tutor answer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Share</span>
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

          {/* Crisp Boxless StudyWeb Brand Logo Subtle Scale Indicator */}
          {isThinking && (
            <div className="flex items-center pl-1 py-2" role="status" aria-label="Generating response">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2 }}
                className="relative flex items-center justify-center w-8 h-8"
              >
                <AITutorAvatar
                  workspace={workspace}
                  sizeClass="w-7 h-7 sm:w-8 sm:h-8"
                  animateThinking={true}
                />
              </motion.div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MINIMALIST FULL-WIDTH CHAT INPUT DOCK                        */}
      {/* ============================================================== */}
      <footer className="p-2 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shrink-0">
        <div data-tour="ai-tutor-input-dock" className="max-w-3xl mx-auto space-y-2.5">
          {uploadError && (
            <div className="flex items-start justify-between gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed break-words">{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer shrink-0"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {/* Quick Prompt Suggestions when chat is fresh */}
          {messages.length <= 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider pl-1 shrink-0">Try:</span>
              {[
                { label: "📂 What is in my study material?", prompt: "What is in my study material? Explain everything uploaded in this workspace." },
                { label: "🎯 Ask me an interview question", prompt: `Ask me a high-impact interview question for ${workspace.name || 'my subject'} and provide a model interview answer.` },
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
          <div
            data-tour="ai-tutor-input-bar"
            className="flex items-end gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-xs max-w-full"
          >
            
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

      <ShareContentModal
        isOpen={!!shareModalData}
        onClose={() => setShareModalData(null)}
        type="ai-answer"
        aiAnswerText={shareModalData?.answer || ''}
        questionText={shareModalData?.question}
        workspaceName={workspace.name}
      />

    </div>
  );
}
