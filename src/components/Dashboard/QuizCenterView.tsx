import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Sparkles,
  Search,
  Globe,
  FileText,
  BookOpen,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
  History,
  Play,
  Trash2,
  ArrowRight,
  ExternalLink,
  Layers,
  ListChecks,
  PenLine,
  GitCompareArrows,
  ToggleLeft,
  BarChart3,
  X,
  Clock,
  Trophy,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Share2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Workspace, WorkspaceFile, WorkspaceNote, QuizQuestionItem } from './WorkspaceTypes';
import InteractiveQuizRunner from './InteractiveQuizRunner';
import {
  triggerNativeDeviceShare,
  resolveShareDisplayName
} from './ShareContentModal';
import { recordUserActivity } from '../../utils/userActivity';
import {
  SavedQuizSession,
  QuizAttemptRecord,
  PendingQuizIntent,
  QuizDraftState,
  QuizRunnerProgress,
  ServiceWorkerQuizCacheStats,
  loadQuizHistory,
  saveQuizSession,
  updateQuizSessionScore,
  deleteQuizSession,
  loadQuizDraftState,
  saveQuizDraftState,
  hydrateQuizHistoryFromCloud,
  hydrateQuizHistoryFromServiceWorkerCache,
  hydrateQuizDraftFromServiceWorkerCache,
  getServiceWorkerQuizCacheStats
} from '../../utils/quizHistoryStorage';

interface QuizCenterViewProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace | null) => void;
  onUpdateWorkspace: (ws: Workspace) => void;
  pendingQuizIntent?: PendingQuizIntent | null;
  onClearPendingQuizIntent?: () => void;
}

interface MaterialAnalysisResult {
  summary: string;
  detectedTopics: string[];
  keyConcepts: string[];
  recommendedQuestionCount?: number;
}

interface InternetSourceItem {
  id: string;
  name: string;
  type?: string;
  resourceCategory?: string;
  sourcePlatform?: string;
  domain?: string;
  url?: string;
  summary?: string;
  transcription?: string;
  highlights?: string[];
}

type QuizTypeOption = 'MCQ' | 'FillBlank' | 'MatchFollowing' | 'TF';
type DifficultyOption = 'Easy' | 'Medium' | 'Hard';

const QUIZ_TYPE_META: Array<{
  id: QuizTypeOption;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'MCQ',
    label: 'Multiple Choice',
    shortDesc: '4-option questions',
    icon: ListChecks
  },
  {
    id: 'FillBlank',
    label: 'Fill in the Blanks',
    shortDesc: 'Recall exact key terms',
    icon: PenLine
  },
  {
    id: 'MatchFollowing',
    label: 'Match the Following',
    shortDesc: 'Pair related concepts',
    icon: GitCompareArrows
  },
  {
    id: 'TF',
    label: 'True / False',
    shortDesc: 'Rapid concept checks',
    icon: ToggleLeft
  }
];

function getQuizTypeLabel(t: string): string {
  switch (t) {
    case 'FillBlank':
      return 'Fill in the Blanks';
    case 'MatchFollowing':
      return 'Match the Following';
    case 'TF':
      return 'True / False';
    default:
      return 'MCQ';
  }
}

async function getSupabaseAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {}
  return headers;
}

function formatAttemptTimestamp(iso?: string): string {
  if (!iso) return 'Previously completed';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Previously completed';
  return `${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })} · ${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })}`;
}

function formatAttemptDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const safe = Math.max(1, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function getQuizTierLabel(pct: number): string {
  if (pct >= 90) return 'Mastery';
  if (pct >= 70) return 'Proficient';
  if (pct >= 50) return 'Developing';
  return 'Needs Practice';
}

function getSessionAttempts(session: SavedQuizSession): QuizAttemptRecord[] {
  if (Array.isArray(session.attempts) && session.attempts.length > 0) {
    return session.attempts;
  }
  if (typeof session.lastPercentage === 'number' || typeof session.lastScore === 'number') {
    const total = Math.max(1, session.questionCount || session.questions?.length || 1);
    const score =
      typeof session.lastScore === 'number'
        ? session.lastScore
        : Math.round(((session.lastPercentage || 0) / 100) * total);
    const percentage =
      typeof session.lastPercentage === 'number'
        ? session.lastPercentage
        : Math.round((score / total) * 100);
    return [
      {
        id: `legacy-${session.id}`,
        score,
        total,
        percentage,
        completedAt: session.lastAttemptedAt || session.createdAt,
        topicBreakdown: session.topicBreakdown
      }
    ];
  }
  return [];
}

export default function QuizCenterView({
  workspaces,
  activeWorkspace,
  onUpdateWorkspace,
  pendingQuizIntent,
  onClearPendingQuizIntent
}: QuizCenterViewProps) {
  const initialDraftRef = useRef<QuizDraftState | null>(loadQuizDraftState());
  const initialHistoryRef = useRef<SavedQuizSession[]>(loadQuizHistory());

  const [sourceMode, setSourceMode] = useState<'uploaded' | 'internet'>(
    () => initialDraftRef.current?.sourceMode || 'uploaded'
  );

  // Uploaded materials selection
  const [workspaceFilterId, setWorkspaceFilterId] = useState<string>(
    () => initialDraftRef.current?.workspaceFilterId || activeWorkspace?.id || 'all'
  );
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(
    () => initialDraftRef.current?.selectedFileIds || []
  );
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(
    () => initialDraftRef.current?.selectedNoteIds || []
  );

  // Internet resources search & selection
  const [webQuery, setWebQuery] = useState(() => initialDraftRef.current?.webQuery || '');
  const [webResourceType, setWebResourceType] = useState<'all' | 'text' | 'wikipedia' | 'pdf' | 'video'>(
    () => initialDraftRef.current?.webResourceType || 'all'
  );
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [webSearchBrief, setWebSearchBrief] = useState<string>(
    () => initialDraftRef.current?.webSearchBrief || ''
  );
  const [webSources, setWebSources] = useState<InternetSourceItem[]>(
    () => (Array.isArray(initialDraftRef.current?.webSources) ? initialDraftRef.current!.webSources : [])
  );
  const [selectedWebSourceIds, setSelectedWebSourceIds] = useState<string[]>(
    () => (Array.isArray(initialDraftRef.current?.selectedWebSourceIds) ? initialDraftRef.current!.selectedWebSourceIds : [])
  );

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MaterialAnalysisResult | null>(
    () => initialDraftRef.current?.analysisResult || null
  );
  const [selectedFocusTopics, setSelectedFocusTopics] = useState<string[]>(
    () => (Array.isArray(initialDraftRef.current?.selectedFocusTopics) ? initialDraftRef.current!.selectedFocusTopics : [])
  );

  // Quiz configuration
  const [quizType, setQuizType] = useState<QuizTypeOption>(
    () => initialDraftRef.current?.quizType || 'MCQ'
  );
  const [questionCount, setQuestionCount] = useState<number>(
    () => initialDraftRef.current?.questionCount || 5
  );
  const [difficulty, setDifficulty] = useState<DifficultyOption>(
    () => initialDraftRef.current?.difficulty || 'Medium'
  );

  // History persistence + Service Worker offline cache state
  const [quizHistory, setQuizHistory] = useState<SavedQuizSession[]>(() => initialHistoryRef.current);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [swCacheStats, setSwCacheStats] = useState<ServiceWorkerQuizCacheStats | null>(null);

  // Generation & active quiz session
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<SavedQuizSession | null>(() => {
    const activeId = initialDraftRef.current?.activeSessionId;
    if (!activeId) return null;
    return initialHistoryRef.current.find((s) => s.id === activeId) || null;
  });
  const [runnerProgress, setRunnerProgress] = useState<QuizRunnerProgress | null>(
    () => initialDraftRef.current?.runnerProgress || null
  );
  const [viewingHistorySession, setViewingHistorySession] = useState<SavedQuizSession | null>(null);
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState<number>(0);
  const [quizToDelete, setQuizToDelete] = useState<SavedQuizSession | null>(null);

  // Close delete confirmation modal on Escape key
  useEffect(() => {
    if (!quizToDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuizToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quizToDelete]);

  // Hydrate generated quizzes & active review progress from Service Worker CacheStorage + Cloud on mount and connectivity changes
  useEffect(() => {
    let isMounted = true;

    const syncAndHydrate = async () => {
      const [hydratedSwHistory, hydratedDraft, hydratedCloudHistory] = await Promise.all([
        hydrateQuizHistoryFromServiceWorkerCache(),
        hydrateQuizDraftFromServiceWorkerCache(),
        hydrateQuizHistoryFromCloud()
      ]);
      if (!isMounted) return;
      const latestHistory =
        hydratedCloudHistory.length > 0
          ? hydratedCloudHistory
          : hydratedSwHistory.length > 0
          ? hydratedSwHistory
          : loadQuizHistory();

      setQuizHistory(latestHistory);
      if (hydratedDraft && hydratedDraft.activeSessionId && !activeSession) {
        const matchedSession = latestHistory.find((s) => s.id === hydratedDraft.activeSessionId);
        if (matchedSession) {
          setActiveSession(matchedSession);
          if (hydratedDraft.runnerProgress) {
            setRunnerProgress(hydratedDraft.runnerProgress);
          }
        }
      }
      const stats = await getServiceWorkerQuizCacheStats();
      if (isMounted) {
        setSwCacheStats(stats);
      }
    };

    syncAndHydrate();

    const handleOnline = () => {
      setIsOnline(true);
      syncAndHydrate();
    };
    const handleOffline = () => {
      setIsOnline(false);
      syncAndHydrate();
    };
    const handleQuizHistoryUpdated = () => {
      if (!isMounted) return;
      const fresh = loadQuizHistory();
      setQuizHistory(fresh);
      setViewingHistorySession((prev) =>
        prev ? fresh.find((s) => s.id === prev.id) || prev : null
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('studyweb-quiz-history-updated', handleQuizHistoryUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('studyweb-quiz-history-updated', handleQuizHistoryUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getServiceWorkerQuizCacheStats()
      .then((stats) => setSwCacheStats(stats))
      .catch(() => {});
  }, [quizHistory]);

  const handledIntentRef = useRef<string | null>(null);
  const hasInitializedSelectionRef = useRef<boolean>(Boolean(initialDraftRef.current));
  const SEEN_WEB_SOURCES_STORAGE_KEY = 'studyweb_quiz_seen_web_sources_v1';

  const loadTopicSearchMemory = (topicKey: string): { urls: string[]; titles: string[]; attempts: number } => {
    try {
      const raw = localStorage.getItem(SEEN_WEB_SOURCES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const entry = parsed?.[topicKey];
      if (entry && typeof entry === 'object') {
        return {
          urls: Array.isArray(entry.urls) ? entry.urls : [],
          titles: Array.isArray(entry.titles) ? entry.titles : [],
          attempts: typeof entry.attempts === 'number' ? entry.attempts : 0
        };
      }
    } catch {}
    return { urls: [], titles: [], attempts: 0 };
  };

  const saveTopicSearchMemory = (
    topicKey: string,
    newUrls: string[],
    newTitles: string[],
    nextAttempts: number
  ) => {
    try {
      const raw = localStorage.getItem(SEEN_WEB_SOURCES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const prev = parsed?.[topicKey] || { urls: [], titles: [], attempts: 0 };
      const mergedUrls = Array.from(new Set([...(Array.isArray(prev.urls) ? prev.urls : []), ...newUrls])).slice(-60);
      const mergedTitles = Array.from(new Set([...(Array.isArray(prev.titles) ? prev.titles : []), ...newTitles])).slice(-60);
      parsed[topicKey] = {
        urls: mergedUrls,
        titles: mergedTitles,
        attempts: nextAttempts,
        updatedAt: Date.now()
      };
      localStorage.setItem(SEEN_WEB_SOURCES_STORAGE_KEY, JSON.stringify(parsed));
    } catch {}
  };

  // Build deduplicated list of uploaded files & notes for current filter
  const { visibleFiles, visibleNotes } = useMemo(() => {
    const targetWorkspaces =
      workspaceFilterId === 'all'
        ? workspaces
        : workspaces.filter((w) => w.id === workspaceFilterId);

    const files: Array<WorkspaceFile & { workspaceId: string; workspaceName: string }> = [];
    const notes: Array<WorkspaceNote & { workspaceId: string; workspaceName: string }> = [];

    targetWorkspaces.forEach((ws) => {
      (ws.files || []).forEach((f) => {
        if (!f || !f.id) return;
        files.push({ ...f, workspaceId: ws.id, workspaceName: ws.name });
      });
      (ws.notes || []).forEach((n) => {
        if (!n || !n.id) return;
        notes.push({ ...n, workspaceId: ws.id, workspaceName: ws.name });
      });
    });

    return { visibleFiles: files, visibleNotes: notes };
  }, [workspaces, workspaceFilterId]);

  // Auto-select available materials only when no prior saved draft selection exists
  useEffect(() => {
    if (visibleFiles.length > 0 || visibleNotes.length > 0) {
      if (!hasInitializedSelectionRef.current) {
        hasInitializedSelectionRef.current = true;
        setSelectedFileIds(visibleFiles.map((f) => f.id));
        setSelectedNoteIds(visibleNotes.map((n) => n.id));
      } else {
        setSelectedFileIds((prev) => prev.filter((id) => visibleFiles.some((f) => f.id === id)));
        setSelectedNoteIds((prev) => prev.filter((id) => visibleNotes.some((n) => n.id === id)));
      }
    } else {
      setSelectedFileIds([]);
      setSelectedNoteIds([]);
    }
  }, [visibleFiles, visibleNotes]);

  // Continuously persist Quizzes builder + active runner state across tab switches & reloads
  useEffect(() => {
    saveQuizDraftState({
      sourceMode,
      workspaceFilterId,
      selectedFileIds,
      selectedNoteIds,
      webQuery,
      webResourceType,
      webSearchBrief,
      webSources,
      selectedWebSourceIds,
      analysisResult,
      selectedFocusTopics,
      quizType,
      questionCount,
      difficulty,
      activeSessionId: activeSession?.id || null,
      runnerProgress: activeSession ? runnerProgress : null
    });
  }, [
    sourceMode,
    workspaceFilterId,
    selectedFileIds,
    selectedNoteIds,
    webQuery,
    webResourceType,
    webSearchBrief,
    webSources,
    selectedWebSourceIds,
    analysisResult,
    selectedFocusTopics,
    quizType,
    questionCount,
    difficulty,
    activeSession,
    runnerProgress
  ]);

  // Clear stale analysis when selection or source mode changes meaningfully
  const clearAnalysis = () => {
    setAnalysisResult(null);
    setSelectedFocusTopics([]);
    setStatusNotice(null);
  };

  const toggleFileSelection = (id: string) => {
    clearAnalysis();
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleNoteSelection = (id: string) => {
    clearAnalysis();
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllUploaded = () => {
    clearAnalysis();
    setSelectedFileIds(visibleFiles.map((f) => f.id));
    setSelectedNoteIds(visibleNotes.map((n) => n.id));
  };

  const handleClearAllUploaded = () => {
    clearAnalysis();
    setSelectedFileIds([]);
    setSelectedNoteIds([]);
  };

  const toggleWebSourceSelection = (id: string) => {
    clearAnalysis();
    setSelectedWebSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllWebSources = () => {
    clearAnalysis();
    setSelectedWebSourceIds(webSources.map((s) => s.id));
  };

  const handleClearAllWebSources = () => {
    clearAnalysis();
    setSelectedWebSourceIds([]);
  };

  const toggleFocusTopic = (topic: string) => {
    setSelectedFocusTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const compactFilePayload = (f: WorkspaceFile) => {
    let hydratedBase64 = typeof f.fileBase64 === 'string' ? f.fileBase64 : undefined;
    let hydratedMime = f.fileMimeType;
    if (!hydratedBase64 && typeof f.url === 'string' && f.url.startsWith('data:')) {
      const m = f.url.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        hydratedMime = hydratedMime || m[1];
        hydratedBase64 = m[2];
      }
    }
    return {
      id: f.id,
      name: f.name,
      type: f.type,
      summary: f.summary,
      transcription: f.transcription || f.contentText,
      highlights: f.highlights,
      url: typeof f.url === 'string' && !f.url.startsWith('data:') ? f.url : undefined,
      fileBase64: hydratedBase64 && hydratedBase64.length < 5_000_000 ? hydratedBase64 : undefined,
      fileMimeType: hydratedMime
    };
  };

  const runMaterialAnalysis = async (params?: {
    mode?: 'uploaded' | 'internet';
    filesOverride?: WorkspaceFile[];
    notesOverride?: WorkspaceNote[];
    webSourcesOverride?: InternetSourceItem[];
    topicOverride?: string;
  }): Promise<MaterialAnalysisResult | null> => {
    const mode = params?.mode || sourceMode;
    const filesToAnalyze =
      params?.filesOverride ??
      visibleFiles.filter((f) => selectedFileIds.includes(f.id));
    const notesToAnalyze =
      params?.notesOverride ??
      visibleNotes.filter((n) => selectedNoteIds.includes(n.id));
    const internetList =
      params?.webSourcesOverride ??
      webSources.filter((s) => selectedWebSourceIds.includes(s.id));
    const topicStr = (params?.topicOverride ?? webQuery).trim();

    if (mode === 'uploaded' && filesToAnalyze.length === 0 && notesToAnalyze.length === 0) {
      setStatusNotice('Select at least one uploaded file or note to analyze.');
      return null;
    }
    if (mode === 'internet' && internetList.length === 0) {
      setStatusNotice(
        webSources.length > 0
          ? 'Please select at least 1 web source from the list to analyze.'
          : 'Search for a topic and select at least 1 web source to analyze.'
      );
      return null;
    }

    setIsAnalyzing(true);
    setStatusNotice(null);
    try {
      const headers = await getSupabaseAuthHeaders();
      const res = await fetch('/api/analyze-quiz-materials', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspaceId: workspaceFilterId !== 'all' ? workspaceFilterId : activeWorkspace?.id,
          files: mode === 'uploaded' ? filesToAnalyze.slice(0, 8).map(compactFilePayload) : [],
          notes: mode === 'uploaded' ? notesToAnalyze.slice(0, 8) : [],
          internetTopic: mode === 'internet' ? topicStr : '',
          internetSources: mode === 'internet' ? internetList.slice(0, 6) : []
        })
      });

      const data = await res.json().catch(() => null);
      if (data && (data.summary || Array.isArray(data.detectedTopics))) {
        const result: MaterialAnalysisResult = {
          summary: String(data.summary || 'Materials analyzed and ready for quiz generation.'),
          detectedTopics: Array.isArray(data.detectedTopics) ? data.detectedTopics : [],
          keyConcepts: Array.isArray(data.keyConcepts) ? data.keyConcepts : [],
          recommendedQuestionCount: Number(data.recommendedQuestionCount) || 5
        };
        setAnalysisResult(result);
        setSelectedFocusTopics([]);
        return result;
      }
    } catch (err) {
      console.warn('[QuizCenterView] Material analysis fallback:', err);
    } finally {
      setIsAnalyzing(false);
    }
    return null;
  };

  const handleSearchInternetResources = async (
    queryOverride?: string,
    typeOverride?: 'all' | 'text' | 'wikipedia' | 'pdf' | 'video'
  ): Promise<{ sources: InternetSourceItem[]; brief: string }> => {
    const q = (queryOverride ?? webQuery).trim();
    if (!q) {
      setStatusNotice('Enter a topic to search internet resources.');
      return { sources: [], brief: '' };
    }

    setIsSearchingWeb(true);
    setStatusNotice(null);
    clearAnalysis();

    const topicKey = `${q.toLowerCase()}::${typeOverride || webResourceType}`;
    const memory = loadTopicSearchMemory(topicKey);
    const currentUrls = webSources.map((s) => s.url || '').filter(Boolean);
    const currentTitles = webSources.map((s) => s.name || '').filter(Boolean);
    const excludeUrls = Array.from(new Set([...memory.urls, ...currentUrls]));
    const excludeTitles = Array.from(new Set([...memory.titles, ...currentTitles]));
    const attemptIndex = memory.attempts;

    try {
      const res = await fetch('/api/web-search-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          resourceType: typeOverride || webResourceType,
          subject: activeWorkspace?.subject || '',
          excludeUrls,
          excludeTitles,
          attemptIndex,
          searchSeed: Date.now()
        })
      });
      const data = await res.json().catch(() => null);
      const found: InternetSourceItem[] = Array.isArray(data?.sources) ? data.sources : [];
      const briefText: string = String(data?.researchBrief?.overview || '');

      if (found.length > 0) {
        saveTopicSearchMemory(
          topicKey,
          found.map((s) => s.url || '').filter(Boolean),
          found.map((s) => s.name || '').filter(Boolean),
          attemptIndex + 1
        );
      }

      setWebSources(found);
      setWebSearchBrief(briefText);
      const autoIds = found.slice(0, 3).map((s) => s.id);
      setSelectedWebSourceIds(autoIds);

      if (found.length === 0) {
        setStatusNotice(`No direct web sources matched "${q}". Try searching another keyword.`);
      }
      return { sources: found, brief: briefText };
    } catch (err) {
      console.warn('[QuizCenterView] Internet search error:', err);
      return { sources: [], brief: '' };
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleGenerateQuiz = async (overrides?: {
    mode?: 'uploaded' | 'internet';
    filesOverride?: WorkspaceFile[];
    notesOverride?: WorkspaceNote[];
    webSourcesOverride?: InternetSourceItem[];
    topicOverride?: string;
    quizTypeOverride?: QuizTypeOption;
    countOverride?: number;
    difficultyOverride?: DifficultyOption;
    skipAutoAnalyze?: boolean;
  }) => {
    const mode = overrides?.mode || sourceMode;
    const filesToUse =
      overrides?.filesOverride ??
      visibleFiles.filter((f) => selectedFileIds.includes(f.id));
    const notesToUse =
      overrides?.notesOverride ??
      visibleNotes.filter((n) => selectedNoteIds.includes(n.id));
    const internetList =
      overrides?.webSourcesOverride ??
      webSources.filter((s) => selectedWebSourceIds.includes(s.id));
    const topicStr = (overrides?.topicOverride ?? webQuery).trim();
    const chosenType = overrides?.quizTypeOverride || quizType;
    const chosenCount = Math.min(25, Math.max(1, overrides?.countOverride || questionCount || 5));
    const chosenDifficulty = overrides?.difficultyOverride || difficulty;

    if (mode === 'uploaded' && filesToUse.length === 0 && notesToUse.length === 0) {
      setStatusNotice('Select at least one uploaded file or note before generating a quiz.');
      return;
    }
    if (mode === 'internet' && internetList.length === 0) {
      setStatusNotice(
        webSources.length > 0
          ? 'Please select at least 1 web source before generating a quiz.'
          : 'Search for a topic and select at least 1 web source before generating a quiz.'
      );
      return;
    }

    setStatusNotice(null);

    // Step 1: Analyze materials first if not yet analyzed
    if (!analysisResult && !overrides?.skipAutoAnalyze) {
      await runMaterialAnalysis({
        mode,
        filesOverride: filesToUse,
        notesOverride: notesToUse,
        webSourcesOverride: internetList,
        topicOverride: topicStr
      });
    }

    // Step 2: Generate quiz questions
    setIsGenerating(true);
    try {
      const targetWs =
        workspaces.find((w) => w.id === workspaceFilterId) ||
        activeWorkspace ||
        workspaces[0] ||
        null;

      const headers = await getSupabaseAuthHeaders();
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspaceId: targetWs?.id,
          files: mode === 'uploaded' ? filesToUse.slice(0, 6).map(compactFilePayload) : [],
          notes: mode === 'uploaded' ? notesToUse.slice(0, 6) : [],
          internetTopic: mode === 'internet' ? topicStr : '',
          internetSources: mode === 'internet' ? internetList.slice(0, 6) : [],
          focusTopics: selectedFocusTopics,
          questionType: chosenType,
          count: chosenCount,
          difficulty: chosenDifficulty
        })
      });

      const data = await res.json().catch(() => null);
      const rawQuestions: any[] = Array.isArray(data?.questions) ? data.questions : [];

      if (rawQuestions.length === 0) {
        setStatusNotice('Could not build questions from this selection. Try adding more detail or another topic.');
        return;
      }

      const normalizedQuestions: QuizQuestionItem[] = rawQuestions.map((q: any, idx: number) => ({
        id: q.id || `quiz-${Date.now()}-${idx}`,
        question: String(q.question || `Question ${idx + 1}`),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.map(String) : undefined,
        pairs: Array.isArray(q.pairs)
          ? q.pairs.map((p: any, pIdx: number) => ({
              id: String(p.id || `p${pIdx + 1}`),
              left: String(p.left || ''),
              right: String(p.right || '')
            }))
          : undefined,
        explanation: String(q.explanation || 'Review this core concept in your study notes.'),
        difficulty: (q.difficulty === 'Easy' || q.difficulty === 'Hard' ? q.difficulty : chosenDifficulty) as
          | 'Easy'
          | 'Medium'
          | 'Hard',
        type: (q.type === 'TF' || q.type === 'FillBlank' || q.type === 'MatchFollowing'
          ? q.type
          : chosenType) as QuizQuestionItem['type'],
        topic: typeof q.topic === 'string' ? q.topic : undefined
      }));

      const sourceLabels =
        mode === 'internet'
          ? internetList.length > 0
            ? internetList.map((s) => s.name).slice(0, 3)
            : [topicStr || 'Internet Resource']
          : [...filesToUse.map((f) => f.name), ...notesToUse.map((n) => n.title)].slice(0, 3);

      const sessionTitle =
        mode === 'internet'
          ? `${topicStr || sourceLabels[0] || 'Web Topic'} Quiz`
          : sourceLabels.length === 1
          ? `${sourceLabels[0]} Quiz`
          : `${targetWs?.name || 'Study Materials'} Quiz`;

      const newSession: SavedQuizSession = {
        id: `qsession-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: sessionTitle,
        workspaceId: targetWs?.id || 'general-study',
        workspaceName: targetWs?.name || 'StudyWeb',
        sourceType: mode,
        sourceLabels,
        quizType: chosenType,
        difficulty: chosenDifficulty,
        questionCount: normalizedQuestions.length,
        questions: normalizedQuestions,
        createdAt: new Date().toISOString()
      };

      // Save to Recent Quiz History
      const updatedHistory = saveQuizSession(newSession);
      setQuizHistory(updatedHistory);

      // Save generated questions to target workspace quizzes list as well
      if (targetWs) {
        onUpdateWorkspace({
          ...targetWs,
          quizzes: [...normalizedQuestions, ...(targetWs.quizzes || [])].slice(0, 80)
        });
      }

      recordUserActivity({
        title: `Created ${getQuizTypeLabel(chosenType)} Quiz`,
        detail: `${sessionTitle} · ${normalizedQuestions.length} questions (${chosenDifficulty})`,
        iconType: 'quiz'
      });

      setRunnerProgress(null);
      setActiveSession(newSession);
    } catch (err) {
      console.warn('[QuizCenterView] Quiz generation warning:', err);
      if (!navigator.onLine && quizHistory.length > 0) {
        setStatusNotice(
          'You are currently offline. Your previously generated quizzes are cached by the Service Worker below and ready for immediate offline review.'
        );
      } else {
        setStatusNotice('Unable to finish generating right now. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle cross-view intents (e.g., AI Tutor -> search internet topic & auto-create quiz)
  useEffect(() => {
    if (!pendingQuizIntent) return;
    const intentKey = JSON.stringify(pendingQuizIntent);
    if (handledIntentRef.current === intentKey) return;
    handledIntentRef.current = intentKey;

    const executeIntent = async () => {
      const targetType: QuizTypeOption =
        pendingQuizIntent.quizType && ['MCQ', 'TF', 'FillBlank', 'MatchFollowing'].includes(pendingQuizIntent.quizType)
          ? (pendingQuizIntent.quizType as QuizTypeOption)
          : 'MCQ';
      const targetDiff: DifficultyOption =
        pendingQuizIntent.difficulty && ['Easy', 'Medium', 'Hard'].includes(pendingQuizIntent.difficulty)
          ? (pendingQuizIntent.difficulty as DifficultyOption)
          : 'Medium';
      const targetCount = Math.min(25, Math.max(1, Number(pendingQuizIntent.count) || 5));

      setActiveSession(null);
      setRunnerProgress(null);
      setQuizType(targetType);
      setDifficulty(targetDiff);
      setQuestionCount(targetCount);

      if (pendingQuizIntent.workspaceId) {
        setWorkspaceFilterId(pendingQuizIntent.workspaceId);
      }

      const mode =
        pendingQuizIntent.sourceType === 'internet' || (pendingQuizIntent.topic && !pendingQuizIntent.workspaceId)
          ? 'internet'
          : 'uploaded';
      setSourceMode(mode);

      if (mode === 'internet' && pendingQuizIntent.topic) {
        const topic = pendingQuizIntent.topic.trim();
        setWebQuery(topic);
        onClearPendingQuizIntent?.();
        const { sources } = await handleSearchInternetResources(topic, 'all');
        const chosenSources = sources.slice(0, 3);
        if (pendingQuizIntent.autoStart !== false) {
          await handleGenerateQuiz({
            mode: 'internet',
            webSourcesOverride: chosenSources,
            topicOverride: topic,
            quizTypeOverride: targetType,
            countOverride: targetCount,
            difficultyOverride: targetDiff
          });
        }
      } else {
        const targetWs =
          workspaces.find((w) => w.id === pendingQuizIntent.workspaceId) ||
          activeWorkspace ||
          workspaces[0];
        const allWsFiles = targetWs ? targetWs.files || [] : workspaces.flatMap((w) => w.files || []);
        const allWsNotes = targetWs ? targetWs.notes || [] : workspaces.flatMap((w) => w.notes || []);
        setSelectedFileIds(allWsFiles.map((f) => f.id));
        setSelectedNoteIds(allWsNotes.map((n) => n.id));
        onClearPendingQuizIntent?.();

        if (pendingQuizIntent.autoStart !== false && (allWsFiles.length > 0 || allWsNotes.length > 0)) {
          await handleGenerateQuiz({
            mode: 'uploaded',
            filesOverride: allWsFiles,
            notesOverride: allWsNotes,
            quizTypeOverride: targetType,
            countOverride: targetCount,
            difficultyOverride: targetDiff
          });
        } else if (pendingQuizIntent.topic) {
          // Fallback to internet if workspace has no uploaded materials yet
          setSourceMode('internet');
          setWebQuery(pendingQuizIntent.topic);
          const { sources } = await handleSearchInternetResources(pendingQuizIntent.topic, 'all');
          await handleGenerateQuiz({
            mode: 'internet',
            webSourcesOverride: sources.slice(0, 3),
            topicOverride: pendingQuizIntent.topic,
            quizTypeOverride: targetType,
            countOverride: targetCount,
            difficultyOverride: targetDiff
          });
        }
      }
    };

    executeIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuizIntent]);

  // If playing or reviewing a generated/retaken quiz
  if (activeSession) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <InteractiveQuizRunner
          sessionId={activeSession.id}
          title={activeSession.title}
          subtitle={`${getQuizTypeLabel(activeSession.quizType)} · ${activeSession.difficulty} · ${activeSession.questions.length} Questions`}
          questions={activeSession.questions}
          initialProgress={runnerProgress}
          onProgressChange={setRunnerProgress}
          exitLabel="Back to Quizzes"
          onExit={() => {
            setActiveSession(null);
            setRunnerProgress(null);
          }}
          onComplete={(score, total, topicBreakdown, meta) => {
            const updated = updateQuizSessionScore(
              activeSession.id,
              score,
              total,
              topicBreakdown,
              meta
            );
            setQuizHistory(updated);
            recordUserActivity({
              title: 'Completed Quiz',
              detail: `${activeSession.title}: ${score}/${total} (${Math.round((score / Math.max(1, total)) * 100)}%)`,
              iconType: 'quiz'
            });
          }}
        />
      </div>
    );
  }

  const totalUploadedCount = visibleFiles.length + visibleNotes.length;
  const selectedUploadedCount = selectedFileIds.length + selectedNoteIds.length;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 text-left">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-[#5145F5] dark:text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Quizzes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze your uploaded materials or search internet resources, then customize and take interactive quizzes.
          </p>
        </div>

        {/* Source Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setSourceMode('uploaded');
              clearAnalysis();
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px] ${
              sourceMode === 'uploaded'
                ? 'bg-white dark:bg-slate-800 text-[#5145F5] dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Uploaded Materials</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceMode('internet');
              clearAnalysis();
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px] ${
              sourceMode === 'internet'
                ? 'bg-white dark:bg-slate-800 text-[#5145F5] dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Internet Resources</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 cols): Source Selection & Material Analysis */}
        <div className="lg:col-span-7 space-y-4">
          {sourceMode === 'uploaded' ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    1. Select Uploaded Materials
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {selectedUploadedCount} of {totalUploadedCount} items selected
                  </p>
                </div>

                <select
                  value={workspaceFilterId}
                  onChange={(e) => {
                    setWorkspaceFilterId(e.target.value);
                    clearAnalysis();
                  }}
                  aria-label="Filter by workspace"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#5145F5] min-h-[40px]"
                >
                  <option value="all">All Workspaces ({workspaces.length})</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name} ({(ws.files?.length || 0) + (ws.notes?.length || 0)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select / Clear Quick Actions */}
              {totalUploadedCount > 0 && (
                <div className="flex items-center justify-between gap-2 text-xs pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSelectAllUploaded}
                      className="font-bold text-[#5145F5] dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllUploaded}
                      className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={isAnalyzing || selectedUploadedCount === 0}
                    onClick={() => runMaterialAnalysis()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#5145F5] dark:text-indigo-300 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Materials'}</span>
                  </button>
                </div>
              )}

              {/* Files & Notes Checklist */}
              {totalUploadedCount === 0 ? (
                <div className="py-10 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                  <FileText className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      No uploaded files or notes found here
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Upload PDFs, images, or notes inside a workspace—or switch to Internet Resources to search any topic online.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSourceMode('internet')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5145F5] text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Search Internet Resources Instead</span>
                  </button>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {visibleFiles.map((file) => {
                    const checked = selectedFileIds.includes(file.id);
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => toggleFileSelection(file.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${
                          checked
                            ? 'border-[#5145F5] bg-indigo-50/50 dark:bg-indigo-950/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-[#5145F5] dark:text-indigo-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {file.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {file.workspaceName} · {(file.type || 'file').toUpperCase()}
                            {file.size ? ` · ${file.size}` : ''}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {visibleNotes.map((note) => {
                    const checked = selectedNoteIds.includes(note.id);
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => toggleNoteSelection(note.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${
                          checked
                            ? 'border-[#5145F5] bg-indigo-50/50 dark:bg-indigo-950/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-[#5145F5] dark:text-indigo-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {note.title || 'Study Note'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {note.workspaceName} · Note
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* INTERNET RESOURCES TAB */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-xs">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  1. Search Internet Resources
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Search any topic across web guides, Wikipedia, academic PDFs, and lectures to create grounded quizzes.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchInternetResources();
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    placeholder="e.g., Photosynthesis, World War II, Linear Algebra..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#5145F5] min-h-[44px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingWeb || !webQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#5145F5] hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap min-h-[44px]"
                >
                  {isSearchingWeb ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>{isSearchingWeb ? 'Searching...' : 'Search Web'}</span>
                </button>
              </form>

              {/* Resource type filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All Sources' },
                    { id: 'wikipedia', label: 'Wikipedia' },
                    { id: 'pdf', label: 'Academic PDFs' },
                    { id: 'video', label: 'Lectures' },
                    { id: 'text', label: 'Articles' }
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setWebResourceType(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      webResourceType === item.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-[#5145F5] text-[#5145F5] dark:text-indigo-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Search Brief & Selectable Sources */}
              {webSearchBrief && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">Topic Overview</div>
                  <p>{webSearchBrief.replace(/\*\*/g, '')}</p>
                </div>
              )}

              {webSources.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                        {selectedWebSourceIds.length} of {webSources.length} web sources selected
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllWebSources}
                        className="font-bold text-[#5145F5] dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllWebSources}
                        className="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={isAnalyzing || selectedWebSourceIds.length === 0}
                      onClick={() => runMaterialAnalysis()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#5145F5] dark:text-indigo-300 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Selected Sources'}</span>
                    </button>
                  </div>
                  {selectedWebSourceIds.length === 0 && (
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Select at least 1 web source below to analyze and generate a quiz.
                    </p>
                  )}

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {webSources.map((src) => {
                      const checked = selectedWebSourceIds.includes(src.id);
                      return (
                        <div
                          key={src.id}
                          onClick={() => toggleWebSourceSelection(src.id)}
                          className={`p-3 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${
                            checked
                              ? 'border-[#5145F5] bg-indigo-50/50 dark:bg-indigo-950/30'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                          }`}
                        >
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-[#5145F5] dark:text-indigo-400 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                                {src.name}
                              </span>
                              {src.url && (
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-slate-400 hover:text-[#5145F5] shrink-0"
                                  title="Open resource in new tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {src.sourcePlatform || src.domain || 'Web Source'}
                            </div>
                            {src.summary && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                                {src.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Material Analysis Preview Card */}
          {analysisResult && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Analyzed Material Scope</span>
                </div>
                {selectedFocusTopics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedFocusTopics([])}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Clear Topic Filter
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {analysisResult.summary}
              </p>

              {analysisResult.detectedTopics.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Detected Topics (optional: tap to focus)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.detectedTopics.map((topic) => {
                      const active = selectedFocusTopics.includes(topic);
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => toggleFocusTopic(topic)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#5145F5] text-white border-[#5145F5]'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                          }`}
                        >
                          {topic}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {analysisResult.keyConcepts.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Key Concepts Ready to Test
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {analysisResult.keyConcepts.slice(0, 4).map((concept, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-[#5145F5] dark:text-indigo-400 shrink-0 mt-0.5" />
                        <span>{concept}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 cols): Quiz Configurator */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-5 shadow-xs">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              2. Configure Quiz
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose the question format, how many questions you want, and difficulty level.
            </p>
          </div>

          {/* Question Type */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quiz Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUIZ_TYPE_META.map((item) => {
                const Icon = item.icon;
                const active = quizType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQuizType(item.id)}
                    className={`p-3 rounded-xl border text-left transition-colors flex items-start gap-2.5 cursor-pointer min-h-[56px] ${
                      active
                        ? 'border-[#5145F5] bg-indigo-50/60 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        active ? 'text-[#5145F5] dark:text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.shortDesc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Number of Questions
              </label>
              <span className="text-xs font-bold text-[#5145F5] dark:text-indigo-400 tabular-nums">
                {questionCount} Questions
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[5, 10, 15, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuestionCount(preset)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer tabular-nums min-h-[40px] ${
                    questionCount === preset
                      ? 'bg-[#5145F5] text-white border-[#5145F5]'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={25}
                value={questionCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) {
                    setQuestionCount(Math.min(25, Math.max(1, val)));
                  }
                }}
                aria-label="Custom question count"
                className="w-20 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white text-center tabular-nums focus:outline-none focus:border-[#5145F5] min-h-[40px]"
              />
            </div>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Easy', 'Medium', 'Hard'] as DifficultyOption[]).map((level) => {
                const active = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer min-h-[42px] ${
                      active
                        ? 'bg-[#5145F5] text-white border-[#5145F5]'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {statusNotice && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-800 dark:text-amber-200">
              {statusNotice}
            </div>
          )}

          {/* Primary Generate Button */}
          <button
            type="button"
            disabled={
              isAnalyzing ||
              isGenerating ||
              (sourceMode === 'uploaded'
                ? selectedUploadedCount === 0
                : selectedWebSourceIds.length === 0)
            }
            onClick={() => handleGenerateQuiz()}
            className="w-full py-3.5 px-4 rounded-xl bg-[#5145F5] hover:bg-indigo-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
          >
            {isAnalyzing || isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {isAnalyzing
                    ? 'Analyzing Materials...'
                    : `Creating ${questionCount} ${getQuizTypeLabel(quizType)} Questions...`}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze &amp; Generate Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* RECENT QUIZZES HISTORY (CACHED IN SERVICE WORKER FOR OFFLINE REVIEW) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <History className="w-4 h-4 text-[#5145F5] dark:text-indigo-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Recent Quizzes
            </h2>
            {swCacheStats?.swSupported && quizHistory.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30 text-[11px] font-semibold">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>
                  Offline Cache Ready ({swCacheStats.cachedSessionCount}{' '}
                  {swCacheStats.cachedSessionCount === 1 ? 'Quiz' : 'Quizzes'} · {swCacheStats.cachedQuestionCount} Qs)
                </span>
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-400 tabular-nums">
            {quizHistory.length} saved
          </span>
        </div>

        {!isOnline && quizHistory.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <span className="font-medium">
              Offline Mode Active — Your generated quizzes are cached in Service Worker storage so you can continue reviewing and retaking them without internet connectivity.
            </span>
          </div>
        )}

        {quizHistory.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
            Generated quizzes will appear here so you can retake them anytime.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quizHistory.map((item) => {
              const attempts = getSessionAttempts(item);
              const hasPerformance = attempts.length > 0;
              const latestAttempt = attempts[0];
              return (
                <div
                  key={item.id}
                  className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between gap-2.5 sm:gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate tabular-nums">
                      {item.sourceType === 'internet' ? 'Internet' : 'Uploaded'} ·{' '}
                      {getQuizTypeLabel(item.quizType)} · {item.difficulty} · {item.questionCount} Qs
                    </div>
                    {hasPerformance && latestAttempt && (
                      <div className="text-[11px] font-semibold mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
                        <span
                          className={
                            latestAttempt.percentage >= 70
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          Last: {latestAttempt.score}/{latestAttempt.total} ({latestAttempt.percentage}%)
                        </span>
                        <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                    {hasPerformance && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAttemptIdx(0);
                          setViewingHistorySession(item);
                        }}
                        title="Old Performance"
                        aria-label="Old Performance"
                        className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px] sm:min-h-[38px] shrink-0"
                      >
                        <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">Old Performance</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setRunnerProgress(null);
                        setActiveSession(item);
                      }}
                      title="Retake quiz"
                      aria-label="Retake quiz"
                      className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-[#5145F5] hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[36px] sm:min-h-[38px] shrink-0"
                    >
                      <Play className="w-3 h-3 fill-current shrink-0" />
                      <span className="hidden sm:inline">Retake</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuizToDelete(item);
                      }}
                      title="Delete saved quiz"
                      aria-label="Delete saved quiz"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer min-h-[36px] min-w-[36px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OLD PERFORMANCE MODAL (MOBILE-RESPONSIVE) */}
      {viewingHistorySession && (() => {
        const attempts = getSessionAttempts(viewingHistorySession);
        const safeIdx = Math.min(Math.max(0, selectedAttemptIdx), Math.max(0, attempts.length - 1));
        const selectedAttempt = attempts[safeIdx] || null;
        const bestPct =
          attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage)) : 0;
        const latestPct = attempts[0]?.percentage ?? 0;
        const selectedMissed = selectedAttempt
          ? Math.max(0, selectedAttempt.total - selectedAttempt.score)
          : 0;
        const selectedDuration = formatAttemptDuration(selectedAttempt?.durationSeconds);
        const selectedTopics = Array.isArray(selectedAttempt?.topicBreakdown)
          ? selectedAttempt!.topicBreakdown!
          : [];
        const lackingTopics = selectedTopics.filter(
          (t) => t.total > 0 && Math.round((t.correct / t.total) * 100) < 70
        );

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setViewingHistorySession(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="old-performance-modal-title"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[#5145F5] dark:text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                    <span>Old Performance History</span>
                  </div>
                  <h3
                    id="old-performance-modal-title"
                    className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate mt-0.5"
                  >
                    {viewingHistorySession.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                    {getQuizTypeLabel(viewingHistorySession.quizType)} · {viewingHistorySession.difficulty} ·{' '}
                    {viewingHistorySession.questionCount} Questions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingHistorySession(null)}
                  aria-label="Close old performance viewer"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {/* Summary KPI Strip */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1">
                      <Trophy className="w-3 h-3 shrink-0 hidden sm:inline" />
                      <span>Best Score</span>
                    </div>
                    <div className="text-base sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums">
                      {bestPct}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      Latest Score
                    </div>
                    <div className="text-base sm:text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5 tabular-nums">
                      {latestPct}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Attempts
                    </div>
                    <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {attempts.length}
                    </div>
                  </div>
                </div>

                {/* Attempt History Selector */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Past Attempts (newest first)
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {attempts.map((attempt, idx) => {
                      const isSelected = idx === safeIdx;
                      const isPass = attempt.percentage >= 70;
                      const dur = formatAttemptDuration(attempt.durationSeconds);
                      return (
                        <button
                          key={attempt.id}
                          type="button"
                          onClick={() => setSelectedAttemptIdx(idx)}
                          className={`w-full text-left p-3 rounded-xl border transition-colors flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 cursor-pointer ${
                            isSelected
                              ? 'border-[#5145F5] bg-indigo-50/60 dark:bg-indigo-950/40'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>Attempt #{attempts.length - idx}</span>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                                  isPass
                                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                {isPass ? 'Passed' : 'Practice'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums flex flex-wrap items-center gap-x-2">
                              <span>{formatAttemptTimestamp(attempt.completedAt)}</span>
                              {dur && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  <span>{dur}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 tabular-nums">
                            <div
                              className={`text-sm font-extrabold ${
                                isPass
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {attempt.percentage}%
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {attempt.score}/{attempt.total}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Attempt Breakdown */}
                {selectedAttempt && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold tabular-nums">
                      <span className="text-slate-800 dark:text-slate-100 font-bold">
                        Attempt #{attempts.length - safeIdx} Breakdown
                        {selectedDuration ? ` · ${selectedDuration}` : ''}
                      </span>
                      <span
                        className={
                          selectedAttempt.percentage >= 70
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {selectedAttempt.score} Correct · {selectedMissed} Missed ({selectedAttempt.percentage}%)
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden flex">
                      {selectedAttempt.score > 0 && (
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${(selectedAttempt.score / Math.max(1, selectedAttempt.total)) * 100}%`
                          }}
                        />
                      )}
                      {selectedMissed > 0 && (
                        <div
                          className="h-full bg-rose-400 dark:bg-rose-500/80"
                          style={{
                            width: `${(selectedMissed / Math.max(1, selectedAttempt.total)) * 100}%`
                          }}
                        />
                      )}
                    </div>

                    {selectedTopics.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            Topic Breakdown
                          </span>
                          {lackingTopics.length > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Review: {lackingTopics.map((t) => t.topic).join(', ')}</span>
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Strong across all topics</span>
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {selectedTopics.map((t) => {
                            const pct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
                            const isWeak = pct < 70;
                            return (
                              <div key={t.topic} className="space-y-1">
                                <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                                  <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
                                    {t.topic}
                                  </span>
                                  <span
                                    className={`font-semibold shrink-0 ${
                                      isWeak
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }`}
                                  >
                                    {t.correct}/{t.total} ({pct}%)
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${isWeak ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.max(4, pct)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {Array.isArray(selectedAttempt.missedQuestions) &&
                      selectedAttempt.missedQuestions.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Missed Questions ({selectedAttempt.missedQuestions.length})
                          </div>
                          <div className="space-y-2">
                            {selectedAttempt.missedQuestions.map((mq, mqIdx) => (
                              <div
                                key={mqIdx}
                                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                              >
                                <p className="font-bold text-slate-900 dark:text-white leading-snug">
                                  {mq.question}
                                </p>
                                <p className="text-rose-600 dark:text-rose-400">
                                  Your answer: <span className="font-semibold">{mq.userAns}</span>
                                </p>
                                <p className="text-emerald-700 dark:text-emerald-400">
                                  Correct answer: <span className="font-semibold">{mq.correctAns}</span>
                                </p>
                                {mq.explanation && (
                                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                                    {mq.explanation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:flex-wrap items-center justify-end gap-2 shrink-0 bg-slate-50/70 dark:bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => setViewingHistorySession(null)}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                {selectedAttempt && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerNativeDeviceShare({
                        type: 'quiz-result',
                        quizTitle: viewingHistorySession.title,
                        quizScore: selectedAttempt.score,
                        quizTotal: selectedAttempt.total,
                        quizPercentage: selectedAttempt.percentage,
                        quizTier: getQuizTierLabel(selectedAttempt.percentage),
                        quizDurationLabel: selectedDuration || undefined,
                        quizCompletedAt: formatAttemptTimestamp(selectedAttempt.completedAt),
                        userName: resolveShareDisplayName()
                      });
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 min-h-[42px] rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Share Your Old Performance</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const sessionToRetake = viewingHistorySession;
                    setViewingHistorySession(null);
                    setRunnerProgress(null);
                    setActiveSession(sessionToRetake);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[42px] rounded-xl bg-[#5145F5] hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Retake Quiz</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DELETE RECENT QUIZ CONFIRMATION MODAL */}
      {quizToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setQuizToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-quiz-dialog-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="delete-quiz-dialog-title"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
                >
                  Delete Recent Quiz?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Do you want to delete this recent quiz? It will be deleted permanently and will not appear again.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white truncate">
                {quizToDelete.title}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                {getQuizTypeLabel(quizToDelete.quizType)} · {quizToDelete.difficulty} · {quizToDelete.questionCount} Questions
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setQuizToDelete(null)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[38px]"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = deleteQuizSession(quizToDelete.id);
                  setQuizHistory(updated);
                  if (activeSession?.id === quizToDelete.id) {
                    setActiveSession(null);
                    setRunnerProgress(null);
                  }
                  if (viewingHistorySession?.id === quizToDelete.id) {
                    setViewingHistorySession(null);
                  }
                  setQuizToDelete(null);
                }}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[38px] shadow-sm shadow-rose-600/20 inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Yes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
