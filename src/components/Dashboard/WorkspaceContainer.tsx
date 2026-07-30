import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft,
  Settings,
  ChevronDown,
  Pin, 
  Share2, 
  Star, 
  BookOpen, 
  Sparkles, 
  Layout, 
  MessageSquare, 
  Files, 
  BrainCircuit, 
  Lightbulb, 
  Edit3, 
  Award,
  Lock,
  Globe,
  Image,
  Trash2,
  Upload,
  Link,
  Check,
  X,
  Coins
} from 'lucide-react';
import { Workspace, WorkspaceFile, FlashcardItem, WorkspaceNote } from './WorkspaceTypes';

// Subcomponents
import WorkspaceOverview from './WorkspaceOverview';
import WorkspaceLibrary from './WorkspaceLibrary';
import WorkspaceChat from './WorkspaceChat';
import WorkspaceFlashcards from './WorkspaceFlashcards';
import WorkspaceQuiz from './WorkspaceQuiz';
import WorkspaceNotebook from './WorkspaceNotebook';
import WorkspaceNavbar from './WorkspaceNavbar';

interface WorkspaceContainerProps {
  workspace: Workspace;
  workspaces?: Workspace[];
  onSwitchWorkspace?: (workspace: Workspace) => void;
  onDeleteWorkspace?: (id: string) => void;
  onBack: () => void;
  onUpdateWorkspace: (updated: Workspace) => void;
  initialTab?: 'overview' | 'library' | 'chat' | 'flashcards' | 'quiz' | 'notes';
}

type TabType = 'overview' | 'library' | 'chat' | 'flashcards' | 'quiz' | 'notes';

