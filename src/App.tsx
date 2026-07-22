/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import SocialProof from './components/SocialProof';
import ForStudents from './components/ForStudents';
import StudyTools from './components/StudyTools';
import InteractiveDemo from './components/InteractiveDemo';
import Pricing from './components/Pricing';
import About from './components/About';
import Contact from './components/Contact';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

// Authenticated Dashboard Components
import DashboardSidebar from './components/Dashboard/DashboardSidebar';
import DashboardHeader from './components/Dashboard/DashboardHeader';
import DashboardHome from './components/Dashboard/DashboardHome';
import AITutorWorkspace from './components/Dashboard/AITutorWorkspace';
import PDFWorkspaceView from './components/Dashboard/PDFWorkspaceView';
import StudySessionView from './components/Dashboard/StudySessionView';
import QuizCenterView from './components/Dashboard/QuizCenterView';
import FlashcardsView from './components/Dashboard/FlashcardsView';
import QuickActions from './components/Dashboard/QuickActions';
import QuickNoteModal from './components/Dashboard/QuickNoteModal';
import OfflineNotice from './components/OfflineNotice';
import { useThemeMode } from './hooks/useThemeMode';
import { 
  Sparkles, 
  Terminal, 
  Clock, 
  LogOut, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle,
  LayoutDashboard,
  Folder,
  Calendar,
  User,
  Plus,
  X,
  FileUp,
  FileText
} from 'lucide-react';

import { Workspace, INITIAL_WORKSPACES } from './components/Dashboard/WorkspaceTypes';
import WorkspaceSelector from './components/Dashboard/WorkspaceSelector';
import WorkspaceContainer from './components/Dashboard/WorkspaceContainer';
import ToastContainer from './components/ToastContainer';

import {
  StudyPlannerView,
  SubjectsView,
  NotesView,
  ResourcesView,
  AnalyticsView,
  AchievementsView,
  LeaderboardView,
  ProfileView,
  ParentDashboardView
} from './components/Dashboard/AuxiliaryViews';

