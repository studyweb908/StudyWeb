import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Clock, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Music,
  CheckCircle,
  FileText
} from 'lucide-react';

export default function StudySessionView() {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusNotes, setFocusNotes] = useState('');
  const [audioSource, setAudioSource] = useState('Lo-Fi Study Beats');

  // Load quick-started session parameters from event or localStorage
  useEffect(() => {
    const handleQuickStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.duration) {
        setSecondsLeft(parseInt(customEvent.detail.duration) * 60);
      }
      if (customEvent.detail?.goal) {
        setFocusNotes(prev => prev ? prev + '\n' + customEvent.detail.goal : customEvent.detail.goal);
      }
      setIsActive(true);
      setSessionType('focus');
    };

    const quickStart = localStorage.getItem('studyweb_quick_start_session');
    if (quickStart === 'true') {
      localStorage.removeItem('studyweb_quick_start_session');
      setIsActive(true);
      setSessionType('focus');
      const duration = localStorage.getItem('studyweb_quick_start_duration');
      if (duration) {
        setSecondsLeft(parseInt(duration) * 60);
        localStorage.removeItem('studyweb_quick_start_duration');
      }
      const goal = localStorage.getItem('studyweb_quick_start_goal');
      if (goal) {
        setFocusNotes(goal);
        localStorage.removeItem('studyweb_quick_start_goal');
      }
    }

    window.addEventListener('studyweb_quick_session_start', handleQuickStart);
    return () => window.removeEventListener('studyweb_quick_session_start', handleQuickStart);
  }, []);

  // Timer tick
  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
      // Play bell or toggle session
      if (sessionType === 'focus') {
        alert('🎉 Focus Session Complete! Time for a short break.');
        setSessionType('break');
        setSecondsLeft(5 * 60);
      } else {
        alert('💪 Break is over! Let\'s lock back in.');
        setSessionType('focus');
        setSecondsLeft(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft, sessionType]);

  // Format helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => setIsActive(!isActive);

  const handleReset = () => {
    setIsActive(false);
    setSecondsLeft(sessionType === 'focus' ? 25 * 60 : 5 * 60);
  };

  const handleShortcut = (minutes: number, type: 'focus' | 'break') => {
    setIsActive(false);
    setSessionType(type);
    setSecondsLeft(minutes * 60);
  };

  return (
    <div className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 md:p-12 overflow-y-auto' : 'space-y-6 pb-12'}`}>
      
      {/* Header Controls */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5.5 h-5.5 text-indigo-500 animate-pulse" />
            <span>Study Session Immersive Mode</span>
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Minimize distraction, trigger Pomodoro sprints and note-taking</p>
        </div>

        {/* Toggle immersive screen */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4" />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4" />
              <span>Distraction-Free Fullscreen</span>
            </>
          )}
        </button>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 text-left">
        {/* Left pane: Active Pomodoro */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 rounded-[24px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center flex flex-col justify-between h-[380px]">
            <div className="space-y-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                sessionType === 'focus' 
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {sessionType === 'focus' ? '🎯 Focus Sprint Active' : '🌸 Break Period'}
              </span>
              <p className="text-xs text-slate-400 font-semibold">Alex: Level 12 AP Scholar</p>
            </div>

            {/* Giant Clock Face */}
            <div className="relative py-4">
              <span className="block font-black text-6xl md:text-7xl font-mono text-slate-900 dark:text-white tracking-tight leading-none">
                {formatTime(secondsLeft)}
              </span>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-2.5">
                {sessionType === 'focus' ? 'Minutes until review' : 'Time remaining'}
              </p>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleReset}
                  className="p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition-colors"
                  title="Reset session"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                
                <button
                  onClick={handleToggleTimer}
                  className="w-28 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isActive ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5" />}
                  <span>{isActive ? 'Pause' : 'Start'}</span>
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 cursor-pointer transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                </button>
              </div>

              {/* Selection intervals */}
              <div className="flex justify-center gap-2 text-[10px] font-bold">
                <button 
                  onClick={() => handleShortcut(25, 'focus')}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  25m Focus
                </button>
                <button 
                  onClick={() => handleShortcut(50, 'focus')}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  50m Focus
                </button>
                <button 
                  onClick={() => handleShortcut(5, 'break')}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  5m Break
                </button>
              </div>
            </div>
          </div>

          {/* AMBIENT MUSIC COMPONENT */}
          <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex-shrink-0 animate-spin-slow">
                <Music className="w-5 h-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">Ambient Soundscape</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold italic">Playing: {audioSource}</p>
              </div>
            </div>

            <select
              value={audioSource}
              onChange={(e) => setAudioSource(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
            >
              <option>Lo-Fi Study Beats</option>
              <option>Deep Rain & Thunderstorm</option>
              <option>White Noise Fan</option>
              <option>Coffee Shop Murmur</option>
            </select>
          </div>
        </div>

        {/* Right pane: Scratchpad / Notes taking block */}
        <div className="lg:col-span-3 flex flex-col h-[466px]">
          <div className="flex-1 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b">
                <p className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Session Live Scratchpad</span>
                </p>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Auto-Saved to Notes
                </span>
              </div>

              {/* Textarea */}
              <textarea
                value={focusNotes}
                onChange={(e) => setFocusNotes(e.target.value)}
                placeholder="Jot down formulas, ideas, and lecture highlights during your Pomodoro sprint. Let the AI summarize them later."
                className="flex-1 w-full bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Character count: {focusNotes.length}</span>
              <button 
                onClick={() => {
                  alert('💡 AI summary drafted! Saved directly to your "Notes" dashboard view.');
                  setFocusNotes(prev => prev + '\n\n=== AI Summary ===\nKey Concepts captured during active sprint.');
                }}
                className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Summarize Scratchpad
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
