/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'motion/react';
import { useTaskContext } from './context/TaskContext';
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
import SEOManager from './components/SEOManager';
import LegalModals from './components/LegalModals';
import { supabase } from './lib/supabase';

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
import OnboardingModal from './components/OnboardingModal';
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
import { toValidUuid } from './utils/uuid.ts';
import { WorkspaceSyncService } from './services/WorkspaceSyncService.ts';
import WorkspaceSelector from './components/Dashboard/WorkspaceSelector';
import WorkspaceContainer from './components/Dashboard/WorkspaceContainer';
import WorkspaceChat from './components/Dashboard/WorkspaceChat';
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

  // Authentication & Legal State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#privacy') {
        setLegalModalType('privacy');
      } else if (hash === '#terms') {
        setLegalModalType('terms');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const {
    activeWorkspace,
    setActiveWorkspace,
    activeTask: activeTab,
    setActiveTask: setActiveTab,
    intendedTask: intendedTab,
    requireWorkspaceForTask
  } = useTaskContext();

  // Workspaces State
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const local = localStorage.getItem('studyweb_workspaces_v2');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          let hasChanges = false;
          const normalized = parsed.map((ws: Workspace) => {
            const validId = toValidUuid(ws.id);
            if (validId !== ws.id) {
              hasChanges = true;
              return { ...ws, id: validId };
            }
            return ws;
          });
          if (hasChanges) {
            localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(normalized));
          }
          return normalized;
        }
      } catch (err) {}
    }
    return INITIAL_WORKSPACES;
  });
  // Workspace context handles persistance, but we still need to manage workspaces array locally.
  const handleUpdateWorkspace = (updated: Workspace) => {
    const next = workspaces.map(w => w.id === updated.id ? updated : w);
    setWorkspaces(next);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(next));
    if (activeWorkspace && activeWorkspace.id === updated.id) {
      setActiveWorkspace(updated);
    }
    // Synchronize updates directly to Supabase
    WorkspaceSyncService.saveWorkspace(updated);
  };

  const handleSelectWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
  };

  const handleCreateWorkspace = (ws: Workspace) => {
    const next = [ws, ...workspaces];
    setWorkspaces(next);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(next));
    setActiveWorkspace(ws);
    // Persist new workspace directly in Supabase
    WorkspaceSyncService.saveWorkspace(ws);
  };

  const handleTogglePin = (id: string) => {
    const next = workspaces.map(w => w.id === id ? { ...w, pinned: !w.pinned } : w);
    setWorkspaces(next);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(next));
    const target = next.find(w => w.id === id);
    if (target) {
      WorkspaceSyncService.saveWorkspace(target);
    }
    if (activeWorkspace && activeWorkspace.id === id) {
      setActiveWorkspace({ ...activeWorkspace, pinned: !activeWorkspace.pinned });
    }
  };

  const handleToggleFavorite = (id: string) => {
    const next = workspaces.map(w => w.id === id ? { ...w, favorite: !w.favorite } : w);
    setWorkspaces(next);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(next));
    const target = next.find(w => w.id === id);
    if (target) {
      WorkspaceSyncService.saveWorkspace(target);
    }
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
    // Delete workspace and its files from Supabase
    WorkspaceSyncService.deleteWorkspace(id);
  };

  const handleReorderWorkspaces = (newWorkspaces: Workspace[]) => {
    setWorkspaces(newWorkspaces);
    localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(newWorkspaces));
  };

  // Synchronize with Supabase on mount and on authentication changes
  useEffect(() => {
    const syncFromSupabase = async () => {
      try {
        const remoteWorkspaces = await WorkspaceSyncService.fetchWorkspaces();
        if (remoteWorkspaces && remoteWorkspaces.length > 0) {
          setWorkspaces((prev) => {
            const remoteMap = new Map(remoteWorkspaces.map(w => [w.id, w]));
            const missingRemote: Workspace[] = [];

            prev.forEach(localWs => {
              if (!remoteMap.has(localWs.id)) {
                missingRemote.push(localWs);
              }
            });

            // Push any local workspaces that are not in Supabase yet
            if (missingRemote.length > 0) {
              WorkspaceSyncService.syncLocalWorkspacesToSupabase(missingRemote);
            }

            const merged = remoteWorkspaces.map(remoteWs => {
              const localMatch = prev.find(l => l.id === remoteWs.id);
              if (localMatch) {
                return {
                  ...localMatch,
                  ...remoteWs,
                  files: [
                    ...remoteWs.files,
                    ...(localMatch.files || []).filter(lf => !remoteWs.files.some(rf => rf.id === lf.id))
                  ]
                };
              }
              return remoteWs;
            });

            const combined = [...merged, ...missingRemote];
            localStorage.setItem('studyweb_workspaces_v2', JSON.stringify(combined));
            return combined;
          });
        } else {
          // If Supabase has no workspaces yet, sync existing local workspaces to Supabase!
          const local = localStorage.getItem('studyweb_workspaces_v2');
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) {
                WorkspaceSyncService.syncLocalWorkspacesToSupabase(parsed);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.debug('Initial Supabase workspace sync notice:', err);
      }
    };

    syncFromSupabase();

    const handleAuthChange = () => {
      syncFromSupabase();
    };

    window.addEventListener('studyweb-login-success', handleAuthChange);
    window.addEventListener('studyweb-signup-success', handleAuthChange);

    return () => {
      window.removeEventListener('studyweb-login-success', handleAuthChange);
      window.removeEventListener('studyweb-signup-success', handleAuthChange);
    };
  }, []);
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
      if (onboardingComplete !== 'true') {
        setShowOnboarding(true);
      }
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
      setActiveTab('dashboard');
      setShowOnboarding(true);
    };

    window.addEventListener('studyweb-login-success', handleLoginSuccess);
    window.addEventListener('studyweb-signup-success', handleSignupSuccess);
    return () => {
      window.removeEventListener('studyweb-login-success', handleLoginSuccess);
      window.removeEventListener('studyweb-signup-success', handleSignupSuccess);
    };
  }, []);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const executeLogout = async () => {
    setIsLoggedIn(false);
    
    // Clear Supabase Session
    try {
      await supabase.auth.signOut();
    } catch (e) {}

    // Clear all local state to ensure no cross-user data leakage
    localStorage.removeItem('studyweb_is_logged_in');
    localStorage.removeItem('studyweb_profile_name');
    localStorage.removeItem('studyweb_profile_avatar');
    localStorage.removeItem('studyweb_profile_class_board');
    localStorage.removeItem('studyweb_profile_school');
    localStorage.removeItem('studyweb_onboarding_draft');
    localStorage.removeItem('studyweb_onboarding_data');
    localStorage.removeItem('studyweb_onboarding_complete');

    setActiveTab('dashboard');
    setActiveWorkspace(null);
    sessionStorage.removeItem('studyweb_active_task');
    sessionStorage.removeItem('studyweb_active_workspace_id');
    setShowLogoutConfirm(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };




  // Handle file deletion from anywhere
  useEffect(() => {
    const handleFileDeleted = (e: any) => {
      const { id, workspaceId } = e.detail;
      setWorkspaces(prev => prev.map(ws => {
        if (ws.id === workspaceId) {
          return {
            ...ws,
            files: (ws.files || []).filter(f => f.id !== id),
            nodes: ws.nodes.filter(n => n.id !== `n-${id}`),
            links: ws.links.filter(l => l.target !== `n-${id}`)
          };
        }
        return ws;
      }));
    };
    window.addEventListener('studyweb-file-deleted', handleFileDeleted);
    return () => window.removeEventListener('studyweb-file-deleted', handleFileDeleted);
  }, []);



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
          onClick={() => {
            requireWorkspaceForTask(activeTab);
          }}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          Select or Create a Workspace
        </button>
      </div>
    );

    const isWorkspaceTab = ['workspaces', 'ai-tutor', 'notes', 'flashcards', 'quiz-center'].includes(activeTab);

    return (
      <div className="w-full h-full relative">
        {/* Workspace Views */}
        <div className={isWorkspaceTab ? 'block' : 'hidden'}>
          {activeWorkspace ? (
            <WorkspaceContainer 
              workspace={activeWorkspace} 
              workspaces={workspaces}
              onSwitchWorkspace={setActiveWorkspace}
              onDeleteWorkspace={handleDeleteWorkspace}
              onBack={() => setActiveWorkspace(null)} 
              onUpdateWorkspace={handleUpdateWorkspace}
              initialTab={
                activeTab === 'workspaces' ? 'overview' : 
                activeTab === 'ai-tutor' ? 'chat' : 
                activeTab === 'notes' ? 'notes' : 
                activeTab === 'flashcards' ? 'flashcards' : 
                activeTab === 'quiz-center' ? 'quiz' : 'overview'
              }
            />
          ) : (
            <div className="w-full">
              {activeTab === 'workspaces' ? (
                <WorkspaceSelector 
                  workspaces={workspaces} 
                  onSelectWorkspace={handleSelectWorkspace} 
                  onCreateWorkspace={handleCreateWorkspace}
                  onTogglePin={handleTogglePin}
                  onToggleFavorite={handleToggleFavorite}
                  onDeleteWorkspace={handleDeleteWorkspace}
                  onReorderWorkspaces={handleReorderWorkspaces}
                />
              ) : activeTab === 'ai-tutor' ? (
                workspaces.length > 0 ? (
                  <WorkspaceChat 
                    workspace={workspaces[0]}
                    workspaces={workspaces}
                    onSelectWorkspace={handleSelectWorkspace}
                    onUpdateWorkspace={handleUpdateWorkspace}
                  />
                ) : (
                  renderFallback("Select a Workspace", "Your AI Tutor can answer questions using outside knowledge while strictly staying on topic, as well as use your active documents. Please select or create a study workspace to begin chatting.")
                )
              ) : activeTab === 'notes' ? (
                renderFallback("Notebook is Workspace-Grounded", "Write rich-text notes with real-time AI autocompletes linked directly to your materials. Select a study workspace first.")
              ) : activeTab === 'flashcards' ? (
                renderFallback("Spaced Repetition is Workspace-Grounded", "Automate card generators from active chapters. Select a study workspace first to study and track Leitner boxes.")
              ) : activeTab === 'quiz-center' ? (
                renderFallback("Exam Practice is Workspace-Grounded", "Simulate practice tests with negative markings that identify your core weak sections. Create or select a workspace first.")
              ) : null}
            </div>
          )}
        </div>

        {/* Other Views */}
        <div className={activeTab === 'dashboard' || !activeTab ? 'block' : 'hidden'}>
          <DashboardHome setActiveTab={setActiveTab} setActiveWorkspace={setActiveWorkspace} workspaces={workspaces} activeWorkspace={activeWorkspace} />
        </div>
        <div className={activeTab === 'study-session' ? 'block' : 'hidden'}>
          <StudySessionView />
        </div>
        <div className={activeTab === 'study-planner' ? 'block' : 'hidden'}>
          <StudyPlannerView />
        </div>
        <div className={activeTab === 'subjects' ? 'block' : 'hidden'}>
          <SubjectsView />
        </div>
        <div className={activeTab === 'resources' ? 'block' : 'hidden'}>
          <ResourcesView />
        </div>
        <div className={activeTab === 'analytics' ? 'block' : 'hidden'}>
          <AnalyticsView />
        </div>
        <div className={activeTab === 'achievements' ? 'block' : 'hidden'}>
          <AchievementsView />
        </div>
        <div className={activeTab === 'leaderboard' ? 'block' : 'hidden'}>
          <LeaderboardView />
        </div>
        <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
          <ProfileView />
        </div>
        <div className={activeTab === 'parent-dashboard' ? 'block' : 'hidden'}>
          <ParentDashboardView />
        </div>
        <div className={activeTab === 'pdf-chat' ? 'block' : 'hidden'}>
          <PDFWorkspaceView 
            workspace={activeWorkspace || undefined}
            onUpdateWorkspace={handleUpdateWorkspace}
          />
        </div>
      </div>
    );
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
          setActiveWorkspace={handleSelectWorkspace}
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
                key={`workspace-main-${activeTab}-${activeWorkspace?.id || 'none'}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
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
                setActiveTab('workspaces');
              }}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                activeTab === 'workspaces' && activeWorkspace === null
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
              disabled
              className="w-full h-full flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-50 grayscale text-slate-400"
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
                      disabled
                      className="opacity-50 grayscale p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-left cursor-not-allowed transition-all flex flex-col gap-2 group"
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
                      disabled
                      className="opacity-50 grayscale p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-left cursor-not-allowed transition-all flex flex-col gap-2 group"
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
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLogoutConfirm(false)}
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
                    Confirm Logout
                  </h3>
                  
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed">
                    Are you sure you want to log out of your session? You will need to sign back in to access your dashboard and active workspaces.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 order-2 sm:order-1 focus:outline-none"
                    >
                      Cancel
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
        
        <OnboardingModal
          isOpen={showOnboarding}
          onComplete={() => {
            localStorage.setItem('studyweb_onboarding_complete', 'true');
            setShowOnboarding(false);
            setShowLoginToast(true);
          }}
        />

        <OfflineNotice />
        <ToastContainer />
        <LegalModals 
          isOpen={legalModalType !== null} 
          type={legalModalType} 
          onClose={() => {
            setLegalModalType(null);
            if (window.location.hash === '#privacy' || window.location.hash === '#terms') {
              window.history.pushState(null, '', '#');
            }
          }} 
        />
        <SEOManager activeTask={activeTab} isLoggedIn={isLoggedIn} />
      </div>
    );
  }

  // 2. RENDERING PUBLIC LANDING PAGE
  return (
    <div className="min-h-screen font-sans selection:bg-brand-primary/20 selection:text-brand-primary relative">
      <SEOManager isLoggedIn={isLoggedIn} />

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
      <LegalModals 
        isOpen={legalModalType !== null} 
        type={legalModalType} 
        onClose={() => {
          setLegalModalType(null);
          if (window.location.hash === '#privacy' || window.location.hash === '#terms') {
            window.history.pushState(null, '', '#');
          }
        }} 
      />
    </div>
  );
}