export default function App() {
  const { toggleTheme } = useThemeMode(); // Initialize real-time theme synchronization service at root level
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('studyweb_active_tab') || 'dashboard';
  });

  // Workspaces State
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const local = localStorage.getItem('studyweb_workspaces_v2');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (err) {}
    }
    return INITIAL_WORKSPACES;
  });
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(() => {
    const savedId = sessionStorage.getItem('studyweb_active_workspace_id');
    if (savedId) {
      const local = localStorage.getItem('studyweb_workspaces_v2');
      if (local) {
        try {
          const parsed = JSON.parse(local) as Workspace[];
          return parsed.find(w => w.id === savedId) || null;
        } catch (err) {}
      }
    }
    return null;
  });

  // Persist session activeTab and activeWorkspace
  useEffect(() => {
    sessionStorage.setItem('studyweb_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeWorkspace) {
      sessionStorage.setItem('studyweb_active_workspace_id', activeWorkspace.id);
    } else {
      sessionStorage.removeItem('studyweb_active_workspace_id');
    }
  }, [activeWorkspace]);

  const handleUpdateWorkspace = (updated: Workspace) => {
    const next = workspaces.map(w => w.id === updated.id ? updated : w);
    setWorkspaces(next);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(next));
    if (activeWorkspace && activeWorkspace.id === updated.id) {
      setActiveWorkspace(updated);
    }
  };

  const handleCreateWorkspace = (ws: Workspace) => {
    const next = [ws, ...workspaces];
    setWorkspaces(next);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(next));
    setActiveWorkspace(ws);
  };

  const handleTogglePin = (id: string) => {
    const next = workspaces.map(w => w.id === id ? { ...w, pinned: !w.pinned } : w);
    setWorkspaces(next);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(next));
    if (activeWorkspace && activeWorkspace.id === id) {
      setActiveWorkspace({ ...activeWorkspace, pinned: !activeWorkspace.pinned });
    }
  };

  const handleToggleFavorite = (id: string) => {
    const next = workspaces.map(w => w.id === id ? { ...w, favorite: !w.favorite } : w);
    setWorkspaces(next);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(next));
    if (activeWorkspace && activeWorkspace.id === id) {
      setActiveWorkspace({ ...activeWorkspace, favorite: !activeWorkspace.favorite });
    }
  };

  const handleDeleteWorkspace = (id: string) => {
    const next = workspaces.filter(w => w.id !== id);
    setWorkspaces(next);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(next));
    if (activeWorkspace && activeWorkspace.id === id) {
      setActiveWorkspace(null);
    }
  };

  const handleReorderWorkspaces = (newWorkspaces: Workspace[]) => {
    setWorkspaces(newWorkspaces);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(newWorkspaces));
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [showQuickScan, setShowQuickScan] = useState(false);
  const [showPasteLink, setShowPasteLink] = useState(false);
  const [pastedLink, setPastedLink] = useState('');

  // Auto-hide secure login toast
  useEffect(() => {
    let timeout: any;
    if (showLoginToast) {
      timeout = setTimeout(() => {
        setShowLoginToast(false);
      }, 5000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showLoginToast]);

  // Initialize and listen to custom auth events
  useEffect(() => {
    const savedLogin = localStorage.getItem('studyweb_is_logged_in');
    const onboardingComplete = localStorage.getItem('studyweb_onboarding_complete');
    
    if (savedLogin === 'true') {
      setIsLoggedIn(true);
    }

    const handleLoginSuccess = () => {
      setIsLoggedIn(true);
      localStorage.setItem('studyweb_is_logged_in', 'true');
      setActiveTab('dashboard');
      setShowLoginToast(true);
    };

    const handleSignupSuccess = () => {
      setIsLoggedIn(true);
      localStorage.setItem('studyweb_is_logged_in', 'true');
      localStorage.setItem('studyweb_onboarding_complete', 'true');
      setActiveTab('dashboard');
      setShowLoginToast(true);
    };

    window.addEventListener('studyweb-login-success', handleLoginSuccess);
    window.addEventListener('studyweb-signup-success', handleSignupSuccess);
    return () => {
      window.removeEventListener('studyweb-login-success', handleLoginSuccess);
      window.removeEventListener('studyweb-signup-success', handleSignupSuccess);
    };
  }, []);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const executeLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('studyweb_is_logged_in');
    setActiveTab('dashboard');
    setActiveWorkspace(null);
    sessionStorage.removeItem('studyweb_active_tab');
    sessionStorage.removeItem('studyweb_active_workspace_id');
    setShowLogoutConfirm(false);
    setShowSessionWarning(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };


  // Session Expiration / Inactivity System (60s total by default for ease of user testing, adjustable via account preferences)
  const [sessionTimeout, setSessionTimeout] = useState(() => Number(localStorage.getItem('studyweb_session_timeout') || 60));
  const [inactivitySeconds, setInactivitySeconds] = useState(0);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  const SESSION_TIMEOUT_LIMIT = sessionTimeout;
  const SESSION_WARNING_THRESHOLD = Math.round(sessionTimeout / 2);

  const playWarningSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Tone 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      // Tone 2: A5 (880.00 Hz) slightly offset
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.01, ctx.currentTime);
      gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.6);
    } catch (err) {
      console.warn('Web Audio API not supported or blocked by browser play policy:', err);
    }
  };

  // Sync sessionTimeout change to localStorage
  useEffect(() => {
    localStorage.setItem('studyweb_session_timeout', String(sessionTimeout));
    setInactivitySeconds(0);
  }, [sessionTimeout]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const resetTimer = () => {
      setInactivitySeconds(0);
    };

    if (isLoggedIn) {
      interval = setInterval(() => {
        setInactivitySeconds(prev => {
          const next = prev + 1;
          if (next >= sessionTimeout) {
            // Auto logout
            setIsLoggedIn(false);
            localStorage.removeItem('studyweb_is_logged_in');
            setActiveTab('dashboard');
            setActiveWorkspace(null);
            sessionStorage.removeItem('studyweb_active_tab');
            sessionStorage.removeItem('studyweb_active_workspace_id');
            setShowLogoutConfirm(false);
            setShowSessionWarning(false);
            return 0;
          }
          return next;
        });
      }, 1000);

      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('click', resetTimer);
      window.addEventListener('touchstart', resetTimer);

      return () => {
        clearInterval(interval);
        window.removeEventListener('mousemove', resetTimer);
        window.removeEventListener('keydown', resetTimer);
        window.removeEventListener('click', resetTimer);
        window.removeEventListener('touchstart', resetTimer);
      };
    } else {
       setInactivitySeconds(0);
       setShowSessionWarning(false);
    }
  }, [isLoggedIn, sessionTimeout]);

  // Separate effect to handle warning logic
  useEffect(() => {
    if (isLoggedIn && inactivitySeconds === sessionTimeout - 15 && sessionTimeout > 15) {
       setShowSessionWarning(true);
       playWarningSound();
    } else if (isLoggedIn && inactivitySeconds < sessionTimeout - 15) {
       setShowSessionWarning(false);
    }
  }, [isLoggedIn, inactivitySeconds, sessionTimeout]);

  // Helper helper to render active workspace tabs
  const renderDashboardContent = () => {
    // Grounded Fallback message
    const renderFallback = (title: string, desc: string) => (
      <div className="max-w-xl mx-auto text-center py-20 px-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[28px] space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full animate-ping scale-110" />
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-sm mx-auto">
            {desc}
          </p>
        </div>

        <button
          onClick={() => setActiveTab('dashboard')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          Select or Create a Workspace
        </button>
      </div>
    );

    switch (activeTab) {
      case 'dashboard':
        if (activeWorkspace) {
          return (
            <WorkspaceContainer 
              workspace={activeWorkspace} 
              onBack={() => setActiveWorkspace(null)} 
              onUpdateWorkspace={handleUpdateWorkspace}
              initialTab="overview"
            />
          );
        }
        return (
          <WorkspaceSelector 
            workspaces={workspaces} 
            onSelectWorkspace={setActiveWorkspace} 
            onCreateWorkspace={handleCreateWorkspace}
            onTogglePin={handleTogglePin}
            onToggleFavorite={handleToggleFavorite}
            onDeleteWorkspace={handleDeleteWorkspace}
            onReorderWorkspaces={handleReorderWorkspaces}
          />
        );
      case 'ai-tutor':
        if (activeWorkspace) {
          return (
            <WorkspaceContainer 
              workspace={activeWorkspace} 
              onBack={() => setActiveWorkspace(null)} 
              onUpdateWorkspace={handleUpdateWorkspace}
              initialTab="chat"
            />
          );
        }
        return renderFallback(
          "Select a Workspace",
          "Your AI Tutor can answer questions using outside knowledge while strictly staying on topic, as well as use your active documents. Please select or create a study workspace to begin chatting."
        );
      case 'notes':
        if (activeWorkspace) {
          return (
            <WorkspaceContainer 
              workspace={activeWorkspace} 
              onBack={() => setActiveWorkspace(null)} 
              onUpdateWorkspace={handleUpdateWorkspace}
              initialTab="notes"
            />
          );
        }
        return renderFallback(
          "Notebook is Workspace-Grounded",
          "Write rich-text notes with real-time AI autocompletes linked directly to your materials. Select a study workspace first."
        );
      case 'flashcards':
        if (activeWorkspace) {
          return (
            <WorkspaceContainer 
              workspace={activeWorkspace} 
              onBack={() => setActiveWorkspace(null)} 
              onUpdateWorkspace={handleUpdateWorkspace}
              initialTab="flashcards"
            />
          );
        }
        return renderFallback(
          "Spaced Repetition is Workspace-Grounded",
          "Automate card generators from active chapters. Select a study workspace first to study and track Leitner boxes."
        );
      case 'quiz-center':
        if (activeWorkspace) {
          return (
            <WorkspaceContainer 
              workspace={activeWorkspace} 
              onBack={() => setActiveWorkspace(null)} 
              onUpdateWorkspace={handleUpdateWorkspace}
              initialTab="quiz"
            />
          );
        }
        return renderFallback(
          "Exam Practice is Workspace-Grounded",
          "Simulate practice tests with negative markings that identify your core weak sections. Create or select a workspace first."
        );
      case 'study-session':
        return <StudySessionView />;
      case 'study-planner':
        return <StudyPlannerView />;
      case 'subjects':
        return <SubjectsView />;
      case 'resources':
        return <ResourcesView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'achievements':
        return <AchievementsView />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'profile':
        return <ProfileView sessionTimeout={sessionTimeout} setSessionTimeout={setSessionTimeout} />;
      case 'parent-dashboard':
        return <ParentDashboardView />;
      case 'pdf-chat':
        return (
          <PDFWorkspaceView 
            workspace={activeWorkspace || undefined}
            onUpdateWorkspace={handleUpdateWorkspace}
          />
        );
      default:
        if (activeWorkspace) {
          return (
            <WorkspaceContainer 
              workspace={activeWorkspace} 
              onBack={() => setActiveWorkspace(null)} 
              onUpdateWorkspace={handleUpdateWorkspace}
            />
          );
        }
        return (
          <WorkspaceSelector 
            workspaces={workspaces} 
            onSelectWorkspace={setActiveWorkspace} 
            onCreateWorkspace={handleCreateWorkspace}
            onTogglePin={handleTogglePin}
            onToggleFavorite={handleToggleFavorite}
            onDeleteWorkspace={handleDeleteWorkspace}
            onReorderWorkspaces={handleReorderWorkspaces}
          />
        );
    }
  };

  // 1. RENDERING AUTHENTICATED WORKSPACE
  if (isLoggedIn) {
    return (
      <div className="h-[100dvh] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex relative transition-colors duration-300">
        
        {/* Sidebar Navigation Panel */}
        <DashboardSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onLogout={handleLogout} 
          isFocusMode={isFocusMode}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          setActiveWorkspace={setActiveWorkspace}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Workspace body Area */}
        <div className={`${isFocusMode ? 'md:pl-0' : isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} flex flex-col flex-1 min-w-0 h-[100dvh] overflow-hidden relative transition-all duration-300`}>
          
          {/* Header Bar */}
          <DashboardHeader 
            onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            isFocusMode={isFocusMode}
            onFocusModeToggle={() => setIsFocusMode(!isFocusMode)}
            activeWorkspace={activeWorkspace}
          />

          {/* Active Workspace Viewport */}
          <main id="workspace-main-content" className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 ${isFocusMode ? 'max-w-none w-full' : 'max-w-7xl mx-auto w-full'} transition-all duration-300`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {renderDashboardContent()}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Quick Creator Menu & FAB System */}
          <QuickActions activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Mobile Bottom Navigation Bar */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-lg grid grid-cols-5 items-center justify-items-center px-2 pb-safe z-40 shadow-lg">
            <button
              onClick={() => {
                setActiveTab('study-session');
              }}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                activeTab === 'study-session'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-[10px] font-extrabold text-center leading-none">Study Session</span>
            </button>

            <button
              onClick={() => {
                setActiveWorkspace(null);
                setActiveTab('dashboard');
              }}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                activeTab === 'dashboard' && activeWorkspace === null
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Folder className="w-5 h-5" />
              <span className="text-[10px] font-extrabold">Workspaces</span>
            </button>

            {/* Pulsing FAB Center Plus Button */}
            <button
              onClick={() => setIsBottomSheetOpen(true)}
              className="w-12 h-12 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center shadow-lg -mt-5 hover:scale-110 active:scale-95 transition-all cursor-pointer border-4 border-slate-50 dark:border-slate-950 z-45"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>

            <button
              onClick={() => {
                setActiveTab('study-planner');
                setActiveWorkspace(null);
              }}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                activeTab === 'study-planner'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] font-extrabold">Planner</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('profile');
                setActiveWorkspace(null);
              }}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                activeTab === 'profile'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-extrabold">Profile</span>
            </button>
          </div>

          {/* Mobile Bottom Sheet (Create Modal) */}
          <AnimatePresence>
            {isBottomSheetOpen && (
              <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center">
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsBottomSheetOpen(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Sliding panel */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="relative w-full bg-white dark:bg-slate-900 rounded-t-[32px] border-t border-slate-200 dark:border-slate-800 px-6 pt-5 pb-8 z-50 max-h-[85vh] overflow-y-auto shadow-2xl text-left"
                >
                  {/* Pull-to-dismiss bar indicator */}
                  <div className="w-12 h-1 bg-slate-200 dark:bg-slate-750 rounded-full mx-auto mb-5" />

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-slate-850 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                      <span>Quick Creation Panel</span>
                    </h3>
                    <button
                      onClick={() => setIsBottomSheetOpen(false)}
                      className="p-1.5 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 mb-6">
                    {/* Create Workspace */}
                    <button
                      onClick={() => {
                        setIsBottomSheetOpen(false);
                        setActiveWorkspace(null);
                        setActiveTab('dashboard');
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('studyweb_open_create_workspace'));
                        }, 100);
                      }}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 text-left cursor-pointer transition-all flex flex-col gap-2 group active:scale-95"
                    >
                      <span className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow">
                        <Folder className="w-4.5 h-4.5" />
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">Create Workspace</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-tight">Start new study hub</p>
                      </div>
                    </button>

                    {/* Upload Files */}
                    <button
                      onClick={() => {
                        setIsBottomSheetOpen(false);
                        if (activeWorkspace) {
                          setActiveTab('pdf-chat');
                        } else {
                          setActiveTab('dashboard');
                        }
                      }}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-teal-50/20 dark:hover:bg-teal-950/20 text-left cursor-pointer transition-all flex flex-col gap-2 group active:scale-95"
                    >
                      <span className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow">
                        <FileUp className="w-4.5 h-4.5" />
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">Upload Files</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-tight">Import PDFs & guides</p>
                      </div>
                    </button>

                    {/* Create Notes */}
                    <button
                      onClick={() => {
                        setIsBottomSheetOpen(false);
                        setShowQuickNote(true);
                      }}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 text-left cursor-pointer transition-all flex flex-col gap-2 group active:scale-95"
                    >
                      <span className="w-9 h-9 rounded-xl bg-violet-500 text-white flex items-center justify-center shadow">
                        <FileText className="w-4.5 h-4.5" />
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">Create Notes</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-tight">Draft a quick lecture note</p>
                      </div>
                    </button>

                    {/* Ask AI */}
                    <button
                      onClick={() => {
                        setIsBottomSheetOpen(false);
                        setActiveTab('ai-tutor');
                      }}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 text-left cursor-pointer transition-all flex flex-col gap-2 group active:scale-95"
                    >
                      <span className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow">
                        <Sparkles className="w-4.5 h-4.5" />
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">Ask AI</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-tight">Chat with grounded tutor</p>
                      </div>
                    </button>

                    {/* Quick Scan */}
                    <button
                      onClick={() => {
                        setIsBottomSheetOpen(false);
                        setShowQuickScan(true);
                      }}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-pink-50/20 dark:hover:bg-pink-950/20 text-left cursor-pointer transition-all flex flex-col gap-2 group active:scale-95"
                    >
                      <span className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow">
                        <Terminal className="w-4.5 h-4.5" />
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">Quick Scan</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-tight">Scan notes with camera</p>
                      </div>
                    </button>

                    {/* Paste Link */}
                    <button
                      onClick={() => {
                        setIsBottomSheetOpen(false);
                        setShowPasteLink(true);
                      }}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-cyan-50/20 dark:hover:bg-cyan-950/20 text-left cursor-pointer transition-all flex flex-col gap-2 group active:scale-95"
                    >
                      <span className="w-9 h-9 rounded-xl bg-cyan-500 text-white flex items-center justify-center shadow">
                        <RefreshCw className="w-4.5 h-4.5" />
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">Paste Link</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-tight">Index any website URL</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Quick Scan Simulator Dialog */}
          <AnimatePresence>
            {showQuickScan && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowQuickScan(false)}
                  className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 15 }}
                  className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-left space-y-4"
                >
                  <button
                    onClick={() => setShowQuickScan(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-pink-500" />
                    <span>Quick Scanner</span>
                  </h3>

                  {/* Camera view container mockup */}
                  <div className="relative aspect-video w-full rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner group">
                    <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-xl pointer-events-none animate-pulse" />
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full absolute top-3 right-3 animate-ping" />
                    
                    <div className="text-center space-y-2 z-10 p-4">
                      <p className="text-xs font-bold text-white/90">Simulated Scanner Camera</p>
                      <p className="text-[10px] text-white/55 font-semibold">Align lecture notes or textbook diagrams inside the dotted lines</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setShowQuickScan(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-750 font-extrabold text-slate-500 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickScan(false);
                        (window as any).showToast?.("Quick Scan complete! Handouts digitized as 'Scanned Document' inside library.", "success");
                      }}
                      className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl shadow-lg shadow-pink-600/10"
                    >
                      Capture Photo
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Paste Link Dialog */}
          <AnimatePresence>
            {showPasteLink && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowPasteLink(false)}
                  className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 15 }}
                  className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-left space-y-4"
                >
                  <button
                    onClick={() => setShowPasteLink(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-cyan-500" />
                    <span>Paste Study Link</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">Paste any article link, YouTube video URL, or syllabus link. AI will index it as a reference doc.</p>

                  <div className="space-y-1 text-xs">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Website URL</label>
                    <input
                      required
                      type="url"
                      placeholder="https://example.edu/lecture-slides"
                      value={pastedLink}
                      onChange={(e) => setPastedLink(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setShowPasteLink(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-750 font-extrabold text-slate-500 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!pastedLink.trim()) return;
                        setShowPasteLink(false);
                        setPastedLink('');
                        (window as any).showToast?.("URL successfully submitted! AI Tutor has fetched the metadata and completed vector indexing.", "success");
                      }}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-lg"
                    >
                      Index Website
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout Confirmation Modal */}
        <AnimatePresence>
          {(showLogoutConfirm || showSessionWarning) && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowLogoutConfirm(false);
                  setShowSessionWarning(false);
                  setInactivitySeconds(0);
                }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative z-10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Visual Top Highlight Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />

                <div className="flex flex-col items-center text-center">
                  {/* Warning Icon with pulsating ring */}
                  <div className="relative mb-5">
                    <div className="absolute inset-0 bg-rose-500/10 dark:bg-rose-500/20 rounded-full animate-ping scale-150 opacity-75" />
                    <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-full flex items-center justify-center text-rose-500 dark:text-rose-400 relative z-10">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                  </div>

                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                    {showSessionWarning && !showLogoutConfirm ? "Are you still there?" : "Confirm Logout"}
                  </h3>
                  
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed">
                    {showSessionWarning && !showLogoutConfirm 
                      ? "Your session is about to expire due to inactivity. Move your mouse or press a key to stay logged in." 
                      : "Are you sure you want to log out of your session? You will need to sign back in to access your dashboard and active workspaces."}
                  </p>

                  {/* Subtle Countdown Tracker */}
                  <div className="w-full bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-4 mb-6 border border-slate-150 dark:border-slate-800/80 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Auto-logout on idle
                      </span>
                      <span className="text-sm font-black font-mono text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 animate-spin text-rose-500" style={{ animationDuration: "3s" }} />
                        {SESSION_TIMEOUT_LIMIT - inactivitySeconds}s
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-3 overflow-hidden relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                        initial={{ width: "100%" }}
                        animate={{ 
                          width: `${Math.max(0, ((SESSION_TIMEOUT_LIMIT - inactivitySeconds) / SESSION_TIMEOUT_LIMIT) * 100)}%` 
                        }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowLogoutConfirm(false);
                        setShowSessionWarning(false);
                        setInactivitySeconds(0);
                      }}
                      className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 order-2 sm:order-1 focus:outline-none"
                    >
                      {showSessionWarning && !showLogoutConfirm ? "I'm still here" : "Cancel"}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={executeLogout}
                      className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 shadow-md shadow-rose-600/10 dark:shadow-rose-500/15 border border-rose-600/10 dark:border-rose-400/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 order-1 sm:order-2 focus:outline-none"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Yes, Log Out
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Global Quick Note Capture Modal */}
        <QuickNoteModal 
          isOpen={showQuickNote} 
          onClose={() => setShowQuickNote(false)} 
          onNavigateToNotes={() => setActiveTab('notes')} 
        />
        

        <OfflineNotice />
        <ToastContainer />
      </div>
    );
  }

  // 2. RENDERING PUBLIC LANDING PAGE
  return (
    <div className="min-h-screen font-sans selection:bg-brand-primary/20 selection:text-brand-primary relative">

      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent origin-left z-[100]"
        style={{ scaleX }}
      />
      
      <Navigation />
      
      <main className="pb-24 md:pb-0">
        <Hero />
        <SocialProof />
        <ForStudents />
        <StudyTools />
        <InteractiveDemo />
        <Pricing />
        <About />
        <Contact />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
      <OfflineNotice />
      <ToastContainer />
    </div>
  );
}
