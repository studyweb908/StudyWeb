import React from 'react';
import { 
  ChevronRight, 
  Files, 
  BrainCircuit, 
  Edit3, 
  MessageSquare, 
  Lightbulb, 
  Award, 
  Layout,
  Pin,
  Star,
  FolderOpen,
  ArrowLeft,
  Activity
} from 'lucide-react';
import { Workspace } from './WorkspaceTypes';

interface WorkspaceNavbarProps {
  workspace: Workspace;
  activeTab: 'overview' | 'library' | 'chat' | 'flashcards' | 'quiz' | 'notes';
  onTabChange: (tab: 'overview' | 'library' | 'chat' | 'flashcards' | 'quiz' | 'notes') => void;
  onBack: () => void;
  onTogglePin?: () => void;
  onToggleFavorite?: () => void;
}

const themeColorMap = {
  indigo: {
    activeBg: 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-lg shadow-indigo-500/20',
    activeText: 'text-indigo-650 dark:text-indigo-400',
    hoverBg: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-200/60 dark:hover:border-indigo-900/40',
    badgeBg: 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
    subjectBg: 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-350 border-indigo-100 dark:border-indigo-900/40'
  },
  emerald: {
    activeBg: 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500 shadow-lg shadow-emerald-500/20',
    activeText: 'text-emerald-650 dark:text-emerald-400',
    hoverBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:border-emerald-200/60 dark:hover:border-emerald-900/40',
    badgeBg: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    subjectBg: 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-350 border-emerald-100 dark:border-emerald-900/40'
  },
  amber: {
    activeBg: 'bg-amber-600 dark:bg-amber-500 text-white border-amber-600 dark:border-amber-500 shadow-lg shadow-amber-500/20',
    activeText: 'text-amber-650 dark:text-amber-400',
    hoverBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20 hover:border-amber-200/60 dark:hover:border-amber-900/40',
    badgeBg: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-indigo-100 dark:border-amber-900/30',
    dot: 'bg-amber-500 dark:bg-amber-400',
    subjectBg: 'bg-amber-50/80 dark:bg-indigo-950/60 text-amber-755 dark:text-amber-350 border-amber-100 dark:border-amber-900/40'
  },
  rose: {
    activeBg: 'bg-rose-600 dark:bg-rose-500 text-white border-rose-600 dark:border-rose-500 shadow-lg shadow-rose-500/20',
    activeText: 'text-rose-650 dark:text-rose-400',
    hoverBg: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20 hover:border-rose-200/60 dark:hover:border-rose-900/40',
    badgeBg: 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 border-rose-100 dark:border-rose-900/30',
    dot: 'bg-rose-500 dark:bg-rose-400',
    subjectBg: 'bg-rose-50/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-350 border-rose-100 dark:border-rose-900/40'
  },
  violet: {
    activeBg: 'bg-violet-600 dark:bg-violet-500 text-white border-violet-600 dark:border-violet-500 shadow-lg shadow-violet-500/20',
    activeText: 'text-violet-650 dark:text-violet-400',
    hoverBg: 'hover:bg-violet-50/50 dark:hover:bg-violet-950/20 hover:border-violet-200/60 dark:hover:border-violet-900/40',
    badgeBg: 'bg-violet-50/80 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/30',
    dot: 'bg-violet-500 dark:bg-violet-400',
    subjectBg: 'bg-violet-50/80 dark:bg-violet-950/60 text-violet-700 dark:text-violet-350 border-violet-100 dark:border-violet-900/40'
  },
  cyan: {
    activeBg: 'bg-cyan-600 dark:bg-cyan-500 text-white border-cyan-600 dark:border-cyan-500 shadow-lg shadow-cyan-500/20',
    activeText: 'text-cyan-650 dark:text-cyan-400',
    hoverBg: 'hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 hover:border-cyan-200/60 dark:hover:border-cyan-900/40',
    badgeBg: 'bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/30',
    dot: 'bg-cyan-500 dark:bg-cyan-400',
    subjectBg: 'bg-cyan-50/80 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-350 border-cyan-100 dark:border-cyan-900/40'
  }
};

