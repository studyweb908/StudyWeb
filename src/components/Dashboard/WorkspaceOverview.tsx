import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Flame, 
  Clock, 
  FileText, 
  Layers, 
  Award, 
  Network, 
  ArrowRight, 
  BookOpen, 
  TrendingUp, 
  ChevronRight, 
  AlertCircle,
  ThumbsUp,
  Brain,
  Zap,
  Calendar,
  Video,
  Music,
  Globe,
  Sigma,
  Quote,
  Terminal,
  RefreshCw,
  X,
  Trash2
} from 'lucide-react';
import { Workspace, WorkspaceFile } from './WorkspaceTypes';
import QuickPreviewModal from './QuickPreviewModal';

interface WorkspaceOverviewProps {
  workspace: Workspace;
  setActiveWorkspaceTab: (tab: string) => void;
  onStartStudySession?: () => void;
  onRemoveFile?: (fileId: string) => void;
}

export default function WorkspaceOverview({ workspace, setActiveWorkspaceTab, onStartStudySession, onRemoveFile }: WorkspaceOverviewProps) {
  // Compute numbers
  const fileCount = workspace.files.length;
  const cardCount = workspace.flashcards.length;
  const quizCount = workspace.quizzes.length;
  const noteCount = workspace.notes.length;
  
  // Calculate conceptual coverage
  const conceptCount = workspace.nodes.filter(n => n.type === 'concept' || n.type === 'formula').length;

  // Active Insights states
  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [fileToRemove, setFileToRemove] = useState<WorkspaceFile | null>(null);

  const themeColors = {
    emerald: {
      text: 'text-emerald-650 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-100 dark:border-emerald-900/30',
      accent: 'bg-emerald-500',
      accentHover: 'hover:bg-emerald-600',
    },
    indigo: {
      text: 'text-indigo-650 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      border: 'border-indigo-100 dark:border-indigo-900/30',
      accent: 'bg-indigo-500',
      accentHover: 'hover:bg-indigo-600',
    },
    rose: {
      text: 'text-rose-650 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-100 dark:border-rose-900/30',
      accent: 'bg-rose-500',
      accentHover: 'hover:bg-rose-600',
    },
    amber: {
      text: 'text-amber-655 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-100 dark:border-amber-900/30',
      accent: 'bg-amber-500',
      accentHover: 'hover:bg-amber-600',
    },
    violet: {
      text: 'text-violet-650 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      border: 'border-violet-100 dark:border-violet-900/30',
      accent: 'bg-violet-500',
      accentHover: 'hover:bg-violet-600',
    },
    cyan: {
      text: 'text-cyan-650 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
      border: 'border-cyan-100 dark:border-cyan-900/30',
      accent: 'bg-cyan-500',
      accentHover: 'hover:bg-cyan-600',
    },
  };

  const currentTheme = themeColors[workspace.colorTheme] || themeColors.indigo;

  return (
    <div className="space-y-6 text-left">
      {/* ================= WORKSPACE HERO HEADER ================= */}
      <div className="relative rounded-[24px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
        {/* Background Visual Highlight overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr opacity-[0.08] dark:opacity-25" style={{
          backgroundImage: workspace.colorTheme === 'emerald' ? 'radial-gradient(circle at 80% 20%, #10B981 0%, transparent 50%)' :
                          workspace.colorTheme === 'indigo' ? 'radial-gradient(circle at 80% 20%, #6366F1 0%, transparent 50%)' :
                          workspace.colorTheme === 'rose' ? 'radial-gradient(circle at 80% 20%, #F43F5E 0%, transparent 50%)' :
                          workspace.colorTheme === 'amber' ? 'radial-gradient(circle at 80% 20%, #F59E0B 0%, transparent 50%)' :
                          workspace.colorTheme === 'violet' ? 'radial-gradient(circle at 80% 20%, #8B5CF6 0%, transparent 50%)' :
                          'radial-gradient(circle at 80% 20%, #06B6D4 0%, transparent 50%)'
        }} />
        <div className="absolute top-0 right-0 p-8 text-7xl select-none opacity-10 dark:opacity-40 hidden sm:block">
          {workspace.emoji}
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full gap-5">
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight flex items-center gap-3">
              <span>{workspace.emoji}</span>
              <span>{workspace.name}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveWorkspaceTab('chat')}
              className="px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm hover:shadow-md group cursor-pointer"
              style={{
                backgroundColor: workspace.colorTheme === 'emerald' ? '#10B981' :
                                workspace.colorTheme === 'indigo' ? '#4F46E5' :
                                workspace.colorTheme === 'rose' ? '#F43F5E' :
                                workspace.colorTheme === 'amber' ? '#D97706' :
                                workspace.colorTheme === 'violet' ? '#7C3AED' :
                                '#0891B2'
              }}
            >
              <span>Ask Active AI Tutor</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setActiveWorkspaceTab('library')}
              className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Upload Material</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= STATS GRID ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resources</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{fileCount}</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flashcards</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{cardCount}</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Concepts Map</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{conceptCount}</p>
          </div>
        </div>

        {/* Stat 5 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Study Time</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{workspace.studyHours}h</p>
          </div>
        </div>
      </div>

      {/* ================= MAIN DUAL LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Double-Col Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* ACTIVE DOCUMENTS INDEXED */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Knowledge Base Materials</h3>
                <p className="text-[11px] text-slate-400 font-medium">{fileCount} study materials uploaded and indexed</p>
              </div>
              <button
                onClick={() => setActiveWorkspaceTab('library')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Upload materials</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {workspace.files.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-850 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">No materials uploaded yet. Upload materials to index this knowledge base.</p>
                </div>
              ) : (
                workspace.files.map((file) => (
                  <div 
                    key={file.id} 
                    onClick={() => setPreviewFile(file)}
                    className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-indigo-50/30 dark:bg-slate-950/20 dark:hover:bg-slate-850/30 border border-slate-100/60 dark:border-slate-800/60 hover:border-indigo-150 dark:hover:border-indigo-900/40 rounded-xl cursor-pointer transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-450 transition-colors">
                          {file.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] bg-slate-200/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded uppercase font-bold tracking-wider">
                            {file.type}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">{file.size}</span>
                          <span className="text-[9px] text-slate-300">•</span>
                          <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold bg-indigo-500/10 dark:bg-indigo-950/30 px-1.5 py-0.2 rounded">
                            Quick Preview
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer transition-all"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => setActiveWorkspaceTab('library')}
                        className="text-xs font-bold text-slate-400 hover:text-slate-800 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-all"
                      >
                        Inspect
                      </button>
                      {onRemoveFile && (
                        <button
                          onClick={() => {
                            setFileToRemove(file);
                          }}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 p-1.5 rounded-lg cursor-pointer transition-all"
                          title="Delete material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Single-Col Column */}
        <div className="space-y-6">



          {/* TIMER SHORTCUT */}
          {onStartStudySession && (
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 space-y-4 text-left">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-base text-slate-850 dark:text-slate-100">Study Clock</h3>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kick off a focused 25-minute Pomodoro study block right now.
              </p>

              <button
                onClick={onStartStudySession}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
                <span>Launch Pomodoro Timer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {previewFile && (
          <QuickPreviewModal 
            file={previewFile} 
            onClose={() => setPreviewFile(null)} 
            onExplore={() => setActiveWorkspaceTab('library')} 
          />
        )}

        {fileToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFileToRemove(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden text-left z-10"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                    Remove Source Material?
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 leading-relaxed">
                    Are you sure you want to remove <span className="font-bold text-slate-600 dark:text-slate-300">"{fileToRemove.name}"</span> from this workspace?
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800">
                    This file's content will no longer be available for AI Tutor questioning or quiz compilation.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-50 dark:border-slate-800 pt-4">
                <button
                  onClick={() => setFileToRemove(null)}
                  className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer transition-all"
                >
                  Keep Material
                </button>
                <button
                  onClick={() => {
                    if (onRemoveFile) {
                      onRemoveFile(fileToRemove.id);
                    }
                    setFileToRemove(null);
                  }}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-rose-200 dark:shadow-none transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Source</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


