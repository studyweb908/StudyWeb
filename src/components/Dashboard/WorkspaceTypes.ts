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

import { z } from 'zod';

export const workspaceFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['pdf', 'doc', 'ppt', 'excel', 'image', 'audio', 'video', 'url']),
  size: z.string(),
  uploadDate: z.string(),
  status: z.enum(['indexed', 'indexing', 'extracting', 'failed']),
  pages: z.number().optional(),
  tags: z.array(z.string()),
  summary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  transcription: z.string().optional(),
  extractedDiagrams: z.array(z.string()).optional(),
  formulas: z.array(z.string()).optional(),
  url: z.string().optional(),
});

export const flashcardItemSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  topic: z.string(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  box: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  bookmarked: z.boolean(),
  lastStudied: z.string().optional(),
});

export const quizQuestionItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number(),
  explanation: z.string(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  type: z.enum(['MCQ', 'TF', 'FillBlank', 'ShortAnswer']),
});

export const workspaceNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
  linkedConcepts: z.array(z.string()).optional(),
});

export const plannerTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: z.string(),
  priority: z.enum(['High', 'Medium', 'Low']),
  completed: z.boolean(),
  revisionBox: z.number().optional(),
});

export const conceptNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['concept', 'file', 'formula', 'topic', 'quiz']),
  color: z.string(),
  x: z.number(),
  y: z.number(),
  details: z.string().optional(),
});

export const conceptLinkSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

export const workspaceSchema = z.object({
  id: z.string().uuid().or(z.string()),
  name: z.string().min(1, 'Workspace name is required'),
  subject: z.string(),
  description: z.string(),
  colorTheme: z.enum(['indigo', 'emerald', 'amber', 'rose', 'violet', 'cyan']),
  coverImage: z.string(),
  emoji: z.string(),
  visibility: z.enum(['private', 'shared']),
  template: z.enum(['exam', 'semester', 'course', 'research', 'notes', 'custom']),
  pinned: z.boolean(),
  favorite: z.boolean(),
  files: z.array(workspaceFileSchema),
  flashcards: z.array(flashcardItemSchema),
  quizzes: z.array(quizQuestionItemSchema),
  notes: z.array(workspaceNoteSchema),
  plannerTasks: z.array(plannerTaskSchema),
  nodes: z.array(conceptNodeSchema),
  links: z.array(conceptLinkSchema),
  streak: z.number().int().nonnegative(),
  studyHours: z.number().nonnegative(),
  lastOpened: z.string(),
  isForSale: z.boolean().optional(),
  price: z.number().nonnegative().optional(),
});