export default function WorkspaceNavbar({
  workspace,
  activeTab,
  onTabChange,
  onBack,
  onTogglePin,
  onToggleFavorite
}: WorkspaceNavbarProps) {
  const selectedTheme = workspace.colorTheme || 'indigo';
  const theme = themeColorMap[selectedTheme as keyof typeof themeColorMap] || themeColorMap.indigo;

  // Compute total items as activity signals
  const fileCount = workspace.files?.length || 0;
  const flashcardCount = workspace.flashcards?.length || 0;
  const quizCount = workspace.quizzes?.length || 0;
  const noteCount = workspace.notes?.length || 0;
  const totalAssets = fileCount + flashcardCount + quizCount + noteCount;

  const subFeatures = [
    { id: 'overview' as const, label: 'Overview', icon: Layout, desc: 'Progress & Stats' },
    { id: 'library' as const, label: 'Upload Material', icon: Files, desc: 'Add files & links', badge: fileCount },
    { id: 'chat' as const, label: 'AI Tutor', icon: MessageSquare, desc: 'Interactive help' },
    { id: 'notes' as const, label: 'Notes', icon: Edit3, desc: 'Notebook draft', badge: noteCount, comingSoon: true },
    { id: 'flashcards' as const, label: 'Flashcards', icon: BrainCircuit, desc: 'Leitner system', badge: flashcardCount, comingSoon: true },
    { id: 'quiz' as const, label: 'Quizzes', icon: Award, desc: 'Practice exam', badge: quizCount, comingSoon: true },
  ];

  return (
    <div 
      id="workspace-contextual-navbar" 
      className="w-full bg-white/90 dark:bg-slate-900/90 border border-slate-150 dark:border-slate-800/80 rounded-[24px] shadow-sm transition-all duration-300 overflow-hidden mb-6 backdrop-blur-xl"
    >
      {/* Top Header section: Breadcrumb & Meta Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/40 dark:bg-slate-950/15">
        
        {/* Breadcrumbs trail */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-755 dark:text-slate-300 transition-all duration-200 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="flex items-center gap-1 font-bold text-[11.5px]">
              <FolderOpen className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>Back</span>
            </span>
          </button>
          
          <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-750 shrink-0" />
          
          <div className="flex items-center gap-2.5 py-1 px-3 bg-white/80 dark:bg-slate-900/80 rounded-xl shadow-sm border border-slate-150/80 dark:border-slate-800/70 backdrop-blur-md">
            <span className="text-base shrink-0 select-none">
              {workspace.emoji || '🧬'}
            </span>
            <span className="text-slate-900 dark:text-slate-100 font-extrabold max-w-[130px] sm:max-w-xs truncate text-[13.5px] tracking-tight">
              {workspace.name}
            </span>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg select-none uppercase tracking-wider border transition-colors ${theme.subjectBg}`}>
              {workspace.subject}
            </span>
          </div>
        </div>

        {/* Pin, Favorite & Status indicator */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {totalAssets > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/50 dark:bg-slate-950/30 border border-slate-150/50 dark:border-slate-800/40 rounded-xl text-slate-550 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <Activity className={`w-3.5 h-3.5 ${theme.activeText} animate-pulse`} />
              <span>{totalAssets} active items</span>
            </div>
          )}

          {onTogglePin && (
            <button
              onClick={onTogglePin}
              title={workspace.pinned ? "Unpin workspace" : "Pin workspace"}
              className={`p-2 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                workspace.pinned
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/60 text-slate-400'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${workspace.pinned ? 'fill-current text-amber-500' : ''}`} />
              <span className="hidden sm:inline">Pin</span>
            </button>
          )}

          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              title={workspace.favorite ? "Remove from favorites" : "Add to favorites"}
              className={`p-2 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                workspace.favorite
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/60 text-slate-400'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${workspace.favorite ? 'fill-current text-rose-500' : ''}`} />
              <span className="hidden sm:inline">Favorite</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation features grid with fine-tuned design */}
      <div className="p-3 bg-slate-50/15 dark:bg-slate-950/5 border-t border-slate-100 dark:border-slate-800/40">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 w-full">
          {subFeatures.map((feat) => {
            const Icon = feat.icon;
            const isSelected = activeTab === feat.id;

            const isComingSoon = (feat as any).comingSoon;
            return (
              <button
                key={feat.id}
                
                onClick={() => {
                  
                  onTabChange(feat.id);
                }}
                className={`relative flex flex-col items-start p-4 rounded-2xl transition-all duration-300 border text-left w-full h-full select-none ${
                  'cursor-pointer active:scale-97'
                } ${
                  isSelected
                    ? `${theme.activeBg}`
                    : `bg-slate-50/50 dark:bg-slate-900/40 border-slate-100/80 dark:border-slate-800/60 text-slate-650 dark:text-slate-400 ${isComingSoon ? '' : theme.hoverBg}`
                }`}
              >
                <div className="flex items-center gap-2 w-full justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                      isSelected ? 'text-white' : theme.activeText
                    }`} />
                    
                    <span className="text-[13px] font-black tracking-tight leading-none truncate">
                      {feat.label}
                    </span>
                  </div>
                  
                  {/* Item counter badges */}
                  {typeof feat.badge === 'number' && feat.badge > 0 && (
                    <span className={`text-[9.5px] px-1.5 py-0.5 rounded-lg font-black transition-all shrink-0 ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : `${theme.badgeBg}`
                    }`}>
                      {feat.badge}
                    </span>
                  )}
                </div>
                
                {/* Secondary guide text */}
                <span className={`text-[9.5px] mt-1.5 font-bold leading-tight transition-colors duration-300 ${
                  isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {feat.desc}
                </span>

                {/* Refined slide indicator line for active features */}
                {isSelected && (
                  <span className="absolute bottom-1 left-4 right-4 h-0.5 bg-white/65 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
