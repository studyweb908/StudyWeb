import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Sparkles, 
  FileUp, 
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  Plus,
  FileText,
  Layers,
  Clock,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

const tabLabels: Record<string, string> = {
  'dashboard': 'Overview',
  'ai-tutor': 'AI Tutor',
  'pdf-chat': 'PDF Chat',
  'study-session': 'Study Session',
  'study-planner': 'Study Planner',
  'subjects': 'Subjects',
  'notes': 'Notes',
  'flashcards': 'Flashcards',
  'quiz-center': 'Quiz Center',
  'mind-maps': 'Mind Maps',
  'resources': 'Resources',
  'analytics': 'Analytics',
  'achievements': 'Achievements',
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
}

export default function DashboardHeader({ onMenuToggle, activeTab, setActiveTab, onLogout, isFocusMode = false, onFocusModeToggle }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  // Quick Add State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [modalType, setModalType] = useState<'note' | 'flashcard' | 'session' | null>(null);

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

  // Simulated live notifications
  const notifications = [
    { id: '1', text: '🏆 Weekly leaderboard results are in! You ranked #4.', time: '5m ago', unread: true },
    { id: '2', text: '🤖 AI Tutor finished analyzing "Biology Chapter 3". Try the custom quiz!', time: '1h ago', unread: true },
    { id: '3', text: '🔥 Streak warning: complete today\'s target of 30 mins to save your 7-day streak!', time: '4h ago', unread: false },
  ];

  return (
    <header className="sticky top-0 right-0 z-20 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.3)] px-4 sm:px-6 py-3.5 transition-all duration-300">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile Hamburger & Logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <button 
            onClick={onMenuToggle}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">StudyWeb</span>
          </div>
        </div>

        {/* Breadcrumb Navigation Trail - Desktop Only */}
        <div className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 select-none bg-slate-50 dark:bg-slate-800/40 px-3.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            Dashboard
          </button>
          {activeTab !== 'dashboard' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              <span className="text-slate-800 dark:text-slate-200 font-bold tracking-tight">
                {tabLabels[activeTab] || activeTab}
              </span>
            </>
          )}
        </div>

        {/* Search Bar - Expanded on desktop */}
        <div className="hidden sm:flex flex-1 max-w-md relative">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors duration-200 ${isSearchFocused ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
          <input
            id="header-search-input"
            type="text"
            placeholder="Search notes, flashcards, subjects, or ask AI..."
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Metrics, Gamification & Profile Area */}
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          {/* Quick Actions Shortcuts (Desktop Only) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pdf-chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload PDF</span>
            </button>
            <button
              onClick={() => setActiveTab('ai-tutor')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden md:block" />

          {/* Quick Add Dropdown */}
          <div className="relative" ref={quickAddDropdownRef}>
            <button
              onClick={() => {
                setIsQuickAddOpen(!isQuickAddOpen);
                setIsNotificationsOpen(false);
                setIsProfileOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/15 hover:shadow-indigo-600/25 cursor-pointer relative"
              title="Quick Add Content"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Quick Add</span>
            </button>

            {isQuickAddOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-30">
                <div className="px-4 py-1.5 border-b border-slate-100 dark:border-slate-700 mb-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quick Create</p>
                </div>
                
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setModalType('note');
                  }}
                  className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2.5 transition-colors text-slate-700 dark:text-slate-200 font-semibold text-xs text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>New Note</span>
                </button>

                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setModalType('flashcard');
                  }}
                  className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2.5 transition-colors text-slate-700 dark:text-slate-200 font-semibold text-xs text-left cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>New Flashcard</span>
                </button>

                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setModalType('session');
                  }}
                  className="w-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2.5 transition-colors text-slate-700 dark:text-slate-200 font-semibold text-xs text-left cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Start Study Session</span>
                </button>
              </div>
            )}
          </div>

          {/* Focus Mode Button */}
          <button
            onClick={onFocusModeToggle}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isFocusMode 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400 ring-2 ring-indigo-500/10' 
                : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            aria-label="Toggle Focus Mode"
            title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          >
            {isFocusMode ? <Minimize2 className="w-5.5 h-5.5" /> : <Maximize2 className="w-5.5 h-5.5" />}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => {
              const nextDark = !isDark;
              setIsDark(nextDark);
              if (nextDark) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
              } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
              }
              window.dispatchEvent(new Event('theme-changed'));
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Toggle theme mode"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-30">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">2 New</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${notif.unread ? 'bg-indigo-500/5' : ''}`}
                    >
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">{notif.text}</p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">{notif.time}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-100 dark:border-slate-700 text-center">
                  <button 
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      setActiveTab('dashboard');
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile User Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer text-left"
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
                alt="Alex Avatar"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
              />
              <ChevronDown className="w-4 h-4 text-slate-400 hidden xs:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2.5 z-30">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">Alex Johnson</p>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Grade 11 • AP Classes</p>
                </div>
                
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setActiveTab('profile');
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  My Profile
                </button>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setActiveTab('profile');
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Account Settings
                </button>

                <div className="border-t border-slate-100 dark:border-slate-700 my-1.5" />

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-extrabold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            )}
          </div>
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
    </header>
  );
}
