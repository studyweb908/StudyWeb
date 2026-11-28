import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Menu, 
  Search, 
  Sparkles, 
  FileUp, 
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Monitor,
  Plus,
  FileText,
  Layers,
  Clock,
  X,
  Maximize2,
  Minimize2,
  User,
  Compass,
  Flame,
  Calendar,
  Check,
  AlertCircle,
  Share2
} from 'lucide-react';
import { useThemeMode } from '../../hooks/useThemeMode';
import { readSyncProfileSnapshot, fetchAndReconcileSupabaseProfile } from '../../utils/profileStorage';
import { ProductTourService } from '../../services/ProductTourService';
import { StudyTrackerService, getLocalDateString, getPreviousDateString } from '../../services/StudyTrackerService';
import { triggerNativeDeviceShare } from './ShareContentModal';

const tabLabels: Record<string, string> = {
  'dashboard': 'Home',
  'workspaces': 'Study Workspaces',
  'ai-tutor': 'Your AI Tutor',
  'pdf-chat': 'PDF Chat',
  'study-session': 'Study Session',
  'study-planner': 'Study Planner',
  'subjects': 'Subjects',
  'notes': 'Your AI Study Notes',
  'flashcards': 'Flashcards',
  'quiz-center': 'Quizzes',
  'resources': 'Resources',
  'analytics': 'Analytics',
  'leaderboard': 'Leaderboard',
  'profile': 'Profile Settings',
  'parent-dashboard': 'Parent Link',
};

interface HeaderProps {
  onMenuToggle: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isFocusMode?: boolean;
  onFocusModeToggle?: () => void;
  activeWorkspace?: any;
}

