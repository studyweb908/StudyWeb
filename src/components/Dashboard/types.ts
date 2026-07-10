export interface TaskItem {
  id: string;
  title: string;
  subject: string;
  priority: 'High' | 'Medium' | 'Low';
  estimatedTime: string; // e.g. "45m"
  completed: boolean;
}

export interface SubjectMetric {
  name: string;
  progress: number; // 0-100
  studyHours: number;
  averageScore: number;
  weakTopics: string[];
  recommendedRevision: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  known?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface NoteItem {
  id: string;
  title: string;
  subject: string;
  content: string;
  updatedAt: string;
  aiSummarized?: boolean;
}

export interface PDFDocument {
  id: string;
  name: string;
  size: string;
  pages: number;
  highlights: string[];
}
