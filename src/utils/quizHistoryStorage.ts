import { QuizQuestionItem } from '../components/Dashboard/WorkspaceTypes';

export interface QuizTopicResult {
  topic: string;
  correct: number;
  total: number;
}

export interface SavedQuizSession {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  sourceType: 'uploaded' | 'internet';
  sourceLabels: string[];
  quizType: 'MCQ' | 'TF' | 'FillBlank' | 'MatchFollowing';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  questions: QuizQuestionItem[];
  lastScore?: number;
  lastPercentage?: number;
  lastAttemptedAt?: string;
  attemptCount?: number;
  topicBreakdown?: QuizTopicResult[];
  createdAt: string;
}

export interface PendingQuizIntent {
  sourceType?: 'uploaded' | 'internet';
  topic?: string;
  workspaceId?: string;
  fileNames?: string[];
  quizType?: 'MCQ' | 'TF' | 'FillBlank' | 'MatchFollowing';
  count?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  autoStart?: boolean;
}

export interface QuizRunnerProgress {
  sessionId: string;
  currentIdx: number;
  score: number;
  quizFinished: boolean;
  topicResults: Record<string, { correct: number; total: number }>;
  missedQuestions: Array<{
    question: string;
    options: string[];
    userAns: string;
    correctAns: string;
    explanation: string;
  }>;
}

export interface QuizDraftState {
  sourceMode: 'uploaded' | 'internet';
  workspaceFilterId: string;
  selectedFileIds: string[];
  selectedNoteIds: string[];
  webQuery: string;
  webResourceType: 'all' | 'text' | 'wikipedia' | 'pdf' | 'video';
  webSearchBrief: string;
  webSources: any[];
  selectedWebSourceIds: string[];
  analysisResult: {
    summary: string;
    detectedTopics: string[];
    keyConcepts: string[];
    recommendedQuestionCount?: number;
  } | null;
  selectedFocusTopics: string[];
  quizType: 'MCQ' | 'TF' | 'FillBlank' | 'MatchFollowing';
  questionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  activeSessionId: string | null;
  runnerProgress?: QuizRunnerProgress | null;
}

const QUIZ_HISTORY_PREFIX = 'studyweb_quiz_history_v1';
const QUIZ_DRAFT_PREFIX = 'studyweb_quiz_draft_v1';
export const QUIZ_SW_CACHE_NAME = 'studyweb-quiz-data-cache-v1';

export interface ServiceWorkerQuizCacheStats {
  swSupported: boolean;
  swControllerActive: boolean;
  cachedSessionCount: number;
  cachedQuestionCount: number;
  lastSyncedAt: string | null;
}

function getActiveUid(): string {
  if (typeof window === 'undefined') return 'guest';
  return localStorage.getItem('studyweb_active_user_id') || 'guest';
}

function getQuizHistoryKey(): string {
  return `${QUIZ_HISTORY_PREFIX}_${getActiveUid()}`;
}

function getQuizDraftKey(): string {
  return `${QUIZ_DRAFT_PREFIX}_${getActiveUid()}`;
}

function getSwHistoryCacheUrl(uid = getActiveUid()): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}/__sw-quiz-cache/history/${encodeURIComponent(uid)}`;
}

function getSwSessionCacheUrl(sessionId: string, uid = getActiveUid()): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}/__sw-quiz-cache/session/${encodeURIComponent(uid)}/${encodeURIComponent(sessionId)}`;
}

function getSwDraftCacheUrl(uid = getActiveUid()): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `${origin}/__sw-quiz-cache/draft/${encodeURIComponent(uid)}`;
}

function createSwJsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-StudyWeb-SW-Cache': 'true',
      'Cache-Control': 'no-store'
    }
  });
}

/**
 * Synchronizes generated quiz sessions into the Service Worker CacheStorage
 * (both directly via `window.caches` and via Service Worker `postMessage`)
 * so students can continue reviewing their quizzes offline.
 */
export async function syncQuizHistoryToServiceWorkerCache(
  sessions: SavedQuizSession[]
): Promise<void> {
  if (typeof window === 'undefined') return;
  const uid = getActiveUid();

  // 1. Write directly to shared CacheStorage so it is immediately available even before SW claims client
  if ('caches' in window) {
    try {
      const cache = await window.caches.open(QUIZ_SW_CACHE_NAME);
      await cache.put(
        getSwHistoryCacheUrl(uid),
        createSwJsonResponse({
          uid,
          updatedAt: new Date().toISOString(),
          sessions
        })
      );
      await Promise.all(
        sessions.map((session) =>
          session?.id
            ? cache.put(getSwSessionCacheUrl(session.id, uid), createSwJsonResponse(session))
            : Promise.resolve()
        )
      );
    } catch (err) {
      console.warn('[QuizHistoryStorage] CacheStorage write notice:', err);
    }
  }

  // 2. Notify active Service Worker controller
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_QUIZ_HISTORY',
        uid,
        sessions
      });
    } catch {}
  }
}

