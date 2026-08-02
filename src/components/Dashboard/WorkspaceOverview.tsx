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
  BookOpen, 
  TrendingUp, 
  ChevronRight, 
  ChevronDown,
  AlertCircle,
  ThumbsUp,

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
  Trash2,
  Check
} from 'lucide-react';
import { Workspace, WorkspaceFile } from './WorkspaceTypes';
import QuickPreviewModal from './QuickPreviewModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';

interface WorkspaceOverviewProps {
  workspace: Workspace;
  workspaces?: Workspace[];
  onSwitchWorkspace?: (workspace: Workspace) => void;
  onDeleteWorkspace?: (id: string) => void;
  setActiveWorkspaceTab: (tab: string) => void;
  onStartStudySession?: () => void;
  onRemoveFile?: (fileId: string) => void;
  onBack: () => void;
}

export default function WorkspaceOverview({ workspace, workspaces = [], onSwitchWorkspace, onDeleteWorkspace, setActiveWorkspaceTab, onStartStudySession, onRemoveFile, onBack }: WorkspaceOverviewProps) {
  // Compute numbers
  const files = workspace.files || [];
  const flashcards = workspace.flashcards || [];
  const quizzes = workspace.quizzes || [];
  const notes = workspace.notes || [];

  const fileCount = files.length;
  const cardCount = flashcards.length;
  const quizCount = quizzes.length;
  const noteCount = notes.length;

  const readingProgressData = React.useMemo(() => {
    return files.slice(0, 5).map(file => ({
      name: file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name,
      progress: Math.floor(Math.random() * 40) + 60, // Mock 60-100% progress
      coverage: Math.floor(Math.random() * 20) + 80 // Mock 80-100% analysis coverage
    }));
  }, [files]);
  

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

        <div className="relative z-20 flex flex-col justify-between h-full gap-5">
          <div className="space-y-3 max-w-2xl relative">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight flex items-center gap-3">
              <span>{workspace.emoji}</span>
              <span>{workspace.name}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Switch Workspace</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceTab('library')}
              className="px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Upload Material</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
                  onDeleteWorkspace?.(workspace.id);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 border border-red-200/80 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ml-auto sm:ml-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= STATS GRID ================= */}
      <div className="grid grid-cols-2 gap-4">
        {/* Stat 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resources</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{fileCount}</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flashcards</p>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">{cardCount}</p>
          </div>
        </div>
      </div>

      {/* ================= READING PROGRESS WIDGET ================= */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[24px]">
          <h3 className="font-black text-slate-850 dark:text-slate-100 tracking-tight text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Reading Progress & Analysis Coverage
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={readingProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCoverage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-slate-200, #e2e8f0)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="progress" name="Reading Progress" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProgress)" />
                <Area type="monotone" dataKey="coverage" name="Analysis Coverage" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCoverage)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ================= RECENT RESOURCES ================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[24px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-850 dark:text-slate-100 tracking-tight text-lg">Recent Study Materials</h3>
          <button 
            onClick={() => setActiveWorkspaceTab('library')}
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {files.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
            <FileText className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Nothing here yet. Start by uploading your first study material.
            </p>
            <button 
              onClick={() => setActiveWorkspaceTab('library')}
              className="mt-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-[12px] font-bold rounded-lg cursor-pointer transition-colors"
            >
              Upload Study Material
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {[...files].sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()).slice(0, 3).map((file, idx) => (
              <div key={file.id || idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50 group cursor-pointer" onClick={() => setPreviewFile(file)}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    file.type === 'pdf' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500' :
                    file.type === 'video' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-500' :
                    file.type === 'audio' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500' :
                    file.type === 'url' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-500' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {file.type === 'pdf' ? <FileText className="w-4 h-4" /> :
                     file.type === 'video' ? <Video className="w-4 h-4" /> :
                     file.type === 'audio' ? <Music className="w-4 h-4" /> :
                     file.type === 'url' ? <Globe className="w-4 h-4" /> :
                     <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{file.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{file.type}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <span className="text-[10px] text-slate-400">{file.uploadDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onRemoveFile && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFileToRemove(file); }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        )}
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


