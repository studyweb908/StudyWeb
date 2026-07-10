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
import { Sparkles, Terminal, Clock, LogOut, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';

import {
  StudyPlannerView,
  SubjectsView,
  NotesView,
  MindMapsView,
  ResourcesView,
  AnalyticsView,
  AchievementsView,
  LeaderboardView,
  ProfileView,
  ParentDashboardView
} from './components/Dashboard/AuxiliaryViews';

export default function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);

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
    if (savedLogin === 'true') {
      setIsLoggedIn(true);
    }

    const handleLoginSuccess = () => {
      setIsLoggedIn(true);
      localStorage.setItem('studyweb_is_logged_in', 'true');
      setShowLoginToast(true);
    };

    window.addEventListener('studyweb-login-success', handleLoginSuccess);
    return () => {
      window.removeEventListener('studyweb-login-success', handleLoginSuccess);
    };
  }, []);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const executeLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('studyweb_is_logged_in');
    setActiveTab('dashboard');
    setShowLogoutConfirm(false);
    setShowSessionWarning(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!isLoggedIn) return;

    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // 1. Quick Search (Cmd/Ctrl + K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('header-search-input');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
      }

      // 2. Study Planner (Cmd/Ctrl + P)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setActiveTab('study-planner');
      }

      // 3. Ask AI Tutor (Cmd/Ctrl + I)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setActiveTab('ai-tutor');
      }

      // 4. Secure Logout (Cmd/Ctrl + Shift + L)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLogout();
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [isLoggedIn, setActiveTab]);

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

  // Play warning chime when the warning modal is triggered
  useEffect(() => {
    if (showSessionWarning) {
      playWarningSound();
    }
  }, [showSessionWarning]);

  // Sync sessionTimeout change to localStorage
  useEffect(() => {
    localStorage.setItem('studyweb_session_timeout', String(sessionTimeout));
    setInactivitySeconds(0); // reset inactivity counter when timeout config changes
  }, [sessionTimeout]);

  useEffect(() => {
    if (!isLoggedIn) {
      setInactivitySeconds(0);
      setShowSessionWarning(false);
      return;
    }

    // Interval to increment inactivity every second
    const interval = setInterval(() => {
      setInactivitySeconds((prev) => {
        const next = prev + 1;
        if (next >= SESSION_TIMEOUT_LIMIT) {
          executeLogout();
          return 0;
        }
        if (next >= SESSION_WARNING_THRESHOLD && !showLogoutConfirm) {
          setShowSessionWarning(true);
        }
        return next;
      });
    }, 1000);

    // Reset inactivity on user activity, BUT only if the warning modal or logout confirm is NOT active.
    // If either modal is active, the user must explicitly act to extend.
    const resetInactivity = () => {
      if (!showSessionWarning && !showLogoutConfirm) {
        setInactivitySeconds(0);
      }
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    window.addEventListener('click', resetInactivity);
    window.addEventListener('scroll', resetInactivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      window.removeEventListener('click', resetInactivity);
      window.removeEventListener('scroll', resetInactivity);
    };
  }, [isLoggedIn, showSessionWarning, showLogoutConfirm, SESSION_TIMEOUT_LIMIT, SESSION_WARNING_THRESHOLD]);

  // Helper helper to render active workspace tabs
  const renderDashboardContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome setActiveTab={setActiveTab} />;
      case 'ai-tutor':
        return <AITutorWorkspace />;
      case 'pdf-chat':
        return <PDFWorkspaceView />;
      case 'study-session':
        return <StudySessionView />;
      case 'study-planner':
        return <StudyPlannerView />;
      case 'subjects':
        return <SubjectsView />;
      case 'notes':
        return <NotesView />;
      case 'flashcards':
        return <FlashcardsView />;
      case 'quiz-center':
        return <QuizCenterView />;
      case 'mind-maps':
        return <MindMapsView />;
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
      default:
        return <DashboardHome setActiveTab={setActiveTab} />;
    }
  };

  // 1. RENDERING AUTHENTICATED WORKSPACE
  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex relative transition-colors duration-300">
        
        {/* Sidebar Navigation Panel */}
        <DashboardSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onLogout={handleLogout} 
          isFocusMode={isFocusMode}
        />

        {/* Workspace body Area */}
        <div className={`${isFocusMode ? 'lg:pl-0' : 'lg:pl-64'} flex flex-col flex-1 min-h-screen relative transition-all duration-300`}>
          
          {/* Header Bar */}
          <DashboardHeader 
            onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            onLogout={handleLogout}
            isFocusMode={isFocusMode}
            onFocusModeToggle={() => setIsFocusMode(!isFocusMode)}
          />

          {/* Active Workspace Viewport */}
          <main id="workspace-main-content" className={`flex-1 p-4 md:p-8 ${isFocusMode ? 'max-w-none w-full' : 'max-w-7xl mx-auto w-full'} transition-all duration-300`}>
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
        </div>

        {/* Session Expiry Warning Modal */}
        <AnimatePresence>
          {showSessionWarning && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative z-10 overflow-hidden"
              >
                {/* Visual Top Highlight Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

                <div className="flex flex-col items-center text-center">
                  {/* Warning Icon with pulsating ring */}
                  <div className="relative mb-5">
                    <div className="absolute inset-0 bg-amber-500/10 dark:bg-amber-500/20 rounded-full animate-ping scale-150 opacity-75" />
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-full flex items-center justify-center text-amber-500 dark:text-amber-400 relative z-10">
                      <Clock className="w-8 h-8" />
                    </div>
                  </div>

                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                    Inactivity Warning
                  </h3>
                  
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                    Your secure session is about to expire due to inactivity. For your security, you will be automatically logged out soon.
                  </p>

                  {/* Countdown Ticker Card */}
                  <div className="w-full bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-4 mb-6 border border-slate-150 dark:border-slate-800/80 relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Auto Logout In
                      </span>
                      <span className="text-2xl font-black font-mono text-amber-500 dark:text-amber-400">
                        {SESSION_TIMEOUT_LIMIT - inactivitySeconds}s
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-3 overflow-hidden relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                        initial={{ width: "100%" }}
                        animate={{ 
                          width: `${Math.max(0, ((SESSION_TIMEOUT_LIMIT - inactivitySeconds) / (SESSION_TIMEOUT_LIMIT - SESSION_WARNING_THRESHOLD)) * 100)}%` 
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
                      onClick={executeLogout}
                      className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5 order-2 sm:order-1 focus:outline-none"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log Out
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setInactivitySeconds(0);
                        setShowSessionWarning(false);
                      }}
                      className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-md shadow-indigo-600/10 dark:shadow-indigo-500/15 border border-indigo-600/10 dark:border-indigo-400/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 order-1 sm:order-2 focus:outline-none"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Stay Logged In
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Secure Session Toast Notification */}
        <AnimatePresence>
          {showLoginToast && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="fixed bottom-24 right-4 md:right-6 md:bottom-6 z-50 max-w-sm w-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-4 shadow-xl shadow-emerald-500/5 dark:shadow-emerald-500/10 flex items-start gap-3.5 relative overflow-hidden"
            >
              {/* Left accent color bar */}
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-500" />
              
              {/* Secure Icon */}
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-5.5 h-5.5 animate-pulse" />
              </div>

              {/* Toast Text content */}
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                  Secure Session Active
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  You are securely logged in. Auto-logout is active (60s inactivity).
                </p>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowLoginToast(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none shrink-0 p-0.5 transition-colors"
              >
                <span className="text-xs font-black select-none">✕</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logout Confirmation Modal */}
        <AnimatePresence>
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowLogoutConfirm(false);
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
                        setInactivitySeconds(0);
                      }}
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
    </div>
  );
}