/**
 * Hydrates generated quiz sessions from the Service Worker CacheStorage,
 * merging with any existing localStorage sessions so zero quizzes are lost offline.
 */
export async function hydrateQuizHistoryFromServiceWorkerCache(): Promise<SavedQuizSession[]> {
  const localSessions = loadQuizHistory();
  if (typeof window === 'undefined') return localSessions;

  const uid = getActiveUid();
  let swSessions: SavedQuizSession[] = [];

  // Try virtual Service Worker endpoint or direct CacheStorage read
  try {
    if ('caches' in window) {
      const cache = await window.caches.open(QUIZ_SW_CACHE_NAME);
      const cachedResp = await cache.match(getSwHistoryCacheUrl(uid));
      if (cachedResp) {
        const data = await cachedResp.json().catch(() => null);
        if (Array.isArray(data?.sessions)) {
          swSessions = data.sessions;
        }
      }
    }
  } catch {}

  if (swSessions.length === 0 && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const resp = await fetch(`/__sw-quiz-cache/history/${encodeURIComponent(uid)}`);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (Array.isArray(data?.sessions)) {
          swSessions = data.sessions;
        }
      }
    } catch {}
  }

  if (swSessions.length === 0) {
    if (localSessions.length > 0) {
      void syncQuizHistoryToServiceWorkerCache(localSessions);
    }
    return localSessions;
  }

  // Merge local and Service Worker cached sessions by id (preferring whichever has the latest attempt count / score)
  const mergedMap = new Map<string, SavedQuizSession>();
  for (const s of [...swSessions, ...localSessions]) {
    if (!s || !s.id || !Array.isArray(s.questions)) continue;
    const prev = mergedMap.get(s.id);
    if (!prev) {
      mergedMap.set(s.id, s);
    } else {
      const prevAttempts = prev.attemptCount || 0;
      const currAttempts = s.attemptCount || 0;
      mergedMap.set(s.id, currAttempts >= prevAttempts ? s : prev);
    }
  }

  const merged = Array.from(mergedMap.values())
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 40);

  try {
    localStorage.setItem(getQuizHistoryKey(), JSON.stringify(merged));
  } catch {}
  void syncQuizHistoryToServiceWorkerCache(merged);
  return merged;
}

export async function syncQuizDraftToServiceWorkerCache(
  draft: QuizDraftState | null
): Promise<void> {
  if (typeof window === 'undefined') return;
  const uid = getActiveUid();

  if ('caches' in window) {
    try {
      const cache = await window.caches.open(QUIZ_SW_CACHE_NAME);
      if (draft) {
        await cache.put(
          getSwDraftCacheUrl(uid),
          createSwJsonResponse({
            uid,
            updatedAt: new Date().toISOString(),
            draft
          })
        );
      } else {
        await cache.delete(getSwDraftCacheUrl(uid));
      }
    } catch {}
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_QUIZ_DRAFT',
        uid,
        draft
      });
    } catch {}
  }
}

export async function hydrateQuizDraftFromServiceWorkerCache(): Promise<QuizDraftState | null> {
  const localDraft = loadQuizDraftState();
  if (localDraft) {
    void syncQuizDraftToServiceWorkerCache(localDraft);
    return localDraft;
  }
  if (typeof window === 'undefined' || !('caches' in window)) return null;

  try {
    const uid = getActiveUid();
    const cache = await window.caches.open(QUIZ_SW_CACHE_NAME);
    const matched = await cache.match(getSwDraftCacheUrl(uid));
    if (matched) {
      const data = await matched.json().catch(() => null);
      if (data?.draft && typeof data.draft === 'object') {
        try {
          localStorage.setItem(getQuizDraftKey(), JSON.stringify(data.draft));
        } catch {}
        return data.draft as QuizDraftState;
      }
    }
  } catch {}
  return null;
}

