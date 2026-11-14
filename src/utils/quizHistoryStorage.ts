import { QuizQuestionItem } from '../components/Dashboard/WorkspaceTypes';

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

const QUIZ_HISTORY_PREFIX = 'studyweb_quiz_history_v1';

function getQuizHistoryKey(): string {
  if (typeof window === 'undefined') return QUIZ_HISTORY_PREFIX;
  const uid = localStorage.getItem('studyweb_active_user_id') || 'guest';
  return `${QUIZ_HISTORY_PREFIX}_${uid}`;
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
  total: number
): SavedQuizSession[] {
  const existing = loadQuizHistory();
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const updated = existing.map((item) =>
    item.id === sessionId
      ? {
          ...item,
          lastScore: score,
          lastPercentage: percentage,
          lastAttemptedAt: new Date().toISOString()
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
    } catch {
      // ignore
    }
  }
  return updated;
}
