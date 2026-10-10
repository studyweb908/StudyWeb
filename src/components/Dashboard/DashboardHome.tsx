import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Clock, 
  Flame, 
  CheckCircle2, 
  Circle, 
  BookOpen, 
  Bot, 
  Brain, 
  Send, 
  Quote, 
  FileUp, 
  FileText, 
  Library, 
  Calendar, 
  TrendingUp, 
  Award, 
  Copy, 
  Check, 
  ChevronRight, 
  Plus, 
  Zap,
  Target,
  GraduationCap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StorageQuotaWidget } from './DashboardWidgets';
import { Workspace } from './WorkspaceTypes';
import { CURATED_DAILY_QUOTES, DailyQuoteItem } from './DailyQuoteCard';

interface DashboardHomeProps {
  setActiveTab: (tab: string) => void;
  setActiveWorkspace?: (workspace: Workspace | null) => void;
  workspaces?: Workspace[];
  activeWorkspace?: Workspace | null;
}



interface StudyTaskItem {
  id: string;
  title: string;
  subject: string;
  dueTime: string;
  category: string;
  completed: boolean;
}

interface SubjectCardItem {
  id: string;
  subject: string;
  chapter: string;
  progress: number;
  totalChapters: number;
  completedChapters: number;
  color: string;
  accentBg: string;
  icon: string;
  workspaceId?: string;
}

interface UpcomingDeadlineItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  type: 'Quiz' | 'Assignment' | 'Review' | 'Exam';
}

interface RecentActivityItem {
  id: string;
  title: string;
  detail: string;
  timeAgo: string;
  iconType: 'quiz' | 'upload' | 'tutor' | 'note';
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 320, damping: 26 } 
  }
};

