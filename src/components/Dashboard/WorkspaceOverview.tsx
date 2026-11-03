import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, 
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
  Check, 
  ExternalLink,
  Edit3,
  Camera,
  Palette,
  Upload
} from 'lucide-react';
import { Workspace, WorkspaceFile } from './WorkspaceTypes';
import QuickPreviewModal from './QuickPreviewModal';
import EditWorkspaceModal from './EditWorkspaceModal';
import {
  cleanNotebookLMTitle,
  getNotebookLMDisplayTitle,
  isRawUrlOrPlaceholderTitle,
  resolveQuickLinkTitleClient
} from '../../utils/notebookTitle';
import { WorkspaceSyncService } from '../../services/WorkspaceSyncService';

interface WorkspaceOverviewProps {
  workspace: Workspace;
  workspaces?: Workspace[];
  onSwitchWorkspace?: (workspace: Workspace) => void;
  onDeleteWorkspace?: (id: string) => void;
  setActiveWorkspaceTab: (tab: string) => void;
  onStartStudySession?: () => void;
  onRemoveFile?: (fileId: string) => void;
  onBack: () => void;
  onUpdateWorkspace?: (workspace: Workspace) => void;
}

export default function WorkspaceOverview({ 
  workspace, 
  workspaces = [], 
  onSwitchWorkspace, 
  onDeleteWorkspace, 
  setActiveWorkspaceTab, 
  onStartStudySession, 
  onRemoveFile, 
  onBack,
  onUpdateWorkspace
}: WorkspaceOverviewProps) {
  // Compute numbers
  const files = workspace.files || [];
  const flashcards = workspace.flashcards || [];
  const quizzes = workspace.quizzes || [];
  const notes = workspace.notes || [];

  const fileCount = files.length;
  const cardCount = flashcards.length;
  const quizCount = quizzes.length;
  const noteCount = notes.length;
  

  // Active Insights states
  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [fileToRemove, setFileToRemove] = useState<WorkspaceFile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInitialTab, setEditInitialTab] = useState<'general' | 'logo' | 'banner'>('general');

  // Ensure any existing URL-named file in workspace.files is automatically resolved to its analyzed NotebookLM title
  useEffect(() => {
    if (!onUpdateWorkspace || files.length === 0) return;
    const toFix = files.filter(f => isRawUrlOrPlaceholderTitle(f.name));
    if (toFix.length === 0) return;

    let cancelled = false;
    (async () => {
      const nextFiles = [...files];
      let changed = false;
      for (const item of toFix) {
        try {
          const resolved = item.url
            ? await resolveQuickLinkTitleClient(item.url, item.type)
            : cleanNotebookLMTitle(item.name, item.url, item.type);
          const idx = nextFiles.findIndex(f => f.id === item.id);
          if (idx !== -1 && resolved && !isRawUrlOrPlaceholderTitle(resolved)) {
            nextFiles[idx] = { ...nextFiles[idx], name: resolved };
            changed = true;
            WorkspaceSyncService.saveWorkspaceFile(workspace.id, nextFiles[idx]).catch(() => {});
          }
        } catch {
          // Ignore
        }
      }
      if (changed && !cancelled) {
        onUpdateWorkspace({ ...workspace, files: nextFiles });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspace.id, files.length]);

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
  const isCustomLogo = workspace.emoji && (workspace.emoji.startsWith('data:') || workspace.emoji.startsWith('http'));

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 text-left">
      {/* ================= WORKSPACE HERO HEADER WITH BANNER BESIDE IT ================= */}
      <div
        data-tour="space-overview-header"
        className="relative rounded-[24px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-xs hover:shadow-md transition-all"
      >
        {/* Subtle Ambient Background Highlight */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 via-white to-transparent dark:from-slate-800/40 dark:via-slate-900 dark:to-transparent pointer-events-none" />

        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Selected Element: Unified White Horizontal Layout Container */}
        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          {/* Left Column: Workspace Identity & Actions */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              {/* Interactive Workspace Logo */}
              <button
                type="button"
                onClick={() => {
                  setEditInitialTab('logo');
                  setShowEditModal(true);
                }}
                className="relative group/logo w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-center overflow-hidden shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer text-left"
                title="Click to customize logo"
              >
                {isCustomLogo ? (
                  <img src={workspace.emoji} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl sm:text-4xl select-none leading-none">{workspace.emoji || '🧬'}</span>
                )}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                  Edit
                </div>
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
                    {workspace.subject || 'General'}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditInitialTab('general');
                      setShowEditModal(true);
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Customize</span>
                  </button>
                </div>

                <h1 
                  onClick={() => {
                    setEditInitialTab('general');
                    setShowEditModal(true);
                  }}
                  className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Click to edit name"
                >
                  {workspace.name}
                </h1>
              </div>
            </div>

            {workspace.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium line-clamp-2 max-w-xl leading-relaxed">
                {workspace.description}
              </p>
            )}

            {/* Cohesive Aligned Workspace Action Bar */}
            <div className="pt-2">
              <div
                data-tour="workspace-action-bar"
                className="inline-flex flex-wrap sm:flex-nowrap items-center gap-2 p-1.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70"
              >
                <button
                  type="button"
                  onClick={onBack}
                  className="h-10 px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>All Workspaces</span>
                </button>

                <button
                  type="button"
                  data-tour="workspace-upload-btn"
                  onClick={() => setActiveWorkspaceTab('library')}
                  className="h-10 px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/70 text-xs font-bold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span>Upload Material</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveWorkspaceTab('chat')}
                  className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-xs shadow-indigo-600/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>AI Tutor</span>
                </button>

                <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteWorkspace) {
                      onDeleteWorkspace(workspace.id);
                    } else {
                      setShowDeleteConfirm(true);
                    }
                  }}
                  className="h-10 px-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
                  title="Delete Workspace"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Banner Beside It */}
          <div 
            onClick={() => {
              setEditInitialTab('banner');
              setShowEditModal(true);
            }}
            className="w-full lg:w-72 h-36 sm:h-40 rounded-2xl overflow-hidden relative shadow-sm border border-slate-200/80 dark:border-slate-750 group/bannercard shrink-0 cursor-pointer bg-slate-100 dark:bg-slate-800 transition-all hover:shadow-md"
            title="Click to change workspace banner"
          >
            <img 
              src={workspace.coverImage || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=800'}
              alt="Workspace Banner"
              className="w-full h-full object-cover group-hover/bannercard:scale-105 transition-transform duration-500"
            />
            {/* Ambient Dark Gradient for bottom label & hover button */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-between p-3" />

            <div className="absolute top-2.5 right-2.5">
              <span className="px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md text-[10px] font-bold border border-white/20 flex items-center gap-1 opacity-80 group-hover/bannercard:opacity-100 transition-opacity">
                <Camera className="w-3 h-3" />
                <span>Change Banner</span>
              </span>
            </div>

            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white pointer-events-none">
              <span className="text-[11px] font-bold drop-shadow-sm flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Cover Banner</span>
              </span>
              <span className="text-[10px] opacity-75">Click to edit</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STATS (FULL CENTERED ROW) ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Resources */}
        <button
          type="button"
          onClick={() => setActiveWorkspaceTab('library')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-3.5 text-left hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resources</p>
            <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{fileCount}</p>
          </div>
        </button>

        {/* Stat 2: Study Notes */}
        <button
          type="button"
          onClick={() => setActiveWorkspaceTab('notes')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-3.5 text-left hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Study Notes</p>
            <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{noteCount}</p>
          </div>
        </button>

        {/* Stat 3: Flashcards */}
        <button
          type="button"
          onClick={() => setActiveWorkspaceTab('flashcards')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-3.5 text-left hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Flashcards</p>
            <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{cardCount}</p>
          </div>
        </button>

        {/* Stat 4: Quizzes */}
        <button
          type="button"
          onClick={() => setActiveWorkspaceTab('quiz')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-3.5 text-left hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quizzes</p>
            <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{quizCount}</p>
          </div>
        </button>
      </div>


      {/* ================= RECENT RESOURCES ================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-[24px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 dark:text-white tracking-tight text-lg">Recent Study Materials</h3>
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
                    (file.type || '').toLowerCase().includes('pdf') ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500' :
                    ((file.type || '').toLowerCase().includes('video') || (file.type || '').toLowerCase().includes('mp4')) ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-500' :
                    ((file.type || '').toLowerCase().includes('audio') || (file.type || '').toLowerCase().includes('mp3')) ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500' :
                    ((file.type || '').toLowerCase().includes('url') || (file.type || '').toLowerCase().includes('link')) ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-500' :
                    ((file.type || '').toLowerCase().includes('image') || (file.type || '').toLowerCase().includes('png') || (file.type || '').toLowerCase().includes('jpg')) ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500' :
                    ((file.type || '').toLowerCase().includes('epub') || (file.type || '').toLowerCase().includes('book')) ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500' :
                    'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {((file.type || '').toLowerCase().includes('pdf')) ? <FileText className="w-4 h-4" /> :
                     ((file.type || '').toLowerCase().includes('video') || (file.type || '').toLowerCase().includes('mp4')) ? <Video className="w-4 h-4" /> :
                     ((file.type || '').toLowerCase().includes('audio') || (file.type || '').toLowerCase().includes('mp3')) ? <Music className="w-4 h-4" /> :
                     ((file.type || '').toLowerCase().includes('url') || (file.type || '').toLowerCase().includes('link')) ? <Globe className="w-4 h-4" /> :
                     ((file.type || '').toLowerCase().includes('image') || (file.type || '').toLowerCase().includes('png') || (file.type || '').toLowerCase().includes('jpg')) ? <ImageIcon className="w-4 h-4" /> :
                     ((file.type || '').toLowerCase().includes('epub') || (file.type || '').toLowerCase().includes('book')) ? <BookOpen className="w-4 h-4" /> :
                     <FileText className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{getNotebookLMDisplayTitle(file)}</h4>
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
                    Are you sure you want to remove <span className="font-bold text-slate-600 dark:text-slate-300">"{getNotebookLMDisplayTitle(fileToRemove)}"</span> from this workspace?
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

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-[24px] p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-4 border border-red-100 dark:border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Do you want to delete this workspace?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                If you delete this, it will not be recovered anymore. All associated materials, notes, flashcards, and quizzes will be permanently removed.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteWorkspace?.(workspace.id);
                    setShowDeleteConfirm(false);
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-red-200 dark:shadow-none transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Workspace Modal */}
      <EditWorkspaceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        workspace={workspace}
        initialTab={editInitialTab}
        onSave={(updated) => {
          if (onUpdateWorkspace) {
            onUpdateWorkspace(updated);
          }
          window.dispatchEvent(
            new CustomEvent('studyweb-toast', {
              detail: {
                message: 'Workspace customized successfully.',
                type: 'success'
              }
            })
          );
        }}
      />
    </div>
  );
}