export async function getServiceWorkerQuizCacheStats(): Promise<ServiceWorkerQuizCacheStats> {
  if (typeof window === 'undefined') {
    return {
      swSupported: false,
      swControllerActive: false,
      cachedSessionCount: 0,
      cachedQuestionCount: 0,
      lastSyncedAt: null
    };
  }

  const swSupported = 'serviceWorker' in navigator && 'caches' in window;
  const swControllerActive = Boolean(
    'serviceWorker' in navigator && navigator.serviceWorker.controller
  );

  let sessions = loadQuizHistory();
  let lastSyncedAt: string | null = null;

  if ('caches' in window) {
    try {
      const uid = getActiveUid();
      const cache = await window.caches.open(QUIZ_SW_CACHE_NAME);
      const matched = await cache.match(getSwHistoryCacheUrl(uid));
      if (matched) {
        const data = await matched.json().catch(() => null);
        if (Array.isArray(data?.sessions)) {
          sessions = data.sessions;
        }
        if (typeof data?.updatedAt === 'string') {
          lastSyncedAt = data.updatedAt;
        }
      }
    } catch {}
  }

  const cachedQuestionCount = sessions.reduce(
    (sum, s) => sum + (Array.isArray(s.questions) ? s.questions.length : s.questionCount || 0),
    0
  );

  return {
    swSupported,
    swControllerActive,
    cachedSessionCount: sessions.length,
    cachedQuestionCount,
    lastSyncedAt
  };
}

export function loadQuizHistory(): SavedQuizSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getQuizHistoryKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuizSession(session: SavedQuizSession): SavedQuizSession[] {
  if (typeof window === 'undefined') return [session];
  const existing = loadQuizHistory().filter((s) => s.id !== session.id);
  const updated = [session, ...existing].slice(0, 40);
  try {
    localStorage.setItem(getQuizHistoryKey(), JSON.stringify(updated));
  } catch (err) {
    console.warn('[QuizHistory] Storage limit reached, trimming older quizzes:', err);
    try {
      localStorage.setItem(getQuizHistoryKey(), JSON.stringify(updated.slice(0, 15)));
    } catch {
      // ignore storage errors
    }
  }
  void syncQuizHistoryToServiceWorkerCache(updated);
  return updated;
}

export function updateQuizSessionScore(
  sessionId: string,
  score: number,
  total: number,
  topicBreakdown?: QuizTopicResult[]
): SavedQuizSession[] {
  const existing = loadQuizHistory();
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const updated = existing.map((item) =>
    item.id === sessionId
      ? {
          ...item,
          lastScore: score,
          lastPercentage: percentage,
          lastAttemptedAt: new Date().toISOString(),
          attemptCount: (item.attemptCount || 0) + 1,
          topicBreakdown: topicBreakdown && topicBreakdown.length > 0 ? topicBreakdown : item.topicBreakdown
        }
      : item
  );
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getQuizHistoryKey(), JSON.stringify(updated));
    } catch {
      // ignore
    }
    void syncQuizHistoryToServiceWorkerCache(updated);
  }
  return updated;
}

export function deleteQuizSession(sessionId: string): SavedQuizSession[] {
  const updated = loadQuizHistory().filter((item) => item.id !== sessionId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getQuizHistoryKey(), JSON.stringify(updated));
      const draft = loadQuizDraftState();
      if (draft && (draft.activeSessionId === sessionId || draft.runnerProgress?.sessionId === sessionId)) {
        saveQuizDraftState({
          ...draft,
          activeSessionId: null,
          runnerProgress: null
        });
      }
    } catch {
      // ignore
    }
    const uid = getActiveUid();
    if ('caches' in window) {
      window.caches
        .open(QUIZ_SW_CACHE_NAME)
        .then((cache) => cache.delete(getSwSessionCacheUrl(sessionId, uid)))
        .catch(() => {});
    }
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'DELETE_QUIZ_SESSION',
          uid,
          sessionId,
          sessions: updated
        });
      } catch {}
    }
    void syncQuizHistoryToServiceWorkerCache(updated);
  }
  return updated;
}

export function loadQuizDraftState(): QuizDraftState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getQuizDraftKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as QuizDraftState) : null;
  } catch {
    return null;
  }
}

export function saveQuizDraftState(draft: QuizDraftState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getQuizDraftKey(), JSON.stringify(draft));
  } catch {
    // Trim heavy webSources transcriptions if quota exceeded
    try {
      const compactSources = Array.isArray(draft.webSources)
        ? draft.webSources.map((s) => ({
            ...s,
            transcription: typeof s.transcription === 'string' ? s.transcription.slice(0, 800) : undefined
          }))
        : [];
      localStorage.setItem(
        getQuizDraftKey(),
        JSON.stringify({ ...draft, webSources: compactSources })
      );
    } catch {
      // ignore
    }
  }
  void syncQuizDraftToServiceWorkerCache(draft);
}

export function clearQuizDraftState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getQuizDraftKey());
  } catch {
    // ignore
  }
  void syncQuizDraftToServiceWorkerCache(null);
}
