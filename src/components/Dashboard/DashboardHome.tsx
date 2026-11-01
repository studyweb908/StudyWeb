import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Folder,
  BookOpen, 
  Bot, 
  Send, 
  FileUp, 
  FileText, 
  Award, 
  ChevronRight, 
  Plus, 
  Clock,
  ArrowRight,
  Layers,
  LayoutDashboard,
  FolderPlus,
  Trash2,
  Lock,
  Sparkles,
  CheckCircle2,
  Flame,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StorageQuotaWidget } from './DashboardWidgets';
import { Workspace } from './WorkspaceTypes';
import DailyQuoteCard from './DailyQuoteCard';
import { getRealUserActivities, recordUserActivity, UserActivityItem } from '../../utils/userActivity';
import { HomeWorkspaceSkeleton, RecentActivitySkeleton } from './DashboardSkeletons';
import { readSyncProfileSnapshot, fetchAndReconcileSupabaseProfile } from '../../utils/profileStorage';
import { StudyTrackerService } from '../../services/StudyTrackerService';

interface DashboardHomeProps {
  setActiveTab: (tab: string) => void;
  setActiveWorkspace?: (workspace: Workspace | null) => void;
  workspaces?: Workspace[];
  activeWorkspace?: Workspace | null;
  isLoading?: boolean;
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
  artworkType: 'physics' | 'math' | 'chemistry' | 'biology';
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
  activeWorkspace,
  isLoading = false
}: DashboardHomeProps) {
  // 1. User Display Identity & ID (Synchronously hydrated from real profile)
  const initialSnap = useMemo(() => readSyncProfileSnapshot(), []);
  const [displayName, setDisplayName] = useState<string>(() => {
    return initialSnap.fullName || (initialSnap.email ? initialSnap.email.split('@')[0] : 'Student');
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialSnap.userId);

  useEffect(() => {
    let isMounted = true;
    fetchAndReconcileSupabaseProfile()
      .then(({ profile }) => {
        if (!isMounted) return;
        if (profile.userId) setCurrentUserId(profile.userId);
        if (profile.fullName) {
          setDisplayName(profile.fullName);
        } else if (profile.email) {
          setDisplayName(profile.email.split('@')[0]);
        }
      })
      .catch(() => {});

    const handleStorageChange = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const snap = detail && typeof detail === 'object' && 'fullName' in detail ? detail : readSyncProfileSnapshot();
      if (snap.fullName) {
        setDisplayName(snap.fullName);
      } else if (snap.email) {
        setDisplayName(snap.email.split('@')[0]);
      }
      if (snap.userId) setCurrentUserId(snap.userId);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('studyweb_profile_updated', handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('studyweb_profile_updated', handleStorageChange);
    };
  }, []);

  const firstName = useMemo(() => {
    const parts = displayName.trim().split(' ');
    return parts[0] || 'Student';
  }, [displayName]);

  // 2. Time-adapted greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // 3. Real Workspaces Cards (Continue Learning) — STRICTLY REAL USER WORKSPACES
  const continueLearningSubjects: SubjectCardItem[] = useMemo(() => {
    if (workspaces && workspaces.length > 0) {
      const artworkTypes: ('physics' | 'math' | 'chemistry' | 'biology')[] = ['physics', 'math', 'chemistry', 'biology'];
      return workspaces.slice(0, 4).map((ws, i) => {
        const fileCount = ws.files?.length || 0;
        const noteCount = ws.notes?.length || 0;
        const quizCount = ws.quizzes?.length || 0;
        const progressVal = Math.min(100, Math.max(15, (fileCount * 25) + (quizCount * 15) + (noteCount * 10)));
        const palette = [
          { color: 'indigo', accentBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40' },
          { color: 'amber', accentBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40' },
          { color: 'rose', accentBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40' },
          { color: 'emerald', accentBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40' },
        ][i % 4];

        return {
          id: ws.id,
          subject: ws.name,
          chapter: ws.description || (fileCount > 0 ? `${fileCount} active study document${fileCount === 1 ? '' : 's'}` : 'Workspace ready for study materials'),
          progress: progressVal,
          totalChapters: Math.max(4, fileCount + noteCount + 1),
          completedChapters: Math.max(0, fileCount),
          color: palette.color,
          accentBg: palette.accentBg,
          icon: ws.emoji || '📚',
          workspaceId: ws.id,
          artworkType: artworkTypes[i % artworkTypes.length]
        };
      });
    }

    // No dummy fallback courses: strictly empty if user has no workspaces
    return [];
  }, [workspaces]);

  // 4. AI Tutor Preview State
  const [aiQuestion, setAiQuestion] = useState('');
  const handleAskAiTutor = (promptText?: string) => {
    const query = (promptText || aiQuestion).trim();
    if (query) {
      sessionStorage.setItem('studyweb_initial_ai_query', query);
    }
    recordUserActivity({
      title: 'Asked AI Tutor',
      detail: query || 'Started AI Tutor study consultation',
      iconType: 'tutor'
    }, currentUserId);
    if (!activeWorkspace && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0]);
    }
    setActiveTab('ai-tutor');
  };

  // 5. Real User Activity (Strictly real actions done by user, zero dummy data)
  const [activityTick, setActivityTick] = useState(0);
  const [homeStreak, setHomeStreak] = useState(() => {
    const s = StudyTrackerService.getFormattedStats();
    return {
      streak: s.currentStreak,
      activeToday: s.activeToday,
      weeklyDays: StudyTrackerService.getWeeklyStreakDays()
    };
  });

  useEffect(() => {
    const handleActUpdate = () => {
      setActivityTick(t => t + 1);
      const s = StudyTrackerService.getFormattedStats();
      setHomeStreak({
        streak: s.currentStreak,
        activeToday: s.activeToday,
        weeklyDays: StudyTrackerService.getWeeklyStreakDays()
      });
    };
    window.addEventListener('studyweb-activity-updated', handleActUpdate);
    window.addEventListener('studyweb-study-stats-updated', handleActUpdate);
    window.addEventListener('studyweb-daily-routine-completed', handleActUpdate);
    return () => {
      window.removeEventListener('studyweb-activity-updated', handleActUpdate);
      window.removeEventListener('studyweb-study-stats-updated', handleActUpdate);
      window.removeEventListener('studyweb-daily-routine-completed', handleActUpdate);
    };
  }, []);

  const realActivities: UserActivityItem[] = useMemo(() => {
    return getRealUserActivities(workspaces, currentUserId);
  }, [workspaces, currentUserId, activityTick]);

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
      className="pb-16 space-y-6 max-w-7xl mx-auto w-full text-slate-900 dark:text-slate-100"
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
      <motion.div variants={itemVariants} className="w-full" data-tour="dashboard-overview">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm p-4 sm:p-6 md:p-8 transition-colors">
          {/* Scenic peaceful atmospheric backdrop */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/70 via-slate-50/40 to-white dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 pointer-events-none z-0" />
          
          {/* Soft atmospheric brand radial glow */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none z-0" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl pointer-events-none z-0" />
          
          {/* Scenic peaceful mountain sunrise backdrop */}
          <div className="absolute inset-0 opacity-25 dark:opacity-30 pointer-events-none z-0">
            <svg className="w-full h-full object-cover" viewBox="0 0 1200 360" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="bannerSky" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
                  <stop offset="60%" stopColor="#818CF8" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="bannerRidgeFar" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="bannerRidgeMid" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.2" />
                </linearGradient>
                <radialGradient id="bannerSun" cx="80%" cy="40%" r="50%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                  <stop offset="40%" stopColor="#FBBF24" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="960" cy="120" r="140" fill="url(#bannerSun)" />
              <path d="M0,240 C180,180 340,230 520,160 C700,90 880,190 1060,130 L1200,160 L1200,360 L0,360 Z" fill="url(#bannerRidgeFar)" />
              <path d="M0,280 C220,210 400,270 640,190 C840,120 1020,220 1200,180 L1200,360 L0,360 Z" fill="url(#bannerRidgeMid)" />
              <path d="M0,320 C260,270 540,320 820,260 C1020,220 1120,270 1200,240 L1200,360 L0,360 Z" fill="#4F46E5" fillOpacity="0.15" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2 max-w-2xl text-left">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                <img src="/logo-inner.png" alt="StudyWeb" className="w-5 h-5 object-contain select-none shrink-0" />
                <span>{formattedDate}</span>
                <span aria-hidden="true">·</span>
                <span>StudyWeb Learning Core</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {greeting}, {firstName}! 👋
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Welcome back to your personalized learning space.
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal">
                Organize your study documents, explore insights, and accelerate your understanding with AI.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
              <button
                data-tour="home-workspaces-btn"
                onClick={() => setActiveTab('workspaces')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none cursor-pointer active:scale-95 text-center"
              >
                <Folder className="w-4 h-4" />
                <span>Open Workspaces</span>
              </button>
              <button
                data-tour="home-ai-tutor-btn"
                onClick={() => {
                  if (!activeWorkspace && workspaces.length > 0) {
                    setActiveWorkspace(workspaces[0]);
                  }
                  setActiveTab('ai-tutor');
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm shadow-xs transition-all duration-200 cursor-pointer active:scale-95 text-center"
              >
                <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Ask AI Tutor</span>
              </button>
            </div>
          </div>

          {/* Live Duolingo-Style Daily Streak & 7-Day Weekly Tracker Bar */}
          <div className="relative z-10 mt-5 pt-4 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('studyweb-open-streak-modal'))}
                className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-400 to-[#FF7A00] text-white flex items-center justify-center shadow-[0_4px_12px_rgba(255,136,0,0.3)] shrink-0 cursor-pointer hover:scale-105 transition-transform"
                title="View Daily Streak Celebration"
              >
                <Flame className="w-5 h-5 fill-white" />
              </button>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black tabular-nums text-[#FF8800] dark:text-amber-400">
                    {homeStreak.streak} {homeStreak.streak === 1 ? 'Day' : 'Days'} Streak
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md tabular-nums ${
                      homeStreak.activeToday
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                        : 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                    }`}
                  >
                    {homeStreak.activeToday ? 'Active Today' : 'Daily Streak'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {homeStreak.activeToday
                    ? "Great work! Your daily study streak is recorded for today."
                    : "Study with your course materials or ask your AI Tutor to build your learning streak."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="flex items-center gap-1.5 bg-slate-50/90 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70">
                {homeStreak.weeklyDays.map(day => (
                  <div key={day.dateStr} className="flex flex-col items-center gap-1 px-0.5">
                    <span
                      className={`text-[9px] font-extrabold uppercase ${
                        day.isToday
                          ? 'text-[#FF8800] dark:text-amber-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {day.label}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        day.completed
                          ? 'bg-gradient-to-b from-[#FFA800] to-[#FF7A00] text-white shadow-2xs'
                          : day.isToday
                          ? 'border border-dashed border-[#FF8800] text-[#FF8800] bg-amber-50/60 dark:bg-amber-950/30'
                          : 'bg-slate-200/70 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {day.completed ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('studyweb-open-streak-modal'))}
                  className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 border border-amber-200/90 dark:border-amber-800/70 text-[#FF8800] dark:text-amber-400 text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors"
                >
                  View Streak
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* 1.5 ONBOARDING ACTIVATION CHECKLIST (Time-to-Value Guide) */}
      {/* ========================================================= */}
      {(() => {
        const totalUploadedFiles = workspaces.reduce((sum, ws) => sum + (ws.files?.length || 0) + (ws.notes?.length || 0), 0);
        const hasUploadedMaterial = totalUploadedFiles > 0;
        const hasAskedTutor = realActivities.some(
          a => a.iconType === 'tutor' || /tutor|asked|interview|question/i.test(a.title)
        );
        const totalQuizzesOrFlashcards = workspaces.reduce(
          (sum, ws) => sum + (ws.quizzes?.length || 0) + (ws.flashcards?.length || 0),
          0
        );
        const hasCompletedPractice =
          totalQuizzesOrFlashcards > 0 ||
          realActivities.some(a => a.iconType === 'quiz');

        const steps = [
          {
            id: 'step-upload',
            num: '01',
            title: 'Upload your first study material',
            subtitle: hasUploadedMaterial
              ? `${totalUploadedFiles} study ${totalUploadedFiles === 1 ? 'item' : 'items'} indexed across your workspaces`
              : 'Add a PDF, image, diagram, or YouTube link to index your syllabus',
            done: hasUploadedMaterial,
            locked: false,
            icon: <FileUp className="w-4 h-4" />,
            ctaLabel: hasUploadedMaterial ? 'Add More Material' : 'Upload Material',
            onAction: () => setActiveTab('workspaces')
          },
          {
            id: 'step-tutor',
            num: '02',
            title: 'Ask an interview or study question',
            subtitle: hasAskedTutor
              ? 'AI Tutor & follow-up question engine active'
              : 'Get a cited explanation plus 3 suggested follow-up questions',
            done: hasAskedTutor,
            locked: false,
            icon: <Sparkles className="w-4 h-4" />,
            ctaLabel: hasAskedTutor ? 'Open AI Tutor' : 'Ask AI Tutor',
            onAction: () =>
              handleAskAiTutor(
                hasUploadedMaterial
                  ? 'What is in my study material? Explain the key concepts and ask me 3 interview follow-up questions.'
                  : 'Ask me a high-impact interview question for my subject and show me a model answer.'
              )
          },
          {
            id: 'step-practice',
            num: '03',
            title: 'Complete an interactive quiz or practice session',
            subtitle: 'Interactive adaptive quizzes and active recall practice are launching soon.',
            done: false,
            locked: true,
            icon: <Lock className="w-4 h-4" />,
            ctaLabel: 'Coming Soon',
            onAction: () => {}
          }
        ];

        const activeStepsCount = 2;
        const completedCount = steps.filter(s => !s.locked && s.done).length;
        const progressPct = Math.round((completedCount / activeStepsCount) * 100);

        return (
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Quick-Start Launchpad</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{completedCount} of {activeStepsCount} active steps completed</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 tracking-tight">
                    Your 3 steps to exam &amp; interview mastery
                  </h2>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
                    {progressPct}%
                  </span>
                  <div className="w-full sm:w-36 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(8, progressPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {steps.map(step => (
                  <div
                    key={step.id}
                    aria-disabled={step.locked}
                    className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                      step.locked
                        ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75 select-none'
                        : step.done
                        ? 'bg-emerald-50/35 dark:bg-emerald-950/15 border-emerald-200/70 dark:border-emerald-800/50'
                        : 'bg-slate-50/70 dark:bg-slate-800/35 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/70 hover:bg-white dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              step.locked
                                ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                : step.done
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {step.done ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                          </div>
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              step.locked
                                ? 'text-slate-400 dark:text-slate-500'
                                : step.done
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            Step {step.num}
                          </span>
                        </div>

                        {step.locked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Coming Soon</span>
                          </span>
                        ) : step.done ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            Completed
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            Action Step
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-xs sm:text-sm font-bold ${
                          step.locked
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {step.subtitle}
                      </p>
                    </div>

                    {step.locked ? (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="w-full py-2 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700/60 cursor-not-allowed whitespace-nowrap"
                      >
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Coming Soon</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-tour={step.id === 'step-upload' ? 'upload-documents' : undefined}
                        onClick={step.onAction}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                          step.done
                            ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                        }`}
                      >
                        <span>{step.ctaLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* ========================================================= */}
      {/* 2. THREE CORE PILLARS QUICK NAVIGATION ROW               */}
      {/* ========================================================= */}
      <motion.div variants={itemVariants} className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          {/* Pillar 1: Home */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/60 shadow-xs hover:shadow-md transition-all group text-left cursor-pointer active:scale-98"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">Home</span>
              <span className="block text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">Dashboard overview</span>
            </div>
          </button>

          {/* Pillar 2: Workspace */}
          <button
            onClick={() => setActiveTab('workspaces')}
            className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-orange-300 dark:hover:border-orange-700/60 hover:shadow-md transition-all group text-left cursor-pointer active:scale-98"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-50 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Folder className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">Workspace</span>
              <span className="block text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">Course files & notes</span>
            </div>
          </button>

          {/* Pillar 3: AI Tutor */}
          <button
            onClick={() => {
              if (!activeWorkspace && workspaces.length > 0) {
                setActiveWorkspace(workspaces[0]);
              }
              setActiveTab('ai-tutor');
            }}
            className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-violet-300 dark:hover:border-violet-700/60 hover:shadow-md transition-all group text-left cursor-pointer active:scale-98"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-50 dark:bg-violet-950/60 border border-violet-100 dark:border-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">AI Tutor</span>
              <span className="block text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">Ask & learn instantly</span>
            </div>
          </button>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT GRID (Left 7-8 cols / Right 4-5) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        
        {/* ======================================================= */}
        {/* LEFT COLUMN: Real Workspaces & Real Activities (8 Cols) */}
        {/* ======================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5 sm:space-y-6">

          {/* 3A. YOUR WORKSPACES (Continue Learning) */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Your Workspaces</h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Jump straight into your course materials and notes.
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

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <HomeWorkspaceSkeleton />
                  <HomeWorkspaceSkeleton />
                </div>
              ) : continueLearningSubjects.length === 0 ? (
                <div className="py-10 px-6 text-center space-y-3 bg-slate-50/60 dark:bg-slate-850/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No workspaces created yet</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Create your first workspace to organize your course notes, uploads, and AI flashcards.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('workspaces')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Workspace</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {continueLearningSubjects.map(sub => (
                    <div 
                      key={sub.id}
                      className="p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-white dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Artwork Banner */}
                        <div className="w-full h-24 rounded-lg overflow-hidden relative mb-3.5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex items-center justify-center border border-slate-700/40 shadow-2xs">
                          {sub.artworkType === 'physics' ? (
                            <svg className="w-full h-full opacity-85" viewBox="0 0 240 96" fill="none">
                              <ellipse cx="120" cy="48" rx="64" ry="24" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="3 3" />
                              <ellipse cx="120" cy="48" rx="24" ry="64" stroke="#6366F1" strokeWidth="1.5" transform="rotate(35 120 48)" />
                              <ellipse cx="120" cy="48" rx="24" ry="64" stroke="#A5B4FC" strokeWidth="1.5" transform="rotate(-35 120 48)" />
                              <circle cx="120" cy="48" r="6" fill="#6366F1" />
                              <circle cx="165" cy="36" r="3" fill="#38BDF8" />
                              <circle cx="75" cy="60" r="3" fill="#C084FC" />
                            </svg>
                          ) : sub.artworkType === 'math' ? (
                            <svg className="w-full h-full opacity-85" viewBox="0 0 240 96" fill="none">
                              <path d="M20,76 L220,76 M40,16 L40,86" stroke="#92400E" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                              <path d="M40,76 L180,24 L180,76 Z" stroke="#F59E0B" strokeWidth="1.5" fill="#F59E0B" fillOpacity="0.12" />
                              <path d="M40,76 Q110,12 200,44" stroke="#FBBF24" strokeWidth="2" />
                              <circle cx="180" cy="24" r="3.5" fill="#F59E0B" />
                              <circle cx="110" cy="44" r="3" fill="#FBBF24" />
                            </svg>
                          ) : sub.artworkType === 'chemistry' ? (
                            <svg className="w-full h-full opacity-85" viewBox="0 0 240 96" fill="none">
                              <path d="M120,22 L148,38 L148,70 L120,86 L92,70 L92,38 Z" stroke="#F43F5E" strokeWidth="1.5" fill="#F43F5E" fillOpacity="0.1" />
                              <circle cx="120" cy="22" r="3.5" fill="#FB7185" />
                              <circle cx="148" cy="38" r="3.5" fill="#FB7185" />
                              <circle cx="148" cy="70" r="3.5" fill="#FB7185" />
                              <circle cx="120" cy="86" r="3.5" fill="#FB7185" />
                              <circle cx="92" cy="70" r="3.5" fill="#FB7185" />
                              <circle cx="92" cy="38" r="3.5" fill="#FB7185" />
                              <path d="M148,38 L185,22 M148,70 L185,86 M92,38 L55,22" stroke="#E11D48" strokeWidth="1.5" />
                              <circle cx="185" cy="22" r="3" fill="#FDA4AF" />
                              <circle cx="185" cy="86" r="3" fill="#FDA4AF" />
                              <circle cx="55" cy="22" r="3" fill="#FDA4AF" />
                            </svg>
                          ) : (
                            <svg className="w-full h-full opacity-85" viewBox="0 0 240 96" fill="none">
                              <path d="M40,24 Q80,48 120,72 T200,24" stroke="#10B981" strokeWidth="1.5" fill="none" />
                              <path d="M40,72 Q80,48 120,24 T200,72" stroke="#34D399" strokeWidth="1.5" fill="none" />
                              <line x1="80" y1="36" x2="80" y2="60" stroke="#6EE7B7" strokeWidth="1.5" strokeDasharray="2 2" />
                              <line x1="120" y1="24" x2="120" y2="72" stroke="#6EE7B7" strokeWidth="1.5" strokeDasharray="2 2" />
                              <line x1="160" y1="36" x2="160" y2="60" stroke="#6EE7B7" strokeWidth="1.5" strokeDasharray="2 2" />
                              <circle cx="80" cy="48" r="3" fill="#10B981" />
                              <circle cx="120" cy="48" r="3" fill="#34D399" />
                              <circle cx="160" cy="48" r="3" fill="#6EE7B7" />
                            </svg>
                          )}
                          <span className="absolute bottom-2 left-2 text-[10px] font-bold uppercase tracking-wider text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs border border-white/10">
                            {sub.subject}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xl" role="img" aria-label={sub.subject}>
                            {sub.icon}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {sub.completedChapters} Files Loaded
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
                          <span>Open Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* 3B. RECENT ACTIVITY — REAL USER EVENTS ONLY */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Recent Activity</h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Your real-time study timeline and recent milestone events.
                  </p>
                </div>
              </div>

              {isLoading ? (
                <RecentActivitySkeleton />
              ) : realActivities.length === 0 ? (
                <div className="py-10 px-6 text-center space-y-3 bg-slate-50/60 dark:bg-slate-850/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No recent activity recorded yet</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Upload study materials in your Workspace or chat with your AI Tutor to start your learning journey!
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => setActiveTab('workspaces')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Open Workspaces</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!activeWorkspace && workspaces.length > 0) {
                          setActiveWorkspace(workspaces[0]);
                        }
                        setActiveTab('ai-tutor');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 text-xs font-semibold hover:bg-violet-100 transition-colors cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Ask AI Tutor</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {realActivities.map(act => (
                    <div 
                      key={act.id}
                      className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                          act.iconType === 'workspace-create' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                          act.iconType === 'delete' ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200/80 dark:border-rose-900/40 text-rose-600 dark:text-rose-400' :
                          act.iconType === 'upload' ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/80 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400' :
                          act.iconType === 'tutor' ? 'bg-violet-50 dark:bg-violet-950/60 border-violet-200/80 dark:border-violet-900/40 text-violet-600 dark:text-violet-400' :
                          act.iconType === 'quiz' ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-900/40 text-amber-600 dark:text-amber-400' :
                          act.iconType === 'note' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                          'bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-900/40 text-blue-600 dark:text-blue-400'
                        }`}>
                          {act.iconType === 'quiz' && <Award className="w-4 h-4" />}
                          {act.iconType === 'upload' && <FileUp className="w-4 h-4" />}
                          {act.iconType === 'tutor' && <Bot className="w-4 h-4" />}
                          {act.iconType === 'note' && <FileText className="w-4 h-4" />}
                          {act.iconType === 'workspace-create' && <FolderPlus className="w-4 h-4" />}
                          {act.iconType === 'delete' && <Trash2 className="w-4 h-4" />}
                          {act.iconType === 'workspace' && <Folder className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {act.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {act.detail}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                        {act.timeAgo}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* ======================================================= */}
        {/* RIGHT COLUMN: Quote, AI Tutor Preview & Storage (4-5)   */}
        {/* ======================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">

          {/* 4A. DAILY INSPIRATION QUOTE */}
          <motion.div variants={itemVariants} className="w-full">
            <DailyQuoteCard />
          </motion.div>

          {/* 4B. AI TUTOR PREVIEW */}
          <motion.div variants={itemVariants} className="w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-1">
                {(() => {
                  const homeWs = activeWorkspace || (workspaces && workspaces[0]) || null;
                  const wsLogo = (homeWs as any)?.logo || (homeWs as any)?.icon || (homeWs as any)?.logoUrl || homeWs?.emoji || '/logo-inner.png';
                  const isImg = typeof wsLogo === 'string' && (wsLogo.startsWith('data:') || wsLogo.startsWith('http') || wsLogo.startsWith('/'));
                  return (
                    <img
                      src={isImg ? wsLogo : '/logo-inner.png'}
                      alt="StudyWeb Logo"
                      title={homeWs?.name ? `Workspace: ${homeWs.name}` : 'StudyWeb AI Tutor'}
                      className="w-7 h-7 object-contain select-none shrink-0"
                    />
                  );
                })()}
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">AI Tutor</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
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
                    "Explain this topic simply",
                    "Summarize my core notes",
                    "Generate practice questions",
                    "Help me understand a formula"
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

          {/* 4C. REAL KNOWLEDGE STORAGE USAGE */}
          <motion.div variants={itemVariants} className="w-full">
            <StorageQuotaWidget workspaces={workspaces} isLoading={isLoading} />
          </motion.div>

        </div>
      </div>

    </motion.div>
  );
}
