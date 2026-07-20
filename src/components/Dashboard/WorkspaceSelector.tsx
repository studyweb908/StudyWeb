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
  FolderPlus,
  Coins,
  GripVertical
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
import { CSS } from '@dnd-kit/utilities';
import { Workspace } from './WorkspaceTypes';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  onSelectWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: (workspace: Workspace) => void;
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
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  getThemeTextClass: (theme: string) => string;
}

function SortableWorkspaceCard({
  ws,
  onSelectWorkspace,
  onToggleFavorite,
  onDeleteWorkspace,
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
          {/* Visual Cover Header (White-Greyish Background Only) */}
          <div className="h-24 bg-gradient-to-r from-slate-50 to-slate-100/90 dark:from-slate-850 dark:to-slate-800/90 border-b border-slate-150 dark:border-slate-800 relative overflow-hidden">
            {/* Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:10px_16px] pointer-events-none opacity-40" />
            
            {/* Logo Display - MAX VISIBILITY */}
            <div className="absolute bottom-2.5 left-4 w-12 h-12 bg-white dark:bg-slate-900 rounded-[14px] border-2 border-indigo-100 dark:border-slate-700 flex items-center justify-center text-2xl shadow-md transition-transform hover:scale-105 z-10">
              {ws.emoji || '🧬'}
            </div>

            {/* Pin status badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              {ws.pinned && (
                <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20 backdrop-blur-sm">
                  <Pin className="w-3.5 h-3.5 fill-current" />
                </span>
              )}
            </div>

            {/* Drag handle icon - top right */}
            <div 
              {...attributes} 
              {...listeners}
              onClick={(e) => e.stopPropagation()} 
              className="absolute top-3 right-3 p-1.5 bg-white/85 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-750 text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all cursor-grab active:cursor-grabbing z-20 touch-none"
              title="Drag to reorder workspace"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="p-5 space-y-3.5 text-left flex-1 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                {/* Subject Section - MAX VISIBILITY */}
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900/60 ${textClass}`}>
                  {ws.subject}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-450 dark:text-slate-500" title="Last Accessed">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>Last Accessed: {ws.lastOpened}</span>
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
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
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
              confirmDeleteId === ws.id ? (
                <div className="flex items-center gap-1 animate-fade-in bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg p-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWorkspace(ws.id);
                      setConfirmDeleteId(null);
                    }}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9.5px] font-black cursor-pointer shadow-sm transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(null);
                    }}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-[9.5px] font-black cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(ws.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-450 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
                  title="Delete workspace"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
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
  onSelectWorkspace, 
  onCreateWorkspace,
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
                          ws.subject.toLowerCase().includes(searchTerm.toLowerCase());
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
  const [newTemplate, setNewTemplate] = useState<'exam' | 'semester' | 'course' | 'research' | 'notes' | 'custom'>('exam');
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
      id: `ws-${Date.now()}`,
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6 text-left">
      {/* LANDING STATS BANNER */}
      <div className="relative rounded-[24px] overflow-hidden bg-slate-900 border border-slate-800 text-white p-6 sm:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
              AI Workspace Hub
            </span>
            <span className="text-xs text-slate-400 font-semibold">• From Confusion To Clarity</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Your Premium Personal Knowledge Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-semibold">
            Create structured study workspaces. Upload PDF slide decks, web URLs, transcripts, or notes. StudyWeb index processes formulas and crafts Spaced Repetition Flashcards instantly.
          </p>
        </div>
      </div>

      {/* FILTER RAILS & SEARCH CONTROL PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-4 rounded-[20px] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Subject scrollable badges */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all border cursor-pointer ${
                selectedSubject === sub
                  ? 'bg-slate-950 border-slate-950 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-sm'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-750 hover:bg-slate-50 dark:hover:bg-slate-950/40'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Search and sorting container */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input 
              type="text" 
              placeholder="Search workspaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-850 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex items-center w-full sm:w-[120px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none w-full pl-3 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-extrabold text-slate-600 dark:text-slate-350 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              >
                <option value="manual" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Custom Order</option>
                <option value="lastOpened" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Last Opened</option>
                <option value="name" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Alphabetical</option>
                <option value="files" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Total Documents</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow shadow-indigo-600/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* WORKSPACE CARDS GRID OR EMPTY STATES */}
      {workspaces.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto text-center py-16 px-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[28px] space-y-6 shadow-sm"
        >
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full animate-ping scale-110" />
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
              <FolderPlus className="w-10 h-10" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-850 dark:text-slate-100 tracking-tight">Create Your First Study Workspace</h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold leading-relaxed max-w-sm mx-auto">
              Workspaces are safe-havens for your biological, chemical, or historical papers. Add documents, build custom flashcard sets, and chat with your AI Tutor.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg hover:-translate-y-0.5 transition-transform cursor-pointer flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workspace</span>
          </button>
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
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedSubject('All');
            }}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-750 text-xs font-extrabold rounded-lg transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkspaces.map((ws) => (
                <SortableWorkspaceCard
                  key={ws.id}
                  ws={ws}
                  onSelectWorkspace={onSelectWorkspace}
                  onToggleFavorite={onToggleFavorite}
                  onDeleteWorkspace={onDeleteWorkspace}
                  confirmDeleteId={confirmDeleteId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  getThemeTextClass={getThemeTextClass}
                />
              ))}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Study Template</label>
                    <select
                      value={newTemplate}
                      onChange={(e) => setNewTemplate(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold text-slate-750 dark:text-slate-350 focus:outline-none"
                    >
                      <option value="exam">Practice Exam Cramming</option>
                      <option value="semester">Semester Course Track</option>
                      <option value="research">Research Bibliography</option>
                      <option value="notes">Lecture Notes Summaries</option>
                      <option value="custom">Blank Canvas Custom</option>
                    </select>
                  </div>
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
    </div>
  );
}
