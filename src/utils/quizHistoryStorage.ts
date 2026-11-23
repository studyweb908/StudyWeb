import { QuizQuestionItem } from '../components/Dashboard/WorkspaceTypes';
import { supabase } from '../lib/supabase';

export interface QuizTopicResult {
  topic: string;
  correct: number;
  total: number;
}

export interface QuizAttemptMissedItem {
  question: string;
  userAns: string;
  correctAns: string;
  explanation?: string;
}

export interface QuizAttemptRecord {
  id: string;
  score: number;
  total: number;
  percentage: number;
  durationSeconds?: number;
  completedAt: string;
  topicBreakdown?: QuizTopicResult[];
  missedQuestions?: QuizAttemptMissedItem[];
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
  attempts?: QuizAttemptRecord[];
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

function mergeQuizSessionLists(
  primary: SavedQuizSession[],
  secondary: SavedQuizSession[]
): SavedQuizSession[] {
  const mergedMap = new Map<string, SavedQuizSession>();
  for (const raw of [...secondary, ...primary]) {
    if (!raw || !raw.id || !Array.isArray(raw.questions)) continue;
    const prev = mergedMap.get(raw.id);
    if (!prev) {
      mergedMap.set(raw.id, raw);
    } else {
      const prevAttemptsList = Array.isArray(prev.attempts) ? prev.attempts : [];
      const currAttemptsList = Array.isArray(raw.attempts) ? raw.attempts : [];
      const attemptByKey = new Map<string, QuizAttemptRecord>();
      for (const att of [...prevAttemptsList, ...currAttemptsList]) {
        if (!att) continue;
        const key = att.id || `${att.completedAt}_${att.score}_${att.total}`;
        attemptByKey.set(key, att);
      }
      const mergedAttempts = Array.from(attemptByKey.values())
        .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
        .slice(0, 25);

      const prevTime = new Date(prev.lastAttemptedAt || prev.createdAt || 0).getTime();
      const currTime = new Date(raw.lastAttemptedAt || raw.createdAt || 0).getTime();
      const newest = currTime >= prevTime ? raw : prev;
      const latestAttempt = mergedAttempts[0];

      mergedMap.set(raw.id, {
        ...prev,
        ...newest,
        questions:
          Array.isArray(newest.questions) && newest.questions.length > 0
            ? newest.questions
            : prev.questions,
        attempts: mergedAttempts.length > 0 ? mergedAttempts : undefined,
        attemptCount: Math.max(prev.attemptCount || 0, raw.attemptCount || 0, mergedAttempts.length),
        lastScore: latestAttempt ? latestAttempt.score : newest.lastScore ?? prev.lastScore,
        lastPercentage: latestAttempt ? latestAttempt.percentage : newest.lastPercentage ?? prev.lastPercentage,
        lastAttemptedAt: latestAttempt ? latestAttempt.completedAt : newest.lastAttemptedAt ?? prev.lastAttemptedAt,
        topicBreakdown:
          (latestAttempt?.topicBreakdown && latestAttempt.topicBreakdown.length > 0
            ? latestAttempt.topicBreakdown
            : newest.topicBreakdown) || prev.topicBreakdown
      });
    }
  }

  return Array.from(mergedMap.values())
    .sort((a, b) => {
      const timeA = new Date(a.lastAttemptedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastAttemptedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 40);
}

let cloudQuizSyncTimer: ReturnType<typeof setTimeout> | null = null;

function compactSessionsForCloud(sessions: SavedQuizSession[]): SavedQuizSession[] {
  return sessions.slice(0, 15).map((s) => ({
    ...s,
    sourceLabels: Array.isArray(s.sourceLabels) ? s.sourceLabels.slice(0, 3) : [],
    questions: (Array.isArray(s.questions) ? s.questions : []).slice(0, 20).map((q) => ({
      ...q,
      question: String(q.question || '').slice(0, 260),
      options: Array.isArray(q.options) ? q.options.slice(0, 4).map((o) => String(o).slice(0, 140)) : [],
      explanation: String(q.explanation || '').slice(0, 220),
      pairs: Array.isArray(q.pairs)
        ? q.pairs.slice(0, 5).map((p) => ({
            id: String(p.id),
            left: String(p.left || '').slice(0, 100),
            right: String(p.right || '').slice(0, 140)
          }))
        : undefined
    })),
    attempts: Array.isArray(s.attempts)
      ? s.attempts.slice(0, 8).map((a) => ({
          id: a.id,
          score: a.score,
          total: a.total,
          percentage: a.percentage,
          durationSeconds: a.durationSeconds,
          completedAt: a.completedAt,
          topicBreakdown: Array.isArray(a.topicBreakdown) ? a.topicBreakdown.slice(0, 8) : undefined,
          missedQuestions: Array.isArray(a.missedQuestions)
            ? a.missedQuestions.slice(0, 6).map((m) => ({
                question: String(m.question || '').slice(0, 160),
                userAns: String(m.userAns || '').slice(0, 90),
                correctAns: String(m.correctAns || '').slice(0, 90)
              }))
            : undefined
        }))
      : undefined
  }));
}

/**
 * Persists the user's quiz history and past performance attempts to Supabase Auth user_metadata
 * so logging in from any other device immediately restores their recent quizzes & old scores.
 */
export function syncQuizHistoryToCloud(sessions: SavedQuizSession[], immediate = false): void {
  if (typeof window === 'undefined' || !supabase) return;

  const performSync = async () => {
    if (!supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const compact = compactSessionsForCloud(sessions);
      const serialized = JSON.stringify(compact);
      // Guardrail to stay well within Supabase auth user_metadata limits
      const safePayload = serialized.length > 48_000 ? compact.slice(0, 8) : compact;
      await supabase.auth.updateUser({
        data: {
          quiz_history_v1: safePayload,
          quiz_history_updated_at: new Date().toISOString()
        }
      });
    } catch (err) {
      console.debug('[QuizHistoryStorage] Cloud sync notice:', err);
    }
  };

  if (cloudQuizSyncTimer) {
    clearTimeout(cloudQuizSyncTimer);
    cloudQuizSyncTimer = null;
  }

  if (immediate) {
    void performSync();
  } else {
    cloudQuizSyncTimer = setTimeout(() => {
      cloudQuizSyncTimer = null;
      void performSync();
    }, 600);
  }
}

/**
 * Hydrates saved quizzes & attempt performance history from the signed-in user's Supabase cloud profile,
 * merges them cleanly with local storage + Service Worker cache, and notifies listeners.
 */
export async function hydrateQuizHistoryFromCloud(explicitUserId?: string | null): Promise<SavedQuizSession[]> {
  if (typeof window === 'undefined') return [];
  if (explicitUserId) {
    try {
      localStorage.setItem('studyweb_active_user_id', explicitUserId);
    } catch {}
  }

  const localSessions = loadQuizHistory();
  if (!supabase) return localSessions;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return localSessions;

    if (user.id) {
      try {
        localStorage.setItem('studyweb_active_user_id', user.id);
      } catch {}
    }

    const remoteRaw = user.user_metadata?.quiz_history_v1;
    const remoteSessions: SavedQuizSession[] = Array.isArray(remoteRaw) ? remoteRaw : [];
    const currentLocal = loadQuizHistory();

    if (remoteSessions.length === 0) {
      if (currentLocal.length > 0) {
        syncQuizHistoryToCloud(currentLocal, true);
      }
      return currentLocal;
    }

    const merged = mergeQuizSessionLists(currentLocal, remoteSessions);
    try {
      localStorage.setItem(getQuizHistoryKey(), JSON.stringify(merged));
    } catch {}
    void syncQuizHistoryToServiceWorkerCache(merged);

    if (merged.length > remoteSessions.length) {
      syncQuizHistoryToCloud(merged);
    }

    window.dispatchEvent(new CustomEvent('studyweb-quiz-history-updated', { detail: merged }));
    return merged;
  } catch (err) {
    console.debug('[QuizHistoryStorage] Cloud hydrate notice:', err);
    return localSessions;
  }
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
  syncQuizHistoryToCloud(updated);
  window.dispatchEvent(new CustomEvent('studyweb-quiz-history-updated', { detail: updated }));
  return updated;
}

export function updateQuizSessionScore(
  sessionId: string,
  score: number,
  total: number,
  topicBreakdown?: QuizTopicResult[],
  meta?: {
    durationSeconds?: number;
    missedQuestions?: QuizAttemptMissedItem[];
  }
): SavedQuizSession[] {
  const existing = loadQuizHistory();
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const completedAt = new Date().toISOString();
  const newAttempt: QuizAttemptRecord = {
    id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    score,
    total,
    percentage,
    durationSeconds: meta?.durationSeconds,
    completedAt,
    topicBreakdown: topicBreakdown && topicBreakdown.length > 0 ? topicBreakdown : undefined,
    missedQuestions:
      Array.isArray(meta?.missedQuestions) && meta!.missedQuestions.length > 0
        ? meta!.missedQuestions.map((m) => ({
            question: m.question,
            userAns: m.userAns,
            correctAns: m.correctAns,
            explanation: m.explanation
          }))
        : undefined
  };

  const updated = existing.map((item) => {
    if (item.id !== sessionId) return item;
    const prevAttempts = Array.isArray(item.attempts) ? item.attempts : [];
    const nextAttempts = [newAttempt, ...prevAttempts].slice(0, 25);
    return {
      ...item,
      lastScore: score,
      lastPercentage: percentage,
      lastAttemptedAt: completedAt,
      attemptCount: Math.max((item.attemptCount || 0) + 1, nextAttempts.length),
      topicBreakdown: topicBreakdown && topicBreakdown.length > 0 ? topicBreakdown : item.topicBreakdown,
      attempts: nextAttempts
    };
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getQuizHistoryKey(), JSON.stringify(updated));
    } catch {
      // ignore
    }
    void syncQuizHistoryToServiceWorkerCache(updated);
    syncQuizHistoryToCloud(updated, true);
    window.dispatchEvent(new CustomEvent('studyweb-quiz-history-updated', { detail: updated }));
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
    syncQuizHistoryToCloud(updated, true);
    window.dispatchEvent(new CustomEvent('studyweb-quiz-history-updated', { detail: updated }));
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
