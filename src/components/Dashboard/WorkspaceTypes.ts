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

// Initial Sample Workspaces for seamless first-load and deployed experience
export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Physics: Mechanics & Motion',
    subject: 'Physics',
    description: "Newton's Laws, Rotational Dynamics, Work-Energy Theorem, and Gravitation.",
    colorTheme: 'indigo',
    coverImage: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=800',
    emoji: '⚡',
    visibility: 'private',
    template: 'semester',
    pinned: true,
    favorite: true,
    files: [
      {
        id: '11111111-1111-4111-8111-111111111101',
        name: 'Newton_Laws_and_Friction_Formulae.pdf',
        type: 'pdf',
        size: '2.4 MB',
        uploadDate: new Date(Date.now() - 86400000 * 2).toISOString(),
        status: 'indexed',
        pages: 14,
        tags: ['Kinematics', "Newton's Laws", 'Friction'],
        summary: "Comprehensive derivation of Newton's 3 laws, coefficient of static/kinetic friction, and free body analysis."
      },
      {
        id: '11111111-1111-4111-8111-111111111102',
        name: 'Rotational_Dynamics_Summary.pdf',
        type: 'pdf',
        size: '1.8 MB',
        uploadDate: new Date(Date.now() - 86400000).toISOString(),
        status: 'indexed',
        pages: 9,
        tags: ['Torque', 'Angular Momentum', 'Inertia'],
        summary: 'Formulas and problem sets covering angular momentum conservation, torque cross products, and rotational inertia.'
      }
    ],
    flashcards: [
      {
        id: 'fc-phys-1',
        front: "What is Newton's Second Law in derivative form?",
        back: 'F_net = dp/dt (Force equals rate of change of linear momentum). When mass is constant, F = ma.',
        topic: 'Mechanics',
        difficulty: 'Medium',
        box: 1,
        bookmarked: true
      },
      {
        id: 'fc-phys-2',
        front: 'Define the Moment of Inertia for a solid cylinder of mass M and radius R about its central axis.',
        back: 'I = 0.5 * M * R^2',
        topic: 'Rotation',
        difficulty: 'Easy',
        box: 2,
        bookmarked: false
      }
    ],
    quizzes: [
      {
        id: 'qz-phys-1',
        question: 'Which physical quantity is strictly conserved in an isolated system undergoing an inelastic collision?',
        options: [
          'Kinetic energy only',
          'Linear momentum only',
          'Both kinetic energy and momentum',
          'Mechanical energy'
        ],
        correctIndex: 1,
        explanation: 'In an inelastic collision, kinetic energy is partially converted into internal thermal energy or deformation, but total linear momentum is always conserved in an isolated system.',
        difficulty: 'Medium',
        type: 'MCQ'
      }
    ],
    notes: [
      {
        id: 'nt-phys-1',
        title: 'Conservation of Energy & Work-Energy Theorem',
        content: 'Work done by non-conservative forces equals the change in total mechanical energy: W_nc = ΔE = ΔK + ΔU. For conservative fields, mechanical energy is invariant.',
        updatedAt: 'Today, 10:15 AM',
        tags: ['Work', 'Energy', 'Conservations']
      }
    ],
    plannerTasks: [
      {
        id: 'pt-phys-1',
        title: 'Complete Rotational Inertia Exercises',
        dueDate: 'Today, 4:00 PM',
        priority: 'High',
        completed: false
      }
    ],
    nodes: [],
    links: [],
    streak: 6,
    studyHours: 14.5,
    lastOpened: new Date().toISOString()
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Calculus & Mathematical Analysis',
    subject: 'Mathematics',
    description: 'Limits, Derivatives, Integration Techniques, Vectors, and Matrices.',
    colorTheme: 'emerald',
    coverImage: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=800',
    emoji: '📐',
    visibility: 'private',
    template: 'semester',
    pinned: false,
    favorite: true,
    files: [
      {
        id: '22222222-2222-4222-8222-222222222201',
        name: 'Fundamental_Theorems_of_Calculus.pdf',
        type: 'pdf',
        size: '3.1 MB',
        uploadDate: new Date(Date.now() - 86400000 * 3).toISOString(),
        status: 'indexed',
        pages: 18,
        tags: ['Derivatives', 'Integration', 'Limits'],
        summary: 'In-depth proofs of FTC Part 1 and 2, substitution method, integration by parts, and trigonometric substitutions.'
      }
    ],
    flashcards: [
      {
        id: 'fc-calc-1',
        front: 'State the Fundamental Theorem of Calculus Part 1.',
        back: "If f is continuous on [a, b], then g(x) = ∫[a to x] f(t) dt is continuous and g'(x) = f(x).",
        topic: 'Integration',
        difficulty: 'Medium',
        box: 2,
        bookmarked: true
      }
    ],
    quizzes: [
      {
        id: 'qz-calc-1',
        question: 'What is the derivative of f(x) = ln(3x^2) with respect to x?',
        options: ['2/x', '6x', '1/(3x^2)', '3/x'],
        correctIndex: 0,
        explanation: "Using logarithm properties ln(3x^2) = ln(3) + 2*ln(x). Differentiating yields 0 + 2/x = 2/x.",
        difficulty: 'Easy',
        type: 'MCQ'
      }
    ],
    notes: [
      {
        id: 'nt-calc-1',
        title: 'Integration by Parts Strategy (LIATE rule)',
        content: 'Formula: ∫ u dv = u*v - ∫ v du. Choose u according to LIATE priority: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential.',
        updatedAt: 'Yesterday, 3:30 PM',
        tags: ['Calculus', 'Techniques']
      }
    ],
    plannerTasks: [],
    nodes: [],
    links: [],
    streak: 4,
    studyHours: 9.2,
    lastOpened: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Organic Chemistry Mechanisms',
    subject: 'Chemistry',
    description: 'Reaction Mechanisms, Hybridization, Isomerism, and Functional Groups.',
    colorTheme: 'amber',
    coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=800',
    emoji: '🧪',
    visibility: 'private',
    template: 'semester',
    pinned: false,
    favorite: false,
    files: [
      {
        id: '33333333-3333-4333-8333-333333333301',
        name: 'Nucleophilic_Substitution_Mechanisms.pdf',
        type: 'pdf',
        size: '1.9 MB',
        uploadDate: new Date(Date.now() - 86400000 * 4).toISOString(),
        status: 'indexed',
        pages: 12,
        tags: ['SN1', 'SN2', 'Stereochemistry'],
        summary: 'Solvent effects, leaving group tendencies, and stereochemical inversion in nucleophilic aliphatic substitutions.'
      }
    ],
    flashcards: [
      {
        id: 'fc-chem-1',
        front: 'Does an SN2 reaction proceed with retention or inversion of stereochemical configuration?',
        back: 'Inversion of configuration (Walden inversion) due to backside attack of the nucleophile.',
        topic: 'Aliphatic Reactions',
        difficulty: 'Easy',
        box: 3,
        bookmarked: false
      }
    ],
    quizzes: [],
    notes: [],
    plannerTasks: [],
    nodes: [],
    links: [],
    streak: 3,
    studyHours: 7.0,
    lastOpened: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

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

