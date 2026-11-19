import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Folder, 
  Pin, 
  Star, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  BookOpen, 
  Compass, 
  FileText, 
  Sparkles,
  Lock,
  Globe,
  X,
  Smile,
  Palette,
  Check,
  Trash2,
  Coins,
  GripVertical,
  Video,
  Music,
  Edit3,
  Camera
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { generateUuid } from '../../utils/uuid.ts';
import { CSS } from '@dnd-kit/utilities';
import { Workspace } from './WorkspaceTypes';
import EditWorkspaceModal from './EditWorkspaceModal';
import { WorkspaceCardSkeleton } from './DashboardSkeletons';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  isLoading?: boolean;
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: (workspace: Workspace) => void;
  onUpdateWorkspace?: (workspace: Workspace) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteWorkspace?: (id: string) => void;
  onReorderWorkspaces?: (newWorkspaces: Workspace[]) => void;
}

interface SortableWorkspaceCardProps {
  key?: string;
  ws: Workspace;
  onSelectWorkspace: (workspace: Workspace) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteWorkspace?: (id: string) => void;
  onEditWorkspace?: (workspace: Workspace, initialTab?: 'general' | 'logo' | 'banner') => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  getThemeTextClass: (theme: string) => string;
}

function SortableWorkspaceCard({
  ws,
  onSelectWorkspace,
  onToggleFavorite,
  onDeleteWorkspace,
  onEditWorkspace,
  confirmDeleteId,
  setConfirmDeleteId,
  getThemeTextClass
}: SortableWorkspaceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: ws.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const textClass = getThemeTextClass(ws.colorTheme);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-full"
    >
      <motion.div
        whileHover={{ y: -4 }}
        className={`bg-white dark:bg-slate-900 border-2 ${
          isDragging ? 'border-indigo-500 shadow-lg scale-[1.02]' : 'border-slate-200 dark:border-slate-800'
        } rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full`}
      >
        <div 
          onClick={() => onSelectWorkspace(ws)}
          className="cursor-pointer flex-1 flex flex-col"
        >
          {/* Visual Cover Header with Background Banner Image */}
          <div className="h-28 bg-slate-900 border-b border-slate-150 dark:border-slate-800 relative overflow-hidden group/cardheader">
            <img
              src={ws.coverImage || 'https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop'}
              alt="Workspace Banner"
              className="w-full h-full object-cover opacity-65 dark:opacity-50 transition-transform duration-500 group-hover/cardheader:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-black/30 pointer-events-none" />
            
            {/* Logo Display - MAX VISIBILITY & EDIT TRIGGER */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onEditWorkspace?.(ws, 'logo');
              }}
              className="absolute bottom-2.5 left-4 w-12 h-12 bg-white dark:bg-slate-900 rounded-[14px] border-2 border-white/80 dark:border-slate-700 flex items-center justify-center text-2xl shadow-md transition-transform hover:scale-110 z-10 overflow-hidden cursor-pointer"
              title="Click to customize logo"
            >
              {ws.emoji && (ws.emoji.startsWith('data:') || ws.emoji.startsWith('http')) ? (
                <img src={ws.emoji} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="leading-none">{ws.emoji || '🧬'}</span>
              )}
            </div>

            {/* Quick Edit Workspace Button beside the banner */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditWorkspace?.(ws, 'general');
              }}
              className="absolute bottom-2.5 right-3 px-2 py-1 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-lg shadow-sm border border-white/40 dark:border-slate-600/50 transition-all cursor-pointer z-10 flex items-center gap-1 text-[11px] font-bold backdrop-blur-sm"
              title="Edit workspace name, logo, or banner"
            >
              <Edit3 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Edit</span>
            </button>

            {/* Pin status badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
              {ws.pinned && (
                <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 backdrop-blur-md">
                  <Pin className="w-3.5 h-3.5 fill-current" />
                </span>
              )}
            </div>

            {/* Drag handle icon - top right */}
            <div 
              {...attributes} 
              {...listeners}
              onClick={(e) => e.stopPropagation()} 
              className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-lg border border-white/20 shadow-sm transition-all cursor-grab active:cursor-grabbing z-20 touch-none backdrop-blur-md"
              title="Drag to reorder workspace"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-3 sm:space-y-3.5 text-left flex-1 flex flex-col justify-between min-w-0">
            <div className="space-y-3 sm:space-y-3.5 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                {/* Subject Section - MAX VISIBILITY */}
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900/60 shrink-0 ${textClass}`}>
                  {ws.subject}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-450 dark:text-slate-500 min-w-0 truncate" title="Last Accessed">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">Last Accessed: {ws.lastOpened}</span>
                </span>
              </div>

              {/* Name of the Workspace - MAX VISIBILITY */}
              <h3 className="font-black text-[17px] text-slate-900 dark:text-white leading-snug line-clamp-1">
                {ws.name}
              </h3>
              
              {/* Description - MAX VISIBILITY */}
              <p className="text-xs text-slate-600 dark:text-slate-350 font-bold line-clamp-2 leading-relaxed">
                {ws.description}
              </p>
            </div>
          </div>
        </div>

        {/* Card Footer actions */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between gap-2">
          <div className="flex gap-4 text-[11px] font-extrabold text-slate-500">
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>{ws.files.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{ws.flashcards.length} cards</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onDeleteWorkspace && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteWorkspace(ws.id);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 cursor-pointer transition-colors"
                title="Delete workspace"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Favorite Section Button - MAX VISIBILITY */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(ws.id);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                ws.favorite
                  ? 'text-rose-500 hover:text-rose-600'
                  : 'text-slate-400 hover:text-rose-500'
              }`}
              title={ws.favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={`w-4.5 h-4.5 ${ws.favorite ? 'text-rose-500 fill-rose-500' : ''}`} />
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSelectWorkspace(ws);
              }}
              className="p-1.5 rounded-lg text-slate-450 hover:text-indigo-650 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function WorkspaceSelector({ 
  workspaces, 
  isLoading = false,
  onSelectWorkspace, 
  onCreateWorkspace,
  onUpdateWorkspace,
  onTogglePin,
  onToggleFavorite,
  onDeleteWorkspace,
  onReorderWorkspaces
}: WorkspaceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [sortBy, setSortBy] = useState<'manual' | 'lastOpened' | 'name' | 'files'>('manual');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editTab, setEditTab] = useState<'general' | 'logo' | 'banner'>('general');

  React.useEffect(() => {
    const handleOpenModal = () => setShowCreateModal(true);
    window.addEventListener('open_create_workspace_modal', handleOpenModal);
    return () => window.removeEventListener('open_create_workspace_modal', handleOpenModal);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter & Sort workspaces logic
  const filteredWorkspaces = workspaces
    .filter((ws) => {
      const matchSearch = ws.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ws.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ws.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchSubject = selectedSubject === 'All' || ws.subject === selectedSubject;
      return matchSearch && matchSubject;
    })
    .sort((a, b) => {
      // Pin priorities first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'files') {
        return (b.files || []).length - (a.files || []).length;
      }
      if (sortBy === 'lastOpened') {
        return (b.lastOpened || '').localeCompare(a.lastOpened || '');
      }
      return 0; // Default to natural/pre-sorted (Last opened/Pinned)
    });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeVisualIndex = filteredWorkspaces.findIndex((w) => w.id === activeId);
    const overVisualIndex = filteredWorkspaces.findIndex((w) => w.id === overId);

    if (activeVisualIndex !== -1 && overVisualIndex !== -1) {
      // Reorder the visible list as the user expects
      const newFilteredOrder = arrayMove(filteredWorkspaces, activeVisualIndex, overVisualIndex);
      
      // Add back the hidden elements to reconstruct the complete workspaces array
      const visibleIds = new Set(newFilteredOrder.map(w => w.id));
      const hiddenWorkspaces = workspaces.filter(w => !visibleIds.has(w.id));
      
      const next = [...newFilteredOrder, ...hiddenWorkspaces];
      
      if (onReorderWorkspaces) {
        onReorderWorkspaces(next);
      }
      setSortBy('manual');
    }
  };

  // New Workspace Form states
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('Biology');
  const [newDescription, setNewDescription] = useState('');
  const [newTheme, setNewTheme] = useState<'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan'>('indigo');
  const [newEmoji, setNewEmoji] = useState('🧬');
  const [newTemplate] = useState<'exam' | 'semester' | 'course' | 'research' | 'notes' | 'custom'>('course');
  const [newVisibility, setNewVisibility] = useState<'private' | 'shared'>('private');

  const subjects = ['All', 'Biology', 'Chemistry', 'Physics', 'History', 'Math', 'Computer Science'];

  const emojis = ['🧬', '🧪', '🔭', '🏛️', '📐', '💻', '🎨', '📚', '🧠', '✍️'];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Default covers based on theme
    const themeCovers = {
      indigo: 'https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop',
      emerald: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?q=80&w=600&auto=format&fit=crop',
      amber: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=600&auto=format&fit=crop',
      rose: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=600&auto=format&fit=crop',
      violet: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=600&auto=format&fit=crop',
      cyan: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop'
    };

    const newWorkspace: Workspace = {
      id: generateUuid(),
      name: newName,
      subject: newSubject,
      description: newDescription || 'Smart personalized study space for learning excellence.',
      colorTheme: newTheme,
      coverImage: themeCovers[newTheme],
      emoji: newEmoji,
      visibility: newVisibility,
      template: newTemplate,
      pinned: false,
      favorite: false,
      files: [],
      flashcards: [],
      quizzes: [],
      notes: [],
      plannerTasks: [],
      nodes: [
        { id: 'n-root', label: newName, type: 'topic', color: '#6366F1', x: 250, y: 150 }
      ],
      links: [],
      streak: 1,
      studyHours: 0,
      lastOpened: 'Just Now'
    };

    onCreateWorkspace(newWorkspace);
    setShowCreateModal(false);
    
    // Reset form
    setNewName('');
    setNewDescription('');
    setNewEmoji('🧬');
  };



  const getThemeTextClass = (theme: string) => {
    switch (theme) {
      case 'emerald': return 'text-emerald-500';
      case 'amber': return 'text-amber-500';
      case 'rose': return 'text-rose-500';
      case 'violet': return 'text-violet-500';
      case 'cyan': return 'text-cyan-500';
      default: return 'text-indigo-500';
    }
  };

  const getThemeBorderClass = (theme: string) => {
    switch (theme) {
      case 'emerald': return 'border-emerald-500/20';
      case 'amber': return 'border-amber-500/20';
      case 'rose': return 'border-rose-500/20';
      case 'violet': return 'border-violet-500/20';
      case 'cyan': return 'border-cyan-500/20';
      default: return 'border-indigo-500/20';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-0 sm:px-1 md:px-2 text-left min-w-0">
      {/* WORKSPACE SECTION HEADER & CREATE ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Study Workspaces
            </h2>
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0">
              {workspaces.length} {workspaces.length === 1 ? 'space' : 'spaces'}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Organize course notes, flashcards, practice quizzes, and AI tutoring by subject.
          </p>
        </div>

        {/* PRIMARY CREATE WORKSPACE BUTTON */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create New Workspace</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS (WHEN WORKSPACES EXIST) */}
      {workspaces.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="relative flex-1 w-full sm:max-w-md min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search workspaces or subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full sm:w-auto min-w-0 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>{sub === 'All' ? 'All Subjects' : sub}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto min-w-0 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="manual">Custom Order</option>
              <option value="lastOpened">Recently Opened</option>
              <option value="name">Alphabetical</option>
              <option value="files">Most Files</option>
            </select>
          </div>
        </div>
      )}

      {/* WORKSPACE CARDS GRID OR EMPTY STATES */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <WorkspaceCardSkeleton key={i} />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto text-center py-16 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] space-y-6 shadow-sm"
        >
          <div className="w-16 h-16 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Folder className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Create Your First Study Workspace</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              Workspaces are safe-havens for your biological, chemical, or historical papers. Generate flashcards, take lecture notes, and get AI assistance tailored to each course.
            </p>
          </div>
          <div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create New Workspace</span>
            </button>
          </div>
        </motion.div>
      ) : filteredWorkspaces.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto text-center py-12 px-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[24px] space-y-4 shadow-sm"
        >
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-250">No workspaces matched your query</h4>
            <p className="text-xs text-slate-400 font-semibold">
              Try adjusting your search query, selecting another category, or resetting the filters.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSubject('All');
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-750 text-xs font-extrabold rounded-lg transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-extrabold rounded-lg transition-colors cursor-pointer"
            >
              + Create Workspace
            </button>
          </div>
        </motion.div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredWorkspaces.map(ws => ws.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredWorkspaces.map((ws) => (
                <SortableWorkspaceCard
                  key={ws.id}
                  ws={ws}
                  onSelectWorkspace={onSelectWorkspace}
                  onToggleFavorite={onToggleFavorite}
                  onDeleteWorkspace={onDeleteWorkspace}
                  onEditWorkspace={(workspace, tab) => {
                    setEditingWorkspace(workspace);
                    setEditTab(tab || 'general');
                  }}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  getThemeTextClass={getThemeTextClass}
                />
              ))}

              {/* INLINE CREATE NEW WORKSPACE CARD */}
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="group relative flex flex-col items-center justify-center min-h-[220px] rounded-[24px] border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer p-6 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300 dark:group-hover:border-indigo-700 transition-colors mb-3">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Create New Workspace
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  Add a subject, upload course materials, or build flashcards
                </p>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* CREATE WORKSPACE POPUP MODAL DIALOG */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 max-w-lg w-full relative space-y-4"
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <span>Initialize AI Study Workspace</span>
              </h3>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs text-left">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. AP Biology genetics study"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject Classification</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold text-slate-750 dark:text-slate-350 focus:outline-none"
                  >
                    {subjects.filter(s => s !== 'All').map(sub => (
                      <option key={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Emoji selection line */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Emoji Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {emojis.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setNewEmoji(e)}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg cursor-pointer ${
                          newEmoji === e ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme palette selection line */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Color Palette</label>
                  <div className="flex gap-3">
                    {(['indigo', 'emerald', 'amber', 'rose', 'violet', 'cyan'] as const).map(theme => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setNewTheme(theme)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer relative ${
                          newTheme === theme ? 'ring-2 ring-indigo-500' : ''
                        }`}
                        style={{
                          backgroundColor: 
                            theme === 'indigo' ? '#6366f1' :
                            theme === 'emerald' ? '#10b981' :
                            theme === 'amber' ? '#f59e0b' :
                            theme === 'rose' ? '#f43f5e' :
                            theme === 'violet' ? '#8b5cf6' : '#06b6d4'
                        }}
                      >
                        {newTheme === theme && <Check className="w-4 h-4 text-white font-black" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace Description</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly state target topics, exam guidelines, or reference materials..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-750 font-extrabold text-slate-500 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/15 cursor-pointer"
                  >
                    Initialize Workspace
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Workspace Modal */}
      {editingWorkspace && (
        <EditWorkspaceModal
          isOpen={Boolean(editingWorkspace)}
          onClose={() => setEditingWorkspace(null)}
          workspace={editingWorkspace}
          initialTab={editTab}
          onSave={(updated) => {
            onUpdateWorkspace?.(updated);
            setEditingWorkspace(null);
            window.dispatchEvent(
              new CustomEvent('studyweb-toast', {
                detail: {
                  message: 'Workspace updated successfully.',
                  type: 'success'
                }
              })
            );
          }}
        />
      )}
    </div>
  );
}
