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
}

export function clearQuizDraftState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getQuizDraftKey());
  } catch {
    // ignore
  }
}
