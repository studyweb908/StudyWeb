import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { WorkspaceSyncService } from '../../services/WorkspaceSyncService';
import { recordUserActivity } from '../../utils/userActivity';
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
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
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

  useEffect(() => {
    const handleDataUrlReady = (e: any) => {
      const { id, url } = e.detail;
      const updatedFiles = (workspace.files || []).map(f => f.id === id ? { ...f, url } : f);
      updateWorkspaceState({ files: updatedFiles });
    };
    
    window.addEventListener('studyweb-file-dataurl-ready', handleDataUrlReady);
    return () => window.removeEventListener('studyweb-file-dataurl-ready', handleDataUrlReady);
  }, [workspace, onUpdateWorkspace]);

  useEffect(() => {
    let dragCounter = 0;
    const handleGlobalDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter++;
        if (dragCounter === 1) {
          setIsGlobalDragging(true);
        }
      }
    };
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter--;
        if (dragCounter === 0) {
          setIsGlobalDragging(false);
        }
      }
    };
    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsGlobalDragging(false);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        setActiveTab('library');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('studyweb-global-file-drop', {
            detail: { files: e.dataTransfer?.files }
          }));
        }, 100);
      }
    };

    window.addEventListener('dragenter', handleGlobalDragEnter);
    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('dragleave', handleGlobalDragLeave);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragenter', handleGlobalDragEnter);
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('dragleave', handleGlobalDragLeave);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  // State handlers to bubble up modifications
  const handleAddFile = (newFile: WorkspaceFile) => {
    const existingIds = new Set((workspace.files || []).map(f => f.id));
    if (existingIds.has(newFile.id)) return;
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

    recordUserActivity({
      title: `Uploaded file: ${newFile.name}`,
      detail: `Added to workspace ${workspace.name} • ${newFile.size || 'Indexed document'}`,
      iconType: 'upload'
    });

    // Save uploaded file directly to Supabase workspace_files
    WorkspaceSyncService.saveWorkspaceFile(workspace.id, newFile);
  };

  const handleAddMultipleFiles = (newFiles: WorkspaceFile[], newNote?: WorkspaceNote) => {
    if ((!newFiles || newFiles.length === 0) && !newNote) return;

    const existingIds = new Set((workspace.files || []).map(f => f.id));
    const uniqueNewFiles = (newFiles || []).filter(f => !existingIds.has(f.id));

    const updatedFiles = [...uniqueNewFiles, ...(workspace.files || [])];
    const newNodes = uniqueNewFiles.map(f => ({
      id: `n-${f.id}`,
      label: f.name.slice(0, 20) + '...',
      type: 'file' as const,
      color: '#3B82F6',
      x: 100 + Math.random() * 120,
      y: 100 + Math.random() * 120,
      details: `${f.type.toUpperCase()} file`
    }));
    const newLinks = newNodes.map(n => ({
      source: 'n-root',
      target: n.id
    }));

    let updatedNotes = workspace.notes || [];
    if (newNote) {
      const existsIdx = updatedNotes.findIndex(n => n.id === newNote.id);
      if (existsIdx !== -1) {
        updatedNotes = [...updatedNotes];
        updatedNotes[existsIdx] = newNote;
      } else {
        updatedNotes = [newNote, ...updatedNotes];
      }
    }

    updateWorkspaceState({
      files: updatedFiles,
      notes: updatedNotes,
      nodes: [...workspace.nodes, ...newNodes],
      links: [...workspace.links, ...newLinks]
    });

    if (uniqueNewFiles.length > 0) {
      recordUserActivity({
        title: `Researched & imported ${uniqueNewFiles.length} web source${uniqueNewFiles.length === 1 ? '' : 's'}`,
        detail: `Added to workspace ${workspace.name} (${uniqueNewFiles.map(f => f.name).slice(0, 2).join(', ')})`,
        iconType: 'upload'
      });
    }

    uniqueNewFiles.forEach(file => {
      WorkspaceSyncService.saveWorkspaceFile(workspace.id, file);
    });
    if (newNote) {
      WorkspaceSyncService.saveWorkspaceNote(workspace.id, newNote);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    // 1. Delete from Supabase Database
    try {
      await WorkspaceSyncService.deleteWorkspaceFile(fileId);
    } catch (e) {
      console.error("Failed to delete from Supabase:", e);
    }
    
    // 2. Update local state
    const updatedFiles = (workspace.files || []).filter(f => f.id !== fileId);
    const updatedNodes = workspace.nodes.filter(n => n.id !== `n-${fileId}`);
    const updatedLinks = workspace.links.filter(l => l.target !== `n-${fileId}`);
    updateWorkspaceState({
      files: updatedFiles,
      nodes: updatedNodes,
      links: updatedLinks
    });
    
    // 3. Notify success
    window.dispatchEvent(
      new CustomEvent('studyweb-toast', {
        detail: {
          message: 'File was deleted successfully.',
          type: 'success'
        }
      })
    );
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
    <div className={`max-w-7xl mx-auto w-full ${activeTab === 'chat' ? 'p-0 md:px-6 space-y-0 md:space-y-6 h-full flex-1 flex flex-col min-h-0' : 'space-y-6 px-4 md:px-6'} animate-fade-in relative`}>
      <AnimatePresence>
        {isGlobalDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm border-4 border-indigo-500 m-4 rounded-3xl"
          >
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center pointer-events-none">
              <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Drop files here</h2>
              <p className="text-slate-500 dark:text-slate-400">Release to upload your documents, images, or media to this workspace.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* RENDER ACTIVE TAB COMPONENT CONTAINER */}
      <div className={`transition-all ${activeTab === 'chat' ? 'h-full flex-1 flex flex-col min-h-0 bg-transparent rounded-none' : 'bg-white dark:bg-slate-900 rounded-[24px]'}`}>
        <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
          <WorkspaceOverview 
            workspace={workspace} 
            workspaces={workspaces}
            onSwitchWorkspace={onSwitchWorkspace}
            onDeleteWorkspace={onDeleteWorkspace}
            setActiveWorkspaceTab={setActiveTab}
            onRemoveFile={handleRemoveFile}
            onBack={onBack}
            onUpdateWorkspace={onUpdateWorkspace}
          />
        </div>

        <div className={activeTab === 'library' ? 'block' : 'hidden'}>
          <WorkspaceLibrary 
            workspace={workspace} 
            onAddFile={handleAddFile}
            onAddMultipleFiles={handleAddMultipleFiles}
            onRemoveFile={handleRemoveFile}
            onClearAllFiles={handleClearAllFiles}
            onUpdateWorkspace={onUpdateWorkspace}
          />
        </div>

        <div className={activeTab === 'chat' ? 'h-full flex-1 flex flex-col min-h-0 w-full' : 'hidden'}>
          <WorkspaceChat 
            workspace={workspace} 
            workspaces={workspaces}
            onSelectWorkspace={onSwitchWorkspace}
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