export default function DashboardHeader({ onMenuToggle, activeTab, setActiveTab, onLogout, isFocusMode = false, onFocusModeToggle, activeWorkspace }: HeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const { themeMode, toggleTheme } = useThemeMode();
  const [profilePic, setProfilePic] = useState<string | null>(() => readSyncProfileSnapshot().avatarUrl);

  useEffect(() => {
    const updatePic = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && 'avatarUrl' in detail) {
        setProfilePic(detail.avatarUrl || null);
        return;
      }
      const snap = readSyncProfileSnapshot();
      setProfilePic(snap.avatarUrl);
    };
    updatePic();
    fetchAndReconcileSupabaseProfile()
      .then(({ profile }) => {
        setProfilePic(profile.avatarUrl);
      })
      .catch(() => {});
    window.addEventListener('studyweb_profile_updated', updatePic);
    window.addEventListener('storage', updatePic);
    return () => {
      window.removeEventListener('studyweb_profile_updated', updatePic);
      window.removeEventListener('storage', updatePic);
    };
  }, []);

  // Quick Add State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [modalType, setModalType] = useState<'note' | 'flashcard' | 'session' | null>(null);

  // Streak & Streak Calendar Modal State
  const [isStreakCalendarOpen, setIsStreakCalendarOpen] = useState(false);
  const [streakStats, setStreakStats] = useState(() => StudyTrackerService.getFormattedStats());
  const nowDate = useMemo(() => new Date(), []);
  const [calendarYear, setCalendarYear] = useState<number>(nowDate.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(nowDate.getMonth());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => getLocalDateString());

  useEffect(() => {
    const syncStreak = () => {
      setStreakStats(StudyTrackerService.getFormattedStats());
    };
    const handleOpenStreakCalendar = () => {
      setStreakStats(StudyTrackerService.getFormattedStats());
      setIsStreakCalendarOpen(true);
    };
    window.addEventListener('studyweb-study-stats-updated', syncStreak);
    window.addEventListener('studyweb-activity-updated', syncStreak);
    window.addEventListener('studyweb-daily-routine-completed', syncStreak);
    window.addEventListener('studyweb-open-streak-calendar', handleOpenStreakCalendar);
    return () => {
      window.removeEventListener('studyweb-study-stats-updated', syncStreak);
      window.removeEventListener('studyweb-activity-updated', syncStreak);
      window.removeEventListener('studyweb-daily-routine-completed', syncStreak);
      window.removeEventListener('studyweb-open-streak-calendar', handleOpenStreakCalendar);
    };
  }, []);

  const monthlyCalendar = useMemo(() => {
    return StudyTrackerService.getMonthlyCalendarDays(calendarYear, calendarMonth);
  }, [calendarYear, calendarMonth, streakStats]);

  const completedDatesSet = useMemo(() => {
    return new Set(streakStats.completedRoutineDates || []);
  }, [streakStats.completedRoutineDates]);

  const firstEverStudyDate = useMemo(() => {
    const allDates = [
      ...(streakStats.completedRoutineDates || []),
      ...(streakStats.studyDates || []),
      ...Object.keys(streakStats.dailyHistory || {})
    ].filter(Boolean).sort();
    return allDates[0] || getLocalDateString();
  }, [streakStats]);

  // Compute detailed monthly summary including completed days, broken streak days, and missed/busy days
  const monthAnalysis = useMemo(() => {
    const currentMonthDays = monthlyCalendar.days.filter((d) => d.inCurrentMonth);
    const pastOrTodayDays = currentMonthDays.filter((d) => d.status !== 'future');
    const completedDays = currentMonthDays.filter((d) => d.status === 'completed');
    const partialDays = currentMonthDays.filter((d) => d.status === 'partial');
    const missedDays = pastOrTodayDays.filter(
      (d) => d.status === 'missed' && (!d.isToday || !streakStats.activeToday)
    );

    // Identify exact days where an active streak was broken (previous day was completed, this day was missed/partial on a past day)
    const streakBrokenDays = pastOrTodayDays.filter((d) => {
      if (d.status === 'completed') return false;
      if (d.isToday) return false;
      const prevStr = getPreviousDateString(d.dateStr);
      return completedDatesSet.has(prevStr);
    });

    const totalDaysInMonth = currentMonthDays.length;
    const isMonthFullyCompleted =
      pastOrTodayDays.length > 0 &&
      completedDays.length === pastOrTodayDays.length &&
      (completedDays.length === totalDaysInMonth || pastOrTodayDays.length >= 1);

    const completionRate =
      pastOrTodayDays.length > 0
        ? Math.round((completedDays.length / pastOrTodayDays.length) * 100)
        : 0;

    return {
      totalDaysInMonth,
      pastOrTodayCount: pastOrTodayDays.length,
      completedCount: completedDays.length,
      partialCount: partialDays.length,
      missedCount: missedDays.length,
      streakBrokenDays,
      missedDays,
      completedDays,
      isMonthFullyCompleted,
      completionRate,
    };
  }, [monthlyCalendar, completedDatesSet, streakStats.activeToday]);

  // 12-month overview for the selected year so user can see completed months vs months with missed/broken streaks
  const yearlyMonthsOverview = useMemo(() => {
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const todayStr = getLocalDateString();
    const [currentY, currentM] = todayStr.split('-').map(Number);

    return shortMonths.map((label, mIdx) => {
      const cal = StudyTrackerService.getMonthlyCalendarDays(calendarYear, mIdx);
      const inMonth = cal.days.filter((d) => d.inCurrentMonth);
      const elapsed = inMonth.filter((d) => d.status !== 'future');
      const completed = inMonth.filter((d) => d.status === 'completed').length;
      const missed = elapsed.filter((d) => d.status !== 'completed' && !d.isToday).length;
      const brokenCount = elapsed.filter((d) => {
        if (d.status === 'completed' || d.isToday) return false;
        return completedDatesSet.has(getPreviousDateString(d.dateStr));
      }).length;
      const isFutureMonth =
        calendarYear > currentY || (calendarYear === currentY && mIdx > currentM - 1);
      const isFullMonthCompleted =
        !isFutureMonth && elapsed.length > 0 && completed === elapsed.length && completed === inMonth.length;

      return {
        monthIndex: mIdx,
        label,
        completed,
        missed,
        brokenCount,
        totalDays: inMonth.length,
        elapsedDays: elapsed.length,
        isFutureMonth,
        isFullMonthCompleted,
      };
    });
  }, [calendarYear, streakStats, completedDatesSet]);

  const selectedDayDetails = useMemo(() => {
    const found = monthlyCalendar.days.find((d) => d.dateStr === selectedDayStr);
    if (!found) return null;
    const prevCompiled = completedDatesSet.has(getPreviousDateString(found.dateStr));
    const isStreakBreak =
      found.status !== 'completed' &&
      found.status !== 'future' &&
      !found.isToday &&
      prevCompiled;
    return {
      ...found,
      isStreakBreak,
    };
  }, [monthlyCalendar, selectedDayStr, completedDatesSet]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCalendarYear(now.getFullYear());
    setCalendarMonth(now.getMonth());
    setSelectedDayStr(getLocalDateString(now));
  };

  // Quick Add Form States
  // 1. Note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('Biology');
  const [noteContent, setNoteContent] = useState('');

  // 2. Flashcard
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardCategory, setCardCategory] = useState('AP Biology');

  // 3. Study Session
  const [sessionDuration, setSessionDuration] = useState(25);
  const [sessionGoal, setSessionGoal] = useState('');

  // Handle click outside for Quick Add dropdown
  const quickAddDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickAddDropdownRef.current && !quickAddDropdownRef.current.contains(event.target as Node)) {
        setIsQuickAddOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;

    const newNote = {
      id: Date.now().toString(),
      title: noteTitle.trim(),
      subject: noteSubject,
      content: noteContent.trim(),
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      aiSummarized: false
    };

    const existingNotesStr = localStorage.getItem('studyweb_notes');
    let notesList = [];
    if (existingNotesStr) {
      try {
        notesList = JSON.parse(existingNotesStr);
      } catch (err) {}
    } else {
      notesList = [
        { id: '1', title: 'Cell Biology - Transcription Factors', subject: 'Biology', content: 'Transcription factors are proteins involved in the process of transcribing DNA into RNA. They contain one or more DNA-binding domains...', updatedAt: 'July 5, 2026', aiSummarized: true },
        { id: '2', title: 'Calculus - Shell Method vs Washer Method', subject: 'Mathematics', content: 'Washer method integrates perpendicular to axis of rotation: V = pi * integral[R(x)^2 - r(x)^2] dx. Shell method integrates parallel: V = 2pi * integral[r(y)*h(y)] dy...', updatedAt: 'July 4, 2026', aiSummarized: false },
        { id: '3', title: 'Organic Chem - Nucleophilic Substitutions', subject: 'Chemistry', content: 'SN1 reactions are multi-step mechanisms involving carbocation intermediates. Rate is dependent solely on substrate. SN2 reactions are single concert steps...', updatedAt: 'July 2, 2026', aiSummarized: true }
      ];
    }

    notesList.unshift(newNote);
    localStorage.setItem('studyweb_notes', JSON.stringify(notesList));
    localStorage.setItem('studyweb_selected_note_id', newNote.id);

    window.dispatchEvent(new CustomEvent('studyweb_notes_updated'));
    setActiveTab('notes');
    setNoteTitle('');
    setNoteContent('');
    setModalType(null);
  };

  const handleCreateCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) return;

    const newCard = {
      id: Date.now().toString(),
      category: cardCategory,
      front: cardFront.trim(),
      back: cardBack.trim(),
      known: false
    };

    const existingCardsStr = localStorage.getItem('studyweb_cards');
    let cardsList = [];
    if (existingCardsStr) {
      try {
        cardsList = JSON.parse(existingCardsStr);
      } catch (err) {}
    } else {
      cardsList = [
        { id: '1', category: 'AP Biology', front: 'What is the primary product of glycolysis?', back: 'Pyruvate (specifically 2 molecules of Pyruvate, along with a net gain of 2 ATP and 2 NADH)' },
        { id: '2', category: 'AP Biology', front: 'Which enzyme is responsible for unwinding DNA double helix?', back: 'DNA Helicase' },
        { id: '3', category: 'Calculus', front: 'State the Chain Rule for derivatives.', back: 'd/dx [f(g(x))] = f\'(g(x)) * g\'(x)' },
        { id: '4', category: 'Calculus', front: 'What is the limit of (1 + 1/n)^n as n approaches infinity?', back: 'e (approximately 2.71828)' },
        { id: '5', category: 'AP Physics', front: 'What is the formula for escape velocity of a planet?', back: 'v_e = sqrt(2GM / R), where G is gravitational constant, M is planetary mass, R is planetary radius.' },
      ];
    }

    cardsList.push(newCard);
    localStorage.setItem('studyweb_cards', JSON.stringify(cardsList));

    window.dispatchEvent(new CustomEvent('studyweb_cards_updated', { detail: { category: newCard.category } }));
    setActiveTab('flashcards');
    setCardFront('');
    setCardBack('');
    setModalType(null);
  };

  const handleStartSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    localStorage.setItem('studyweb_quick_start_session', 'true');
    localStorage.setItem('studyweb_quick_start_duration', sessionDuration.toString());
    if (sessionGoal.trim()) {
      localStorage.setItem('studyweb_quick_start_goal', sessionGoal.trim());
    }

    window.dispatchEvent(new CustomEvent('studyweb_quick_session_start', {
      detail: { duration: sessionDuration, goal: sessionGoal.trim() }
    }));

    setActiveTab('study-session');
    setSessionGoal('');
    setModalType(null);
  };

  return (
    <header className="sticky top-0 right-0 z-20 w-full bg-white/90 dark:bg-[#10172D]/90 backdrop-blur-md border-b border-[#E8ECF6] dark:border-[#1E294B] px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 transition-all duration-300">
      {/* Mobile search expanded overlay */}
      {isMobileSearchExpanded && (
        <div className="absolute inset-0 z-30 bg-white dark:bg-[#10172D] px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3">
          <Search className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#5145F5] shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search notes, quizzes, flashcards, or topics..."
            className="flex-1 bg-transparent text-xs sm:text-sm font-semibold text-[#151D3B] dark:text-white placeholder-[#69779C] focus:outline-none"
          />
          <button 
            onClick={() => setIsMobileSearchExpanded(false)}
            className="p-1.5 rounded-lg text-[#69779C] hover:text-[#151D3B] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 min-w-0">
        {/* Mobile Hamburger & Active Page Title */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 md:hidden overflow-hidden">
          <button
            onClick={onMenuToggle}
            className="p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation sidebar"
            title="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate min-w-0">
            {tabLabels[activeTab] || 'Home'}
          </span>
        </div>

        {/* Breadcrumb Navigation Trail - Desktop Only */}
        <div className={`${isFocusMode ? 'hidden' : 'hidden md:flex'} items-center gap-1.5 text-xs sm:text-sm font-medium text-[#69779C] dark:text-slate-400 select-none bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-[#E8ECF6] dark:border-[#1E294B] whitespace-nowrap shrink-0 max-w-[200px] lg:max-w-[260px] overflow-hidden`}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors hover:text-[#5145F5] font-semibold cursor-pointer shrink-0 ${
              activeTab === 'dashboard'
                ? 'text-[#5145F5] font-bold'
                : 'text-[#69779C]'
            }`}
          >
            Dashboard
          </button>
          {activeTab !== 'dashboard' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              <span className="text-[#151D3B] dark:text-slate-200 font-bold tracking-tight truncate min-w-0">
                {tabLabels[activeTab] || activeTab}
              </span>
            </>
          )}
        </div>

        {/* Search Bar - Expanded on desktop */}
        <div className={`${isFocusMode ? 'hidden' : 'hidden md:flex'} flex-1 min-w-[140px] max-w-xs lg:max-w-md relative`}>
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${isSearchFocused ? 'text-[#5145F5]' : 'text-[#69779C]'}`} />
          <input
            id="header-search-input"
            type="text"
            placeholder="Search notes, workspaces, flashcards..."
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-xl border border-[#E8ECF6] dark:border-[#1E294B] bg-[#F6F8FD] dark:bg-slate-900/60 text-[#151D3B] dark:text-slate-100 placeholder-[#69779C] focus:outline-none focus:ring-2 focus:ring-[#5145F5]/20 focus:border-[#5145F5] transition-all truncate"
          />
        </div>

        {/* Quick Actions & Profile Area */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5 ml-auto shrink-0">
          {/* Quick Actions Shortcuts (Desktop Only) */}
          <div className={`${isFocusMode ? 'hidden' : 'hidden md:flex'} items-center shrink-0`}>
            <button
              data-tour="header-ai-tutor-btn"
              onClick={() => setActiveTab('ai-tutor')}
              className="flex items-center gap-1.5 px-2.5 lg:px-3.5 py-1.5 rounded-xl bg-[#5145F5] hover:bg-[#4336E0] text-white text-xs font-bold transition-all shadow-md shadow-[#5145F5]/20 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Ask AI Tutor</span>
              <span className="lg:hidden">AI Tutor</span>
            </button>
          </div>

          {/* Restart Guided Tour Button */}
          <button
            type="button"
            onClick={() => ProductTourService.startOrRestartTour()}
            className="hidden sm:inline-flex h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#5145F5] dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            aria-label="Restart Guided Tour"
            title="Start or Restart Guided Product Tour"
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline text-[11px] font-bold">Tour</span>
          </button>

          {/* Focus Mode Button - Hidden on mobile where screen is already compact */}
          <button
            onClick={onFocusModeToggle}
            className={`hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 rounded-xl border transition-all cursor-pointer items-center justify-center shrink-0 ${
              isFocusMode 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400 ring-2 ring-indigo-500/10' 
                : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            aria-label="Toggle Focus Mode"
            title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          >
            {isFocusMode ? <Minimize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Maximize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
          </button>

          {/* Study Streak & Calendar Button */}
          <button
            type="button"
            onClick={() => {
              setStreakStats(StudyTrackerService.getFormattedStats());
              setIsStreakCalendarOpen(true);
            }}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2 sm:px-3 rounded-xl border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              streakStats.activeToday
                ? 'bg-orange-50/90 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/70 text-orange-600 dark:text-orange-400 hover:bg-orange-100/80 dark:hover:bg-orange-950/60 shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 dark:hover:border-orange-800/60 hover:bg-orange-50/40 dark:hover:bg-orange-950/20'
            }`}
            aria-label="Open Study Streak Calendar"
            title="View Study Streak & Monthly Calendar"
          >
            <Flame
              className={`w-4 h-4 shrink-0 transition-transform ${
                streakStats.activeToday
                  ? 'text-orange-500 fill-orange-500/25 scale-105'
                  : 'text-amber-500 dark:text-amber-400'
              }`}
            />
            <span className="text-xs font-mono font-extrabold tabular-nums tracking-tight">
              {streakStats.currentStreak}
            </span>
            <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider opacity-80">
              {streakStats.currentStreak === 1 ? 'Day' : 'Days'}
            </span>
          </button>

          {/* Mobile Search Toggle */}
          <button
            onClick={() => setIsMobileSearchExpanded(true)}
            className="md:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
            title="Search"
            aria-label="Open search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer group whitespace-nowrap shrink-0 active:scale-90"
            aria-label="Toggle theme mode"
            title={`Current: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} Mode`}
          >
            <span
              key={themeMode}
              className="inline-flex items-center justify-center transition-transform duration-300 group-hover:rotate-12"
            >
              {themeMode === 'system' ? (
                <Monitor className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
              ) : themeMode === 'light' ? (
                <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 text-indigo-400" />
              )}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider hidden xl:block ml-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {themeMode}
            </span>
          </button>

          {/* Profile Picture */}
          <button 
            onClick={() => setActiveTab('profile')}
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors shrink-0"
            title="Profile Settings"
            aria-label="Profile Settings"
          >
            {profilePic ? (
              <img src={profilePic} alt="User Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Add Modals */}
      {modalType === 'note' && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button 
              onClick={() => setModalType(null)} 
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <FileText className="w-5.5 h-5.5 text-indigo-500" />
              <span>Create Quick Note</span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-5">Draft a new note. It will be added instantly to your notes workspace.</p>

            <form onSubmit={handleCreateNoteSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Note Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Cellular Respiration Notes"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Subject / Category</label>
                <select
                  value={noteSubject}
                  onChange={(e) => setNoteSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all"
                >
                  <option value="Biology">Biology</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="AP Physics">AP Physics</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="General">General / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Note Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write note contents here..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all leading-relaxed"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalType === 'flashcard' && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button 
              onClick={() => setModalType(null)} 
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Layers className="w-5.5 h-5.5 text-emerald-500" />
              <span>Create Quick Flashcard</span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-5">Build active recall flashcards on the fly.</p>

            <form onSubmit={handleCreateCardSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Front (Question / Term)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., What enzyme unwinds the DNA helix?"
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Back (Answer / Definition)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Helicase"
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Deck / Category</label>
                <select
                  value={cardCategory}
                  onChange={(e) => setCardCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all"
                >
                  <option value="AP Biology">AP Biology</option>
                  <option value="Calculus">Calculus</option>
                  <option value="AP Physics">AP Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalType === 'session' && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button 
              onClick={() => setModalType(null)} 
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Clock className="w-5.5 h-5.5 text-amber-500" />
              <span>Quick Study Session</span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mb-5">Launch an immersive, distraction-free study timer.</p>

            <form onSubmit={handleStartSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Timer Duration</label>
                <select
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all"
                >
                  <option value="15">15 minutes (Quick Sprint)</option>
                  <option value="25">25 minutes (Standard Pomodoro)</option>
                  <option value="45">45 minutes (Deep Focus)</option>
                  <option value="60">60 minutes (Ultra Focus)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Focus Goal / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Complete AP Chemistry homework sheet"
                  value={sessionGoal}
                  onChange={(e) => setSessionGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Streak & Full History Calendar Modal */}
      {isStreakCalendarOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
          onClick={() => setIsStreakCalendarOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-left my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-orange-50/70 via-amber-50/30 to-white dark:from-slate-900 dark:via-orange-950/20 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  streakStats.activeToday
                    ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                }`}>
                  <Flame className={`w-5 h-5 sm:w-6 sm:h-6 ${streakStats.activeToday ? 'fill-white/25' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {streakStats.currentStreak} {streakStats.currentStreak === 1 ? 'Day' : 'Days'} Study Streak
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      streakStats.activeToday
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50'
                    }`}>
                      {streakStats.activeToday ? 'Completed Today' : 'Pending Today'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Track completed months, active streak days, and days your streak broke when busy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    triggerNativeDeviceShare({
                      type: 'streak',
                      streakCount: Math.max(1, streakStats.currentStreak || 1),
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
                  title="Share your streak"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsStreakCalendarOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label="Close Streak Calendar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
              {/* Top Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/25 border border-orange-200/60 dark:border-orange-900/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Current Streak
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {streakStats.currentStreak} {streakStats.currentStreak === 1 ? 'Day' : 'Days'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-200/60 dark:border-indigo-900/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Best Streak
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {streakStats.longestStreak} {streakStats.longestStreak === 1 ? 'Day' : 'Days'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/60 dark:border-emerald-900/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Completed in {monthlyCalendar.monthLabel.split(' ')[0]}
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {monthAnalysis.completedCount} / {monthAnalysis.pastOrTodayCount || monthAnalysis.totalDaysInMonth}d
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200/60 dark:border-rose-900/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Missed / Busy Days
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {monthAnalysis.missedCount} {monthAnalysis.missedCount === 1 ? 'Day' : 'Days'}
                  </div>
                </div>
              </div>

              {/* 12-Month Overview Strip (Completed Months vs Streak Broken Months) */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {calendarYear} Months Overview
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    Click any month to inspect completed & missed days
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
                  {yearlyMonthsOverview.map((m) => {
                    const isSelected = m.monthIndex === calendarMonth;
                    return (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => setCalendarMonth(m.monthIndex)}
                        className={`px-2 py-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : m.isFullMonthCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : m.completed > 0
                            ? 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/60 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
                            : 'bg-white/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300'
                        }`}
                        title={`${m.label} ${calendarYear}: ${m.completed} completed, ${m.missed} missed/busy`}
                      >
                        <span className="text-[10px] font-extrabold uppercase tracking-tight">
                          {m.label}
                        </span>
                        <span className={`text-[9px] font-bold mt-0.5 ${
                          isSelected
                            ? 'text-indigo-100'
                            : m.isFullMonthCompleted
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : m.completed > 0
                            ? 'text-orange-500 dark:text-orange-400'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}>
                          {m.isFutureMonth ? '—' : `${m.completed}/${m.elapsedDays}d`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Calendar Header & Controls */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {monthlyCalendar.monthLabel}
                      </h4>
                      {monthAnalysis.isMonthFullyCompleted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Month Completed
                        </span>
                      )}
                      {monthAnalysis.streakBrokenDays.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          {monthAnalysis.streakBrokenDays.length} Streak {monthAnalysis.streakBrokenDays.length === 1 ? 'Break' : 'Breaks'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {monthAnalysis.completedCount} completed · {monthAnalysis.missedCount} missed/busy ({monthAnalysis.completionRate}% active rate)
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Previous month"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleJumpToToday}
                      className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Next month"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dName) => (
                    <div
                      key={dName}
                      className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 py-1"
                    >
                      {dName}
                    </div>
                  ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {monthlyCalendar.days.map((day) => {
                    const prevWasCompleted = completedDatesSet.has(getPreviousDateString(day.dateStr));
                    const isStreakBreak =
                      day.inCurrentMonth &&
                      day.status !== 'completed' &&
                      day.status !== 'future' &&
                      !day.isToday &&
                      prevWasCompleted;
                    const isMissedPastDay =
                      day.inCurrentMonth &&
                      day.status === 'missed' &&
                      !day.isToday &&
                      day.dateStr >= firstEverStudyDate;
                    const isSelected = selectedDayStr === day.dateStr;

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => setSelectedDayStr(day.dateStr)}
                        title={
                          day.status === 'completed'
                            ? `${day.dateStr}: Streak Completed (${day.completedMinutes}m studied)`
                            : isStreakBreak
                            ? `${day.dateStr}: Streak Broken — Missed study when busy (${day.completedMinutes}m / ${day.targetMinutes}m)`
                            : day.status === 'partial'
                            ? `${day.dateStr}: Partial study (${day.completedMinutes}m / ${day.targetMinutes}m)`
                            : day.status === 'missed'
                            ? `${day.dateStr}: Not studied / Busy day (0m)`
                            : `${day.dateStr}: Upcoming`
                        }
                        className={`relative h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border ${
                          !day.inCurrentMonth
                            ? 'opacity-30 bg-slate-50/40 dark:bg-slate-900/20 border-transparent text-slate-400'
                            : day.status === 'completed'
                            ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-500 shadow-xs shadow-orange-500/20 font-extrabold'
                            : isStreakBreak
                            ? 'bg-rose-50 dark:bg-rose-950/45 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold'
                            : day.status === 'partial'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold'
                            : isMissedPastDay
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-600/80 dark:text-rose-400/80 border-rose-200/70 dark:border-rose-900/40'
                            : day.isToday
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-2 border-dashed border-indigo-500 font-extrabold'
                            : day.status === 'future'
                            ? 'bg-slate-50/50 dark:bg-slate-800/25 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800/60'
                            : 'bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-800'
                        } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                      >
                        <span className="text-xs sm:text-sm leading-none">{day.dayNumber}</span>
                        <div className="mt-1 flex items-center justify-center">
                          {day.status === 'completed' ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : isStreakBreak ? (
                            <span className="text-[9px] font-extrabold uppercase tracking-tighter text-rose-600 dark:text-rose-400 leading-none">
                              Break
                            </span>
                          ) : day.status === 'partial' ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          ) : day.inCurrentMonth && day.status === 'missed' && !day.isToday ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400/70 dark:bg-rose-500/60" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-gradient-to-br from-orange-500 to-amber-500 inline-block" />
                      <span>Streak Completed</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-rose-100 dark:bg-rose-950/70 border border-rose-400 inline-block" />
                      <span>Streak Broken / Busy</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-950/70 border border-amber-400 inline-block" />
                      <span>Partial Study</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm border-2 border-dashed border-indigo-500 inline-block" />
                      <span>Today</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Day Detail & Streak Breakdown Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedDayDetails && (
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Selected Day: {selectedDayDetails.dateStr}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        selectedDayDetails.status === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : selectedDayDetails.isStreakBreak
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          : selectedDayDetails.status === 'partial'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          : selectedDayDetails.status === 'future'
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      }`}>
                        {selectedDayDetails.status === 'completed'
                          ? 'Completed'
                          : selectedDayDetails.isStreakBreak
                          ? 'Streak Broken'
                          : selectedDayDetails.status === 'partial'
                          ? 'Partial Study'
                          : selectedDayDetails.status === 'future'
                          ? 'Upcoming'
                          : 'Not Studied / Busy'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">
                      {selectedDayDetails.status === 'completed'
                        ? `You completed your study streak on this day (${selectedDayDetails.completedMinutes} mins studied).`
                        : selectedDayDetails.isStreakBreak
                        ? `Your streak broke on this day because you were busy and did not complete your study session (${selectedDayDetails.completedMinutes}m / ${selectedDayDetails.targetMinutes}m).`
                        : selectedDayDetails.status === 'partial'
                        ? `Studied ${selectedDayDetails.completedMinutes} mins out of ${selectedDayDetails.targetMinutes} mins target.`
                        : selectedDayDetails.status === 'future'
                        ? 'This date is in the future.'
                        : 'No study activity was recorded on this day.'}
                    </p>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Streak Breaks & Missed Days ({monthlyCalendar.monthLabel.split(' ')[0]})</span>
                  </div>
                  {monthAnalysis.streakBrokenDays.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                        Streak broke on:{' '}
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {monthAnalysis.streakBrokenDays.map((d) => d.dateStr).join(', ')}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Total busy / unstudied days this month: {monthAnalysis.missedCount}
                      </p>
                    </div>
                  ) : monthAnalysis.missedCount > 0 ? (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 font-medium">
                      You have <span className="font-bold text-rose-600 dark:text-rose-400">{monthAnalysis.missedCount}</span> unstudied/busy {monthAnalysis.missedCount === 1 ? 'day' : 'days'} in {monthlyCalendar.monthLabel}.
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-semibold">
                      Zero missed days so far in {monthlyCalendar.monthLabel}! Keep your streak going strong.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
