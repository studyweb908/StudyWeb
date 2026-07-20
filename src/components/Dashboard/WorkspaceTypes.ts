export interface WorkspaceFile {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'ppt' | 'excel' | 'image' | 'audio' | 'video' | 'url';
  size: string;
  uploadDate: string;
  status: 'indexed' | 'indexing' | 'extracting' | 'failed';
  pages?: number;
  tags: string[];
  summary?: string;
  highlights?: string[];
  transcription?: string;
  extractedDiagrams?: string[];
  formulas?: string[];
  url?: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  box: 1 | 2 | 3; // Spaced Repetition Box
  bookmarked: boolean;
  lastStudied?: string;
}

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'MCQ' | 'TF' | 'FillBlank' | 'ShortAnswer';
}

export interface WorkspaceNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  tags: string[];
  linkedConcepts?: string[];
}

export interface PlannerTask {
  id: string;
  title: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  revisionBox?: number;
}

export interface ConceptNode {
  id: string;
  label: string;
  type: 'concept' | 'file' | 'formula' | 'topic' | 'quiz';
  color: string;
  x: number;
  y: number;
  details?: string;
}

export interface ConceptLink {
  source: string;
  target: string;
  label?: string;
}

export interface Workspace {
  id: string;
  name: string;
  subject: string;
  description: string;
  colorTheme: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';
  coverImage: string;
  emoji: string;
  visibility: 'private' | 'shared';
  template: 'exam' | 'semester' | 'course' | 'research' | 'notes' | 'custom';
  pinned: boolean;
  favorite: boolean;
  files: WorkspaceFile[];
  flashcards: FlashcardItem[];
  quizzes: QuizQuestionItem[];
  notes: WorkspaceNote[];
  plannerTasks: PlannerTask[];
  nodes: ConceptNode[];
  links: ConceptLink[];
  streak: number;
  studyHours: number;
  lastOpened: string;
  isForSale?: boolean;
  price?: number;
}

// Initial Sample Data (Empty by default for clean user experience)
export const INITIAL_WORKSPACES: Workspace[] = [];