export default function DashboardHome({ 
  setActiveTab, 
  setActiveWorkspace, 
  workspaces = [], 
  activeWorkspace 
}: DashboardHomeProps) {
  // 1. User Display Identity
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('studyweb_profile_name') || 'Alex Johnson';
  });

  useEffect(() => {
    // Attempt Supabase session retrieval for authenticated user details
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          const metaName = data.user.user_metadata?.full_name || data.user.user_metadata?.name;
          if (metaName) {
            setDisplayName(metaName);
            localStorage.setItem('studyweb_profile_name', metaName);
          } else if (data.user.email) {
            const emailName = data.user.email.split('@')[0];
            const formatted = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            setDisplayName(formatted);
          }
        }
      }).catch(() => {});
    }

    const handleStorageChange = () => {
      const stored = localStorage.getItem('studyweb_profile_name');
      if (stored) setDisplayName(stored);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const firstName = useMemo(() => {
    const parts = displayName.trim().split(' ');
    return parts[0] || 'Scholar';
  }, [displayName]);

  // 2. Greeting - Always "Good morning" with user name on login
  const greeting = 'Good morning';

  // 3. Motivational Quote - Automatically updates/cycles whenever user logs in or relogins
  const [loginQuote, setLoginQuote] = useState<DailyQuoteItem>(() => {
    const idx = parseInt(localStorage.getItem('studyweb_banner_quote_index') || '0', 10);
    return CURATED_DAILY_QUOTES[idx % CURATED_DAILY_QUOTES.length];
  });

  useEffect(() => {
    const updateQuoteOnLogin = () => {
      const idx = parseInt(localStorage.getItem('studyweb_banner_quote_index') || '0', 10);
      setLoginQuote(CURATED_DAILY_QUOTES[idx % CURATED_DAILY_QUOTES.length]);
    };
    window.addEventListener('studyweb-login-success', updateQuoteOnLogin);
    window.addEventListener('studyweb-signup-success', updateQuoteOnLogin);
    window.addEventListener('storage', updateQuoteOnLogin);
    return () => {
      window.removeEventListener('studyweb-login-success', updateQuoteOnLogin);
      window.removeEventListener('studyweb-signup-success', updateQuoteOnLogin);
      window.removeEventListener('storage', updateQuoteOnLogin);
    };
  }, []);

  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }, []);


  // 4. Today's Focus Tasks State
  const [tasks, setTasks] = useState<StudyTaskItem[]>(() => {
    const saved = localStorage.getItem('studyweb_today_focus_tasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
      { id: 't-1', title: 'Laws of Motion & Friction Exercises', subject: 'Physics', dueTime: 'Today, 3:30 PM', category: 'Core Review', completed: true },
      { id: 't-2', title: 'Trigonometry & Unit Circle Problem Set', subject: 'Mathematics', dueTime: 'Today, 5:00 PM', category: 'Practice', completed: false },
      { id: 't-3', title: 'Chemical Bonding & Hybridization Orbitals', subject: 'Chemistry', dueTime: 'Today, 7:00 PM', category: 'Deep Dive', completed: false },
      { id: 't-4', title: 'Cellular Respiration Flashcards (Box 2)', subject: 'Biology', dueTime: 'Tonight, 8:30 PM', category: 'Active Recall', completed: false },
    ];
  });

  const toggleTask = (id: string) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      localStorage.setItem('studyweb_today_focus_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const [newTaskInput, setNewTaskInput] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const newTask: StudyTaskItem = {
      id: `t-${Date.now()}`,
      title: newTaskInput.trim(),
      subject: activeWorkspace?.subject || 'General Study',
      dueTime: 'Today, Later',
      category: 'Focus Task',
      completed: false
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    localStorage.setItem('studyweb_today_focus_tasks', JSON.stringify(updated));
    setNewTaskInput('');
    setIsAddingTask(false);
  };

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const taskProgressPercent = Math.round((completedTasksCount / Math.max(tasks.length, 1)) * 100);

  // 5. Subject Cards (Continue Learning)
  const continueLearningSubjects: SubjectCardItem[] = useMemo(() => {
    if (workspaces && workspaces.length > 0) {
      return workspaces.slice(0, 4).map((ws, i) => {
        const fileCount = ws.files?.length || 0;
        const progressVal = Math.min(95, 30 + (fileCount * 15) + (ws.quizzes?.length || 0) * 10);
        const palette = [
          { color: 'indigo', accentBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40' },
          { color: 'emerald', accentBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40' },
          { color: 'amber', accentBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40' },
          { color: 'rose', accentBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40' },
        ][i % 4];

        return {
          id: ws.id,
          subject: ws.name,
          chapter: ws.description || `${fileCount} active study documents loaded`,
          progress: progressVal,
          totalChapters: Math.max(6, fileCount + 3),
          completedChapters: Math.max(1, fileCount),
          color: palette.color,
          accentBg: palette.accentBg,
          icon: ws.emoji || '📚',
          workspaceId: ws.id
        };
      });
    }

    return [
      {
        id: 'c-1',
        subject: 'Advanced Biology',
        chapter: 'Chapter 4: Cell Membrane & Selective Transport',
        progress: 74,
        totalChapters: 8,
        completedChapters: 6,
        color: 'emerald',
        accentBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40',
        icon: '🧬'
      },
      {
        id: 'c-2',
        subject: 'AP Physics C',
        chapter: 'Mechanics: Newton’s Laws & Kinetic Friction',
        progress: 62,
        totalChapters: 10,
        completedChapters: 6,
        color: 'indigo',
        accentBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40',
        icon: '⚡'
      },
      {
        id: 'c-3',
        subject: 'Calculus & Geometry',
        chapter: 'Unit 3: Derivatives, Tangents & Critical Points',
        progress: 88,
        totalChapters: 7,
        completedChapters: 6,
        color: 'amber',
        accentBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40',
        icon: '📐'
      },
      {
        id: 'c-4',
        subject: 'Organic Chemistry',
        chapter: 'Topic 5: Reaction Mechanisms & Lewis Structures',
        progress: 55,
        totalChapters: 9,
        completedChapters: 5,
        color: 'rose',
        accentBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40',
        icon: '🧪'
      }
    ];
  }, [workspaces]);

  // 6. AI Tutor Preview State
  const [aiQuestion, setAiQuestion] = useState('');
  const handleAskAiTutor = (promptText?: string) => {
    const query = (promptText || aiQuestion).trim();
    if (query) {
      sessionStorage.setItem('studyweb_initial_ai_query', query);
    }
    setActiveTab('ai-tutor');
  };

  // 7. Upcoming Deadlines
  const upcomingTasks: UpcomingDeadlineItem[] = [
    { id: 'u-1', title: 'AP Biology Genetics Practice Test', subject: 'Biology', dueDate: 'Tomorrow, 9:00 AM', type: 'Quiz' },
    { id: 'u-2', title: 'Rotational Dynamics Problem Set', subject: 'Physics', dueDate: 'Wednesday, Oct 14', type: 'Assignment' },
    { id: 'u-3', title: 'Calculus Optimization Summary', subject: 'Mathematics', dueDate: 'Friday, Oct 16', type: 'Review' },
    { id: 'u-4', title: 'Organic Chemistry Midterm Prep', subject: 'Chemistry', dueDate: 'Next Monday', type: 'Exam' }
  ];

  // 8. Recent Activities
  const recentActivities: RecentActivityItem[] = [
    { id: 'a-1', title: 'Completed Genetics Review Quiz', detail: 'Scored 92% (18/20 correct questions)', timeAgo: '2 hours ago', iconType: 'quiz' },
    { id: 'a-2', title: 'Indexed lesson-04.pdf', detail: 'AI generated 14 concept flashcards', timeAgo: '5 hours ago', iconType: 'upload' },
    { id: 'a-3', title: 'Explored ATP Synthesis Mechanisms', detail: 'Socratic dialogue with AI Tutor', timeAgo: 'Yesterday', iconType: 'tutor' },
    { id: 'a-4', title: 'Created Thermodynamic Notes', detail: 'Linked to AP Physics Workspace', timeAgo: '2 days ago', iconType: 'note' }
  ];

  // Hidden file input for quick upload action
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleQuickUploadTrigger = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Direct navigation to workspaces where upload pipeline engages
      setActiveTab('workspaces');
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="pb-4 space-y-4 max-w-7xl mx-auto w-full text-slate-900 dark:text-slate-100"
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelected} 
        className="hidden" 
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" 
      />

      {/* ========================================================= */}
      {/* 1. PERSONALIZED GREETING BANNER                           */}
      {/* ========================================================= */}
      <motion.div variants={itemVariants} className="w-full">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs p-4 sm:p-5 md:p-6 transition-colors">
          {/* Subtle scenic landscape atmospheric backdrop harmonized with website surfaces */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/70 via-slate-50/40 to-white dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 pointer-events-none z-0" />
          
          {/* Soft atmospheric brand radial glow */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none z-0" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl pointer-events-none z-0" />
          
          {/* Decorative mountain / sunrise contours with adaptive themed opacity */}
          <div className="absolute inset-0 opacity-20 dark:opacity-20 pointer-events-none z-0">
            <svg className="w-full h-full object-cover" viewBox="0 0 1200 320" fill="none" preserveAspectRatio="none">
              <path d="M0,280 C200,210 400,290 600,220 C800,150 1000,240 1200,180 L1200,320 L0,320 Z" fill="url(#grad1)" />
              <path d="M0,240 C300,180 500,260 750,190 C1000,120 1100,200 1200,160 L1200,320 L0,320 Z" fill="url(#grad2)" opacity="0.6" />
              <circle cx="950" cy="90" r="70" fill="url(#sunGrad)" opacity="0.35" />
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.03" />
                </linearGradient>
                <radialGradient id="sunGrad">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                <span>{formattedDate}</span>
                <span aria-hidden="true">·</span>
                <span>Active Semester</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Good morning, {firstName}! 👋
              </h1>
              
              {/* Relogin Motivational Quote Display */}
              <div className="flex items-start gap-2.5 max-w-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/40 rounded-xl px-3 py-2">
                <Quote className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 fill-indigo-500/15" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] font-serif italic text-slate-800 dark:text-slate-100 leading-snug">
                    "{loginQuote.quote}"
                  </p>
                  <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    — {loginQuote.author}{loginQuote.title ? ` · ${loginQuote.title}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setActiveTab('study-session')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white/20" />
                <span>Start Studying</span>
              </button>
              <button
                onClick={() => setActiveTab('workspaces')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm border border-slate-200/80 dark:border-slate-700/80 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none cursor-pointer"
              >
                <span>Workspaces</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* 2. QUICK ACTIONS ROW (Section 13)                        */}
      {/* ========================================================= */}
      <motion.div variants={itemVariants} className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            onClick={handleQuickUploadTrigger}
            className="flex items-center gap-2.5 sm:gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-sm transition-all group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileUp className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">Upload File</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">PDF & documents</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className="flex items-center gap-2.5 sm:gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-sm transition-all group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">Create Note</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">AI study notes</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className="flex items-center gap-2.5 sm:gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-amber-300 dark:hover:border-amber-700/60 hover:shadow-sm transition-all group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Library className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">Browse Resources</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">Library & formulas</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('ai-tutor')}
            className="flex items-center gap-2.5 sm:gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-violet-300 dark:hover:border-violet-700/60 hover:shadow-sm transition-all group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-100 dark:border-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">Open AI Tutor</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">Ask anything</span>
            </div>
          </button>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT GRID (Left 7-8 cols / Right 4-5) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ======================================================= */}
        {/* LEFT COLUMN: Main Learning Stream (7-8 Cols)            */}
        {/* ======================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">

          {/* 3A. TODAY'S FOCUS (Section 6) */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Today's Focus</h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Make today count. Complete your priority tasks.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {completedTasksCount} of {tasks.length} Done
                  </span>
                  <button
                    onClick={() => setActiveTab('study-session')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <span>Start Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3.5">
                <motion.div 
                  className="h-full bg-indigo-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${taskProgressPercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              {/* Task list */}
              <div className="space-y-2">
                {tasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`flex items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                      task.completed 
                        ? 'bg-slate-50/70 dark:bg-slate-850/50 border-slate-200/60 dark:border-slate-800/60 opacity-75' 
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700/60 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <button
                        type="button"
                        aria-label={`Mark task ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`}
                        className="mt-0.5 sm:mt-0 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-indigo-100 dark:fill-indigo-950" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <p className={`text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug ${
                          task.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                        }`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{task.subject}</span>
                          <span aria-hidden="true">·</span>
                          <span>{task.dueTime}</span>
                        </div>
                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {task.category}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add task inline or toggle */}
              {isAddingTask ? (
                <form onSubmit={handleAddTask} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder="Enter study task title..."
                    autoFocus
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingTask(false); setNewTaskInput(''); }}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Focus Task</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* 3B. CONTINUE LEARNING (Section 8) */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Continue Learning</h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pick up where you left off and keep moving forward.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('workspaces')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {continueLearningSubjects.map(sub => (
                  <div 
                    key={sub.id}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-white dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-2xl" role="img" aria-label={sub.subject}>
                          {sub.icon}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {sub.completedChapters}/{sub.totalChapters} Chapters
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {sub.subject}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {sub.chapter}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        <span>Mastery Progress</span>
                        <span>{sub.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${sub.progress}%` }}
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (sub.workspaceId && setActiveWorkspace) {
                            const ws = workspaces.find(w => w.id === sub.workspaceId);
                            if (ws) setActiveWorkspace(ws);
                          }
                          setActiveTab('workspaces');
                        }}
                        className="w-full py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:hover:bg-indigo-600 dark:hover:border-indigo-600 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 3C. YOUR PROGRESS (Section 7) */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Your Progress</h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Semester mastery metrics and subject completion benchmarks.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Analytics</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Circular Gauge on Left (4 cols) */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-850/50 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        stroke="currentColor"
                        strokeWidth="10"
                        className="text-slate-200 dark:text-slate-800"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={2 * Math.PI * 48 * (1 - 0.78)}
                        strokeLinecap="round"
                        className="text-indigo-600 transition-all duration-1000 ease-out"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        78%
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Mastery
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2 text-center">
                    Overall Curriculum Level
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-0.5">
                    On track for Honors distinction
                  </p>
                </div>

                {/* Subject-specific bars on Right (8 cols) */}
                <div className="md:col-span-8 space-y-3.5">
                  {[
                    { name: 'Physics C Mechanics', pct: 78, color: 'bg-indigo-600', icon: '⚡' },
                    { name: 'Mathematics & Calculus', pct: 85, color: 'bg-indigo-500', icon: '📐' },
                    { name: 'Chemistry & Stoichiometry', pct: 64, color: 'bg-violet-600', icon: '🧪' },
                    { name: 'Cellular Biology', pct: 92, color: 'bg-emerald-600', icon: '🧬' },
                  ].map(sub => (
                    <div key={sub.name}>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <div className="flex items-center gap-1.5">
                          <span>{sub.icon}</span>
                          <span className="text-slate-900 dark:text-white font-bold">{sub.name}</span>
                        </div>
                        <span className="text-slate-600 dark:text-slate-400 font-bold">{sub.pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full ${sub.color} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${sub.pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        {/* ======================================================= */}
        {/* RIGHT COLUMN: Secondary Dashboard Stream (4-5 Cols)    */}
        {/* ======================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">

          {/* 4A. AI TUTOR PREVIEW (Section 11) */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">AI Tutor</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Ask, learn, understand — instantly.
              </p>

              {/* Input field with Send button */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleAskAiTutor(); }}
                className="relative mb-3"
              >
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask me anything about your studies..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  aria-label="Send query to AI Tutor"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Suggested prompt chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Suggested Prompts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Explain this topic",
                    "Give me a summary",
                    "Create practice questions",
                    "Help with homework"
                  ].map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleAskAiTutor(prompt)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* 4B. UPCOMING TASKS (Section 12) */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Upcoming Tasks</h3>
                </div>
                <button
                  onClick={() => setActiveTab('study-planner')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {upcomingTasks.map(task => (
                  <div 
                    key={task.id}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{task.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span>{task.dueDate}</span>
                      </div>
                    </div>

                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      task.type === 'Exam' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' :
                      task.type === 'Quiz' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' :
                      'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {task.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 4C. STUDY STREAK (Section 9) */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500">
                    <Flame className="w-5 h-5 fill-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Study Streak</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Consistency today, success tomorrow.</p>
                  </div>
                </div>

                <span className="text-lg font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  5 Days
                </span>
              </div>

              {/* Weekly Activity indicators (Mon-Sun) */}
              <div className="grid grid-cols-7 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {[
                  { day: 'M', active: true },
                  { day: 'T', active: true },
                  { day: 'W', active: true },
                  { day: 'T', active: true },
                  { day: 'F', active: true },
                  { day: 'S', active: false },
                  { day: 'S', active: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div className={`w-full h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      item.active 
                        ? 'bg-amber-500 text-white shadow-2xs' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {item.active ? '✓' : ''}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{item.day}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Personal Record: 14 Days</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">Keep it going! 🔥</span>
              </div>
            </div>
          </motion.div>

          {/* 4D. RECENT ACTIVITY (Section 10) */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recent Activity</h3>
                </div>
              </div>

              <div className="space-y-2">
                {recentActivities.map(act => (
                  <div 
                    key={act.id}
                    className="flex items-start sm:items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/60 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 text-slate-700 dark:text-slate-300">
                        {act.iconType === 'quiz' && <Award className="w-3.5 h-3.5 text-amber-500" />}
                        {act.iconType === 'upload' && <FileUp className="w-3.5 h-3.5 text-indigo-500" />}
                        {act.iconType === 'tutor' && <Bot className="w-3.5 h-3.5 text-violet-500" />}
                        {act.iconType === 'note' && <FileText className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {act.detail}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                      {act.timeAgo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 4E. STORAGE QUOTA WIDGET */}
          <motion.div variants={itemVariants} className="w-full">
            <StorageQuotaWidget workspaces={workspaces} />
          </motion.div>

        </div>
      </div>

    </motion.div>
  );
}