export default function WorkspaceContainer({ workspace, workspaces = [], onSwitchWorkspace, onDeleteWorkspace, onBack, onUpdateWorkspace, initialTab }: WorkspaceContainerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isChangingCover, setIsChangingCover] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const presetCovers = [
    {
      name: 'Cozy Desk',
      url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Library Shelves',
      url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Coffee & Code',
      url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Retro Coding',
      url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Minimalist Journal',
      url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Neon Setup',
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=800'
    }
  ];

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      if (base64String) {
        updateWorkspaceState({ coverImage: base64String });
        setIsChangingCover(false);
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Unified update helper
  const updateWorkspaceState = (changes: Partial<Workspace>) => {
    onUpdateWorkspace({
      ...workspace,
      ...changes
    });
  };

  // State handlers to bubble up modifications
  const handleAddFile = (newFile: WorkspaceFile) => {
    const updatedFiles = [newFile, ...(workspace.files || [])];
    
    // Also create a concept node for the newly uploaded file!
    const newFileNode = {
      id: `n-${newFile.id}`,
      label: newFile.name.slice(0, 20) + '...',
      type: 'file' as const,
      color: '#3B82F6',
      x: 100 + Math.random() * 100,
      y: 100 + Math.random() * 100,
      details: `${newFile.type.toUpperCase()} file`
    };

    const newLink = {
      source: 'n-root',
      target: newFileNode.id
    };

    updateWorkspaceState({
      files: updatedFiles,
      nodes: [...workspace.nodes, newFileNode],
      links: [...workspace.links, newLink]
    });
  };

  const handleRemoveFile = (fileId: string) => {
    const updatedFiles = (workspace.files || []).filter(f => f.id !== fileId);
    const updatedNodes = workspace.nodes.filter(n => n.id !== `n-${fileId}`);
    const updatedLinks = workspace.links.filter(l => l.target !== `n-${fileId}`);
    updateWorkspaceState({
      files: updatedFiles,
      nodes: updatedNodes,
      links: updatedLinks
    });
  };

  const handleClearAllFiles = () => {
    const fileNodeIds = new Set((workspace.files || []).map(f => `n-${f.id}`));
    const updatedNodes = workspace.nodes.filter(n => !fileNodeIds.has(n.id));
    const updatedLinks = workspace.links.filter(l => !fileNodeIds.has(l.target));
    updateWorkspaceState({
      files: [],
      nodes: updatedNodes,
      links: updatedLinks
    });
  };

  const handleAddFlashcard = (newCard: FlashcardItem) => {
    const updatedCards = [...workspace.flashcards, newCard];
    updateWorkspaceState({ flashcards: updatedCards });
  };

  const handleToggleBookmark = (cardId: string) => {
    const updatedCards = workspace.flashcards.map(c => 
      c.id === cardId ? { ...c, bookmarked: !c.bookmarked } : c
    );
    updateWorkspaceState({ flashcards: updatedCards });
  };

  const handleBoxChange = (cardId: string, newBox: 1 | 2 | 3) => {
    const updatedCards = workspace.flashcards.map(c => 
      c.id === cardId ? { ...c, box: newBox } : c
    );
    updateWorkspaceState({ flashcards: updatedCards });
  };

  const handleAddNote = (newNote: WorkspaceNote) => {
    // If note already exists, replace it, otherwise append
    const existsIdx = workspace.notes.findIndex(n => n.id === newNote.id);
    let updatedNotes = [...workspace.notes];
    
    if (existsIdx !== -1) {
      updatedNotes[existsIdx] = newNote;
    } else {
      updatedNotes = [newNote, ...updatedNotes];
    }
    updateWorkspaceState({ notes: updatedNotes });
  };

  const handleRemoveNote = (noteId: string) => {
    const updatedNotes = workspace.notes.filter(n => n.id !== noteId);
    updateWorkspaceState({ notes: updatedNotes });
  };

  const handleAddPlannerTask = (taskTitle: string, priority: 'High' | 'Medium' | 'Low') => {
    const newTask = {
      id: `task-${Date.now()}`,
      title: taskTitle,
      dueDate: new Date().toISOString().split('T')[0],
      priority,
      completed: false
    };
    updateWorkspaceState({
      plannerTasks: [...workspace.plannerTasks, newTask]
    });
  };

  const handleTogglePlannerTask = (taskId: string) => {
    const updatedTasks = workspace.plannerTasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updateWorkspaceState({ plannerTasks: updatedTasks });
  };

  const handleRemovePlannerTask = (taskId: string) => {
    const updatedTasks = workspace.plannerTasks.filter(t => t.id !== taskId);
    updateWorkspaceState({ plannerTasks: updatedTasks });
  };

  const themeColors = {
    indigo: 'from-indigo-600 to-indigo-950 text-indigo-400 border-indigo-900 bg-indigo-950/20 hover:bg-indigo-950/40',
    emerald: 'from-emerald-600 to-emerald-950 text-emerald-400 border-emerald-900 bg-emerald-950/20 hover:bg-emerald-950/40',
    amber: 'from-amber-600 to-amber-950 text-amber-400 border-amber-900 bg-amber-950/20 hover:bg-amber-950/40',
    rose: 'from-rose-600 to-rose-950 text-rose-400 border-rose-900 bg-rose-950/20 hover:bg-rose-950/40',
    violet: 'from-violet-600 to-violet-950 text-violet-400 border-violet-900 bg-violet-950/20 hover:bg-violet-950/40',
    cyan: 'from-cyan-600 to-cyan-950 text-cyan-400 border-cyan-900 bg-cyan-950/20 hover:bg-cyan-950/40'
  };

  const currentTheme = themeColors[workspace.colorTheme] || themeColors.indigo;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 animate-fade-in">
      {activeTab !== 'overview' && (
        /* COMPACT CLINICAL UPPER HEADER FOR SPECIALIZED TOOLS */
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-white border border-slate-150 rounded-[20px] p-6 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3 text-left">
            <button
              onClick={() => setActiveTab('overview')}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 cursor-pointer border border-slate-150 flex items-center justify-center transition-all active:scale-95 shrink-0"
              title="Back to Workspace Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2.5 min-w-0 relative">
              <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-center text-xl shadow-inner shrink-0">
                {workspace.emoji || '🧬'}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                  {workspace.name}
                </h1>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                  <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-extrabold text-[9px]">
                    {workspace.subject}
                  </span>
                  <span>•</span>
                  <span className="capitalize text-slate-600 font-extrabold">
                    {activeTab === 'chat' 
                      ? 'AI Tutor' 
                      : activeTab === 'quiz' 
                        ? 'Quiz Center' 
                        : activeTab === 'library' 
                          ? 'Upload Material' 
                          : activeTab === 'notes' 
                            ? 'Notes' 
                            : activeTab === 'flashcards' 
                              ? 'Flashcards' 
                              : activeTab}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {/* Quick bookmarking inside focused view */}
            <button 
              onClick={() => updateWorkspaceState({ pinned: !workspace.pinned })}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                workspace.pinned 
                  ? 'bg-amber-50 border-amber-200 text-amber-500' 
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title="Pin Workspace"
            >
              <Pin className="w-3.5 h-3.5 fill-current" />
            </button>
            <button 
              onClick={() => updateWorkspaceState({ favorite: !workspace.favorite })}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                workspace.favorite 
                  ? 'bg-rose-50 border-rose-200 text-rose-500' 
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title="Favorite Workspace"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
            </button>
            <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            <button
              onClick={onBack}
              className="px-3 py-2 border border-slate-200 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
            >
              All Workspaces
            </button>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE TAB COMPONENT CONTAINER */}
      <div className="transition-all bg-white dark:bg-white rounded-[24px]">
        <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
          <WorkspaceOverview 
            workspace={workspace} 
            workspaces={workspaces}
            onSwitchWorkspace={onSwitchWorkspace}
            onDeleteWorkspace={onDeleteWorkspace}
            setActiveWorkspaceTab={setActiveTab}
            onRemoveFile={handleRemoveFile}
            onBack={onBack}
          />
        </div>

        <div className={activeTab === 'library' ? 'block' : 'hidden'}>
          <WorkspaceLibrary 
            workspace={workspace} 
            onAddFile={handleAddFile}
            onRemoveFile={handleRemoveFile}
            onClearAllFiles={handleClearAllFiles}
            onUpdateWorkspace={onUpdateWorkspace}
          />
        </div>

        <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
          <WorkspaceChat 
            workspace={workspace} 
            onUpdateWorkspace={onUpdateWorkspace}
          />
        </div>

        <div className={activeTab === 'flashcards' ? 'block' : 'hidden'}>
          <WorkspaceFlashcards 
            workspace={workspace} 
            onAddFlashcard={handleAddFlashcard}
            onToggleBookmark={handleToggleBookmark}
            onBoxChange={handleBoxChange}
            onUpdateWorkspace={updateWorkspaceState}
          />
        </div>

        <div className={activeTab === 'quiz' ? 'block' : 'hidden'}>
          <WorkspaceQuiz 
            workspace={workspace} 
            onUpdateWorkspace={onUpdateWorkspace}
          />
        </div>

        <div className={activeTab === 'notes' ? 'block' : 'hidden'}>
          <WorkspaceNotebook 
            workspace={workspace} 
            onAddNote={handleAddNote}
            onRemoveNote={handleRemoveNote}
          />
        </div>
      </div>

      {/* Cover Modal removed to prevent cover customizations */}
    </div>
  );
}
