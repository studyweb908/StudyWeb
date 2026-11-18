import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Grid, ChevronLeft, ChevronRight, Sparkles, Brain, Bot, CheckSquare, Check, Circle, BookOpen, FileText, Image as ImageIcon, ArrowRight, Video, Music, Globe, AlertCircle, Trash2, HardDrive, AlertTriangle, Database, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import QuickPreviewModal from './QuickPreviewModal';
import { StorageQuotaSkeleton } from './DashboardSkeletons';
import { Workspace } from './WorkspaceTypes';

// -----------------------------------------
// 1. Interactive Mini Calendar
// -----------------------------------------
export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(1);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(1);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Mock events for 3-4 upcoming dates
  const mockEvents: Record<number, string[]> = {
    12: ['study'],
    15: ['revision', 'quiz'],
    18: ['study'],
    22: ['quiz']
  };

  return (
    <div className="bg-white dark:bg-[#151D3B] border border-[#E8ECF6] dark:border-[#222E54] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-bold text-base text-[#151D3B] dark:text-white tracking-tight">Study Calendar</h3>
        <div className="flex items-center gap-1 bg-[#F6F8FD] dark:bg-slate-800/60 rounded-xl p-1 border border-[#E8ECF6] dark:border-[#222E54]">
          <button onClick={prevMonth} aria-label="Previous Month" className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer text-[#69779C] dark:text-slate-300">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-[#151D3B] dark:text-slate-200 min-w-16 text-center uppercase tracking-wider">
            {monthNames[currentDate.getMonth()].slice(0, 3)} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth} aria-label="Next Month" className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer text-[#69779C] dark:text-slate-300">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-[#69779C] uppercase tracking-wider py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected = selectedDate === day;
          const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
          const events = mockEvents[day] || [];

          return (
            <motion.button
              key={day}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDate(day)}
              aria-label={`Select date ${day}`} 
              className={`relative h-8 rounded-xl outline-none flex items-center justify-center text-xs font-semibold cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-[#5145F5] text-white shadow-md shadow-[#5145F5]/30 font-bold' 
                  : isToday
                    ? 'bg-[#EFEDFF] text-[#5145F5] font-black border border-[#5145F5]/30'
                    : 'text-[#151D3B] dark:text-slate-300 hover:bg-[#F6F8FD] dark:hover:bg-slate-800/50'
              }`}
            >
              {day}
              {events.length > 0 && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {events.map((type, idx) => (
                    <span 
                      key={idx} 
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? 'bg-white/90' : 
                        type === 'study' ? 'bg-[#5145F5]' : 
                        type === 'revision' ? 'bg-[#19A974]' : 'bg-[#F59E0B]'
                      }`}
                    />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------
// 2. Today's Tasks Widget
// -----------------------------------------
export function TodayTasksCard() {
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Review Cell Biology Flashcards', completed: true, tag: 'High' },
    { id: '2', title: 'Read Chapter 4 Notes', completed: false, tag: 'Medium' },
    { id: '3', title: 'Complete Practice Quiz on Photosynthesis', completed: false, tag: 'High' },
    { id: '4', title: 'Ask AI Tutor about Krebs Cycle', completed: false, tag: 'Low' },
  ]);

  const [newTaskInput, setNewTaskInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    setTasks([...tasks, {
      id: Date.now().toString(),
      title: newTaskInput.trim(),
      completed: false,
      tag: 'Medium'
    }]);
    setNewTaskInput('');
    setShowInput(false);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = Math.round((completedCount / Math.max(tasks.length, 1)) * 100);

  return (
    <div className="bg-white dark:bg-[#151D3B] border border-[#E8ECF6] dark:border-[#222E54] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#EFEDFF] dark:bg-[#5145F5]/20 rounded-xl text-[#5145F5]">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#151D3B] dark:text-white tracking-tight">Today's Focus</h3>
            <p className="text-[11px] text-[#69779C] font-medium">Daily study goals & tasks</p>
          </div>
        </div>

        <button
          onClick={() => setShowInput(!showInput)}
          className="text-xs font-bold text-[#5145F5] hover:text-[#4336E0] bg-[#EFEDFF] hover:bg-[#E3E0FF] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
        >
          {showInput ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showInput && (
        <form onSubmit={handleAddTask} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newTaskInput}
            onChange={(e) => setNewTaskInput(e.target.value)}
            placeholder="What will you learn next?..."
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#E8ECF6] bg-[#F6F8FD] text-[#151D3B] focus:outline-none focus:border-[#5145F5]"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-2 bg-[#5145F5] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#4336E0]"
          >
            Add
          </button>
        </form>
      )}

      {tasks.length > 0 ? (
        <>
          <div className="mb-5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#69779C]">Progress</span>
              <span className="text-xs font-bold text-[#5145F5]">{completedCount} of {tasks.length} Completed ({progress}%)</span>
            </div>
            <div className="w-full h-2 bg-[#F6F8FD] dark:bg-slate-800 rounded-full overflow-hidden border border-[#E8ECF6]/60 dark:border-slate-700">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#5145F5] to-[#7668FF] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, type: 'spring' }}
              />
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
            <AnimatePresence>
              {tasks.map(task => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  role="button" 
                  tabIndex={0} 
                  aria-label={`Toggle task ${task.title}`} 
                  onKeyDown={(e) => e.key === "Enter" && toggleTask(task.id)} 
                  className={`group/item flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                    task.completed 
                      ? 'bg-[#F6F8FD]/60 dark:bg-slate-800/20 border-[#E8ECF6] text-[#69779C] line-through' 
                      : 'bg-white dark:bg-slate-800/40 border-[#E8ECF6] dark:border-slate-700 hover:border-[#5145F5]/40 shadow-2xs text-[#151D3B] dark:text-slate-100'
                  }`}
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="flex-shrink-0 relative flex items-center justify-center w-5 h-5">
                    {task.completed ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-white bg-[#5145F5] rounded-md flex items-center justify-center w-4 h-4 shadow-2xs shadow-[#5145F5]/30">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.div>
                    ) : (
                      <div className="w-4 h-4 border-2 border-[#CBD5E1] dark:border-slate-600 rounded-md group-hover/item:border-[#5145F5] transition-colors" />
                    )}
                  </div>
                  <span className="text-[12.5px] font-semibold truncate select-none flex-1 min-w-0">{task.title}</span>
                  {task.tag && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      task.tag === 'High' ? 'bg-[#FFF0E5] text-[#D97706]' :
                      task.tag === 'Medium' ? 'bg-[#EFEDFF] text-[#5145F5]' :
                      'bg-[#EAF3FF] text-[#2563EB]'
                    }`}>
                      {task.tag}
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 bg-[#EFEDFF] rounded-full flex items-center justify-center mb-2 text-[#5145F5]">
             <CheckSquare className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-[#69779C]">You've completed all your tasks for today. Great job!</p>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------
// 3. AI Insights Widget
// -----------------------------------------
export function AIInsightsCard({ onStartRefresher }: { onStartRefresher?: () => void }) {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#151D3B] border border-[#E8ECF6] dark:border-[#222E54] rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full group">
      <div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#EFEDFF] dark:bg-[#5145F5]/20 rounded-xl text-[#5145F5]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#151D3B] dark:text-white tracking-tight">AI Study Insights</h3>
              <p className="text-[11px] text-[#69779C] font-medium">Personalized recommendations</p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-[#EFEDFF] text-[#5145F5] px-2 py-0.5 rounded-full border border-[#5145F5]/20">
            Active Recall
          </span>
        </div>

        <div className="space-y-3 relative z-10 mt-2">
          <div className="p-3.5 rounded-xl bg-[#F6F8FD] dark:bg-slate-800/40 border border-[#E8ECF6] dark:border-slate-700">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#19A974]" />
              <span className="text-[11px] font-bold text-[#19A974] uppercase tracking-wide">High Retention</span>
            </div>
            <p className="text-xs text-[#151D3B] dark:text-slate-200 font-semibold">
              Mastery in <strong>Cell Structure & Organelles</strong> (92%)
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FFF0E5]/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-wide">Suggested Review</span>
            </div>
            <p className="text-xs text-[#151D3B] dark:text-slate-200 font-semibold">
              You had questions on <strong>Krebs Cycle & ATP synthesis</strong> yesterday. Recommended: 5-minute refresher quiz.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 relative z-10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartRefresher}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#5145F5] hover:bg-[#4336E0] text-white rounded-xl text-xs font-bold shadow-md shadow-[#5145F5]/20 transition-all duration-300 cursor-pointer group/btn"
        >
          <span>Start 5-Min Refresher Quiz</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </motion.button>
      </div>
    </div>
  );
}

// -----------------------------------------
// 4. Recent Study Materials
// -----------------------------------------

export function RecentStudyMaterials({ 
  workspaces = [],
  setActiveWorkspace,
  setActiveTab,
  activeWorkspace
}: { 
  workspaces?: Workspace[],
  setActiveWorkspace?: (workspace: Workspace | null) => void,
  setActiveTab?: (tab: string) => void,
  activeWorkspace?: Workspace | null
}) {
  const [dbFiles, setDbFiles] = React.useState<any[]>([]);
  const [previewFile, setPreviewFile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = React.useState<any>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [filter, setFilter] = React.useState<'All' | 'Documents' | 'Images' | 'Links'>('All');
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      if (supabase) {
        await supabase.from('workspace_files').delete().eq('id', fileToDelete.id);
      }
      setDbFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
      
      // Dispatch event so App.tsx can update local workspaces array
      window.dispatchEvent(
        new CustomEvent('studyweb-file-deleted', {
          detail: { id: fileToDelete.id, workspaceId: fileToDelete.workspaceId }
        })
      );
      
      window.dispatchEvent(
        new CustomEvent('studyweb-toast', {
          detail: {
            message: `"${fileToDelete.name}" was deleted successfully.`,
            type: 'success'
          }
        })
      );
    } catch (err) {
      console.error("Failed to delete file:", err);
      window.dispatchEvent(
        new CustomEvent('studyweb-toast', {
          detail: {
            message: `Failed to delete "${fileToDelete.name}".`,
            type: 'error'
          }
        })
      );
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

    React.useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true);
        setError(null);

        // 1. First attempt to load via server proxy endpoint (reliable, immune to browser CORS and network fetch blocks)
        try {
          const params = new URLSearchParams();
          if (activeWorkspace) {
            params.append('workspaceId', activeWorkspace.id);
          } else if (workspaces && workspaces.length > 0) {
            params.append('workspaceIds', workspaces.map(w => w.id).join(','));
          } else {
            // Strictly prevent querying when user has no workspaces
            setDbFiles([]);
            setLoading(false);
            return;
          }
          params.append('limit', '5');

          const res = await fetch(`/api/workspace-files?${params.toString()}`);
          if (res.ok) {
            const json = await res.json();
            if (json.files && Array.isArray(json.files) && json.files.length > 0) {
              setDbFiles(json.files.map((d: any) => ({
                id: d.id,
                name: d.title || d.name || 'Untitled Document',
                type: d.file_type || d.type || 'pdf',
                uploadDate: d.created_at || new Date().toISOString(),
                workspaceId: d.workspace_id
              })));
              setLoading(false);
              return;
            }
          }
        } catch {
          // Non-fatal, smoothly proceed to local files
        }

        // 2. Fallback: load directly from active workspace & workspaces state
        let localFiles: any[] = [];
        if (activeWorkspace) {
          localFiles = activeWorkspace.files ? activeWorkspace.files.map(f => ({ ...f, workspaceId: activeWorkspace.id })) : [];
        } else if (workspaces && workspaces.length > 0) {
          workspaces.forEach(w => {
            if (w.files) {
              localFiles.push(...w.files.map(f => ({ ...f, workspaceId: w.id })));
            }
          });
        }
        localFiles.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
        setDbFiles(localFiles.slice(0, 5));
      } catch {
        // Fallback silently without throwing or setting error banners
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
    
    if (supabase) {
      try {
        const channel = supabase
          .channel('workspace_files_widgets')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_files' }, (payload) => {
             const newDoc = payload.new;
             
             // Strict User Isolation: Check that this file belongs to one of the current user's workspaces
             const allowedWsIds = new Set([
               ...(activeWorkspace ? [activeWorkspace.id] : []),
               ...(workspaces || []).map(w => w.id)
             ]);
             if (!allowedWsIds.has(newDoc.workspace_id)) return;
             
             setDbFiles(prev => {
               const newFile = {
                 id: newDoc.id,
                 name: newDoc.name || 'Untitled Document',
                 type: newDoc.type || 'pdf',
                 uploadDate: newDoc.created_at || new Date().toISOString(),
                 workspaceId: newDoc.workspace_id
               };
               const updated = [newFile, ...prev];
               return updated.slice(0, 5);
             });
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'workspace_files' }, (payload) => {
             const oldDoc = payload.old;
             setDbFiles(prev => prev.filter(f => f.id !== oldDoc.id));
          })
          .subscribe();
          
        return () => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        };
      } catch {}
    }
  }, [activeWorkspace, workspaces]);

  const recentFiles = dbFiles.filter(file => {
    if (filter === 'All') return true;
    const t = (file.type || '').toLowerCase();
    if (filter === 'Documents') {
      return t.includes('pdf') || t.includes('doc') || t.includes('word') || t.includes('text') || t.includes('epub') || t.includes('book') || t.includes('markdown') || t.includes('md');
    }
    if (filter === 'Images') {
      return t.includes('image') || t.includes('jpg') || t.includes('png');
    }
    if (filter === 'Links') {
      return t.includes('url') || t.includes('link') || t.includes('web');
    }
    return false;
  });

  const getFileStyle = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('pdf')) return { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40' };
    if (t.includes('video') || t.includes('mp4')) return { icon: Video, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40' };
    if (t.includes('audio') || t.includes('mp3')) return { icon: Music, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' };
    if (t.includes('url') || t.includes('link') || t.includes('web')) return { icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' };
    if (t.includes('image') || t.includes('jpg') || t.includes('png')) return { icon: ImageIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' };
    if (t.includes('doc') || t.includes('word') || t.includes('text')) return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' };
    if (t.includes('epub') || t.includes('book')) return { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' };
    if (t.includes('markdown') || t.includes('md')) return { icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' };
    return { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' };
  };

  const handleGenerateQuiz = (workspaceId: string) => {
    if (setActiveWorkspace && setActiveTab) {
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace) {
        setActiveWorkspace(workspace);
        setActiveTab('quiz-center');
      }
    }
  };

  const handleOpenFile = (workspaceId: string, file: any) => {
    const t = (file.type || '').toLowerCase();
    if (t.includes('pdf') || t.includes('image') || t.includes('png') || t.includes('jpg')) {
      setPreviewFile(file);
      return;
    }
    if (setActiveWorkspace && setActiveTab) {
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace) {
        setActiveWorkspace(workspace);
        setActiveTab('pdf-chat');
      }
    }
  };

  return (
    <div className="bg-white dark:bg-[#151D3B] border border-[#E8ECF6] dark:border-[#222E54] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-[#151D3B] dark:text-white tracking-tight">Recent Study Materials</h3>
          <p className="text-[11px] text-[#69779C] font-medium">Uploaded notes, documents & guides</p>
        </div>
        <button 
          onClick={() => setActiveTab && setActiveTab('workspaces')}
          className="text-[11px] text-[#5145F5] dark:text-[#7668FF] font-bold hover:underline uppercase tracking-wider cursor-pointer transition-colors"
        >
          View All
        </button>
      </div>
      
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-1">
          {['All', 'Documents', 'Images', 'Links'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === f
                  ? 'bg-[#EFEDFF] text-[#5145F5] font-bold border border-[#5145F5]/30 dark:bg-[#5145F5]/20 dark:text-[#7668FF]'
                  : 'bg-[#F6F8FD] text-[#69779C] hover:bg-[#E8ECF6] dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-[#F6F8FD] dark:bg-slate-800 p-1 rounded-xl shrink-0 border border-[#E8ECF6] dark:border-slate-700">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-xs text-[#5145F5] dark:text-white font-bold' : 'text-[#69779C] hover:text-[#151D3B] dark:text-slate-400'}`}
            title="List View"
          >
            <Layout className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-xs text-[#5145F5] dark:text-white font-bold' : 'text-[#69779C] hover:text-[#151D3B] dark:text-slate-400'}`}
            title="Grid View"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-semibold">We couldn't load your recent files. Please try refreshing.</p>
        </div>
      )}

      {loading ? (
        <div className={`flex-1 animate-pulse ${viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-2'}`}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`rounded-xl bg-[#F6F8FD] dark:bg-slate-800/50 ${viewMode === 'grid' ? 'p-4 aspect-square flex flex-col justify-center items-center' : 'flex items-center justify-between p-3'}`}>
              <div className={`${viewMode === 'grid' ? 'flex flex-col items-center gap-3 w-full' : 'flex items-center gap-3 w-full'}`}>
                <div className={`${viewMode === 'grid' ? 'w-12 h-12 rounded-xl' : 'w-10 h-10 rounded-lg'} bg-[#E8ECF6] dark:bg-slate-700`}></div>
                <div className={`space-y-2 ${viewMode === 'grid' ? 'w-full text-center flex flex-col items-center' : ''}`}>
                  <div className="w-32 h-2.5 bg-[#E8ECF6] dark:bg-slate-700 rounded-full"></div>
                  <div className="w-20 h-2 bg-[#E8ECF6] dark:bg-slate-700 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : recentFiles.length > 0 ? (
        <div className={`flex-1 overflow-y-auto max-h-[260px] pr-1 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}`}>
          {recentFiles.map((file) => {
            const { icon: Icon, color, bg } = getFileStyle(file.type);
            
            if (viewMode === 'grid') {
              return (
                <div 
                  key={file.id} 
                  onClick={() => handleOpenFile(file.workspaceId, file)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#F6F8FD]/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all border border-[#E8ECF6] dark:border-slate-800 hover:border-[#5145F5]/30 group/item gap-2.5 cursor-pointer text-center relative overflow-hidden shadow-2xs hover:shadow-xs"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
                    <Icon className="w-5 h-5 group-hover/item:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="min-w-0 w-full px-1">
                    <p className="text-[12px] font-bold text-[#151D3B] dark:text-slate-200 truncate group-hover/item:text-[#5145F5] transition-colors">{file.name}</p>
                    <p className="text-[10px] text-[#69779C] font-medium tracking-wide mt-0.5">
                      {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={file.id} 
                onClick={() => handleOpenFile(file.workspaceId, file)}
                className="flex items-center justify-between p-3 rounded-xl bg-[#F6F8FD]/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/60 transition-all border border-[#E8ECF6] dark:border-slate-800 hover:border-[#5145F5]/30 group/item gap-3 cursor-pointer min-w-0 shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
                    <Icon className="w-4.5 h-4.5 group-hover/item:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#151D3B] dark:text-slate-200 truncate group-hover/item:text-[#5145F5] transition-colors">{file.name}</p>
                    <p className="text-[10px] text-[#69779C] font-medium tracking-wide mt-0.5">
                      {file.type.toUpperCase()} &bull; {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (setActiveTab) setActiveTab('ai-tutor');
                    }}
                    className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFEDFF] text-[#5145F5] text-xs font-bold hover:bg-[#E3E0FF] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Ask Tutor</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 bg-[#EFEDFF] rounded-full flex items-center justify-center mb-2 text-[#5145F5]">
             <FileText className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-[#69779C]">No study materials added yet. Create a workspace to upload materials!</p>
        </div>
      )}

      {previewFile && (
        <QuickPreviewModal 
          file={previewFile} 
          onClose={() => setPreviewFile(null)} 
        />
      )}
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {fileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isDeleting && setFileToDelete(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#151D3B] rounded-3xl p-6 sm:p-8 w-full max-w-sm relative shadow-2xl border border-[#E8ECF6] dark:border-[#222E54]"
            >
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center mb-4 text-rose-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#151D3B] dark:text-slate-100 mb-2">Delete Material</h3>
              <p className="text-sm text-[#69779C] mb-6">
                Are you sure you want to delete <span className="font-bold text-[#151D3B] dark:text-white">"{fileToDelete.name}"</span>?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setFileToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-[#69779C] bg-[#F6F8FD] hover:bg-[#E8ECF6] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFile}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------------------
// Real Supabase Knowledge Storage Widget
// -----------------------------------------
interface SupabaseStorageBreakdown {
  filesBytes: number;
  filesCount: number;
  notesBytes: number;
  notesCount: number;
  vectorBytes: number;
  vectorCount: number;
  isLiveSynced: boolean;
}

const storageStatsMemoryCache = new Map<string, { data: SupabaseStorageBreakdown; timestamp: number }>();
const STORAGE_CACHE_TTL_MS = 15_000;

function parseSizeToBytes(sizeStr?: string | number | null): number {
  if (typeof sizeStr === 'number' && Number.isFinite(sizeStr)) return Math.max(0, sizeStr);
  if (!sizeStr || typeof sizeStr !== 'string') return 0;
  const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|Bytes|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  if (!Number.isFinite(val) || val <= 0) return 0;
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return Math.round(val * 1024 * 1024 * 1024);
  if (unit === 'MB') return Math.round(val * 1024 * 1024);
  if (unit === 'KB') return Math.round(val * 1024);
  return Math.round(val);
}

function estimateJsonByteLength(obj: any): number {
  if (!obj) return 0;
  try {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return new Blob([str]).size;
  } catch {
    return 0;
  }
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb >= 100 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? mb.toFixed(1) : mb.toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageQuotaWidget({ workspaces = [], isLoading = false }: { workspaces?: Workspace[]; isLoading?: boolean }) {
  // 1. Instant local computation from workspaces prop (0ms initial render)
  const localBreakdown = useMemo<SupabaseStorageBreakdown>(() => {
    let filesBytes = 0;
    let filesCount = 0;
    let notesBytes = 0;
    let notesCount = 0;
    let estimatedVectorChunks = 0;
    let estimatedVectorBytes = 0;

    for (const ws of workspaces) {
      const wsFiles = Array.isArray(ws.files) ? ws.files : [];
      filesCount += wsFiles.length;
      for (const file of wsFiles) {
        const declaredSize = parseSizeToBytes(file.size);
        const textBytes =
          estimateJsonByteLength(file.contentText) +
          estimateJsonByteLength(file.transcription) +
          estimateJsonByteLength(file.summary) +
          estimateJsonByteLength(file.highlights);
        const actualFileBytes = Math.max(declaredSize, textBytes, 1024);
        filesBytes += actualFileBytes;

        if (file.status === 'indexed' || file.contentText || file.summary) {
          const chunksForFile = Math.max(1, Math.ceil((textBytes || 2048) / 1200));
          estimatedVectorChunks += chunksForFile;
          // Each pgvector chunk row (~1.2KB content + 768*4B float32 vector + metadata = ~4.5KB)
          estimatedVectorBytes += chunksForFile * 4608;
        }
      }

      const wsNotes = Array.isArray(ws.notes) ? ws.notes : [];
      const wsCards = Array.isArray(ws.flashcards) ? ws.flashcards : [];
      const wsQuizzes = Array.isArray(ws.quizzes) ? ws.quizzes : [];
      const wsNodes = Array.isArray(ws.nodes) ? ws.nodes : [];

      notesCount += wsNotes.length + wsCards.length + wsQuizzes.length;
      notesBytes +=
        estimateJsonByteLength(wsNotes) +
        estimateJsonByteLength(wsCards) +
        estimateJsonByteLength(wsQuizzes) +
        estimateJsonByteLength(wsNodes);
    }

    return {
      filesBytes,
      filesCount,
      notesBytes,
      notesCount,
      vectorBytes: estimatedVectorBytes,
      vectorCount: estimatedVectorChunks,
      isLiveSynced: false,
    };
  }, [workspaces]);

  const [remoteBreakdown, setRemoteBreakdown] = useState<SupabaseStorageBreakdown | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchRealSupabaseStorage() {
      if (!supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) return;

        const cacheKey = `${uid}:${workspaces.length}`;
        const cached = storageStatsMemoryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < STORAGE_CACHE_TTL_MS) {
          if (isMounted) setRemoteBreakdown(cached.data);
          return;
        }

        const wsIds = workspaces.map((w) => w.id).filter(Boolean);

        // Fetch real user rows from workspace_files and documents in parallel
        const [filesQueryRes, docsQueryRes, avatarListRes] = await Promise.allSettled([
          supabase
            .from('workspace_files')
            .select('id, size, summary, content_text, transcription')
            .eq('user_id', uid),
          wsIds.length > 0
            ? supabase
                .from('documents')
                .select('id, content, metadata')
                .in('workspace_id', wsIds)
            : supabase
                .from('documents')
                .select('id, content, metadata')
                .eq('user_id', uid),
          supabase.storage.from('avatars').list(uid)
        ]);

        let dbFilesBytes = 0;
        let dbFilesCount = 0;
        if (filesQueryRes.status === 'fulfilled' && Array.isArray(filesQueryRes.value.data)) {
          const rows = filesQueryRes.value.data;
          dbFilesCount = rows.length;
          for (const r of rows) {
            const declared = parseSizeToBytes(r.size);
            const contentLen =
              estimateJsonByteLength(r.content_text) +
              estimateJsonByteLength(r.transcription) +
              estimateJsonByteLength(r.summary);
            dbFilesBytes += Math.max(declared, contentLen, 1024);
          }
        }

        // Also include avatar storage bytes if present in Supabase Storage
        if (avatarListRes.status === 'fulfilled' && Array.isArray(avatarListRes.value.data)) {
          for (const obj of avatarListRes.value.data) {
            const metaSize = Number((obj as any)?.metadata?.size || 0);
            if (metaSize > 0) {
              dbFilesBytes += metaSize;
            }
          }
        }

        let dbVectorCount = 0;
        let dbVectorBytes = 0;
        if (docsQueryRes.status === 'fulfilled' && Array.isArray(docsQueryRes.value.data)) {
          const docRows = docsQueryRes.value.data;
          dbVectorCount = docRows.length;
          for (const d of docRows) {
            const textLen = estimateJsonByteLength(d.content) + estimateJsonByteLength(d.metadata);
            // pgvector embedding (768 float32 = 3072 bytes) + row text & index overhead
            dbVectorBytes += textLen + 3584;
          }
        }

        const mergedData: SupabaseStorageBreakdown = {
          filesBytes: Math.max(localBreakdown.filesBytes, dbFilesBytes),
          filesCount: Math.max(localBreakdown.filesCount, dbFilesCount),
          notesBytes: localBreakdown.notesBytes,
          notesCount: localBreakdown.notesCount,
          vectorCount: Math.max(localBreakdown.vectorCount, dbVectorCount),
          vectorBytes: Math.max(localBreakdown.vectorBytes, dbVectorBytes),
          isLiveSynced: true,
        };

        storageStatsMemoryCache.set(cacheKey, { data: mergedData, timestamp: Date.now() });
        if (isMounted) {
          setRemoteBreakdown(mergedData);
        }
      } catch {
        // Non-fatal fallback to localBreakdown
      }
    }

    fetchRealSupabaseStorage();
    return () => {
      isMounted = false;
    };
  }, [workspaces, localBreakdown]);

  if (isLoading && workspaces.length === 0) {
    return <StorageQuotaSkeleton />;
  }

  const activeStats: SupabaseStorageBreakdown = remoteBreakdown
    ? {
        filesBytes: Math.max(localBreakdown.filesBytes, remoteBreakdown.filesBytes),
        filesCount: Math.max(localBreakdown.filesCount, remoteBreakdown.filesCount),
        notesBytes: Math.max(localBreakdown.notesBytes, remoteBreakdown.notesBytes),
        notesCount: Math.max(localBreakdown.notesCount, remoteBreakdown.notesCount),
        vectorBytes: Math.max(localBreakdown.vectorBytes, remoteBreakdown.vectorBytes),
        vectorCount: Math.max(localBreakdown.vectorCount, remoteBreakdown.vectorCount),
        isLiveSynced: remoteBreakdown.isLiveSynced,
      }
    : localBreakdown;

  const usedBytes = activeStats.filesBytes + activeStats.notesBytes + activeStats.vectorBytes;
  const limitBytes = 1024 * 1024 * 1024; // 1 GB Supabase Free Tier Quota

  // Ensure visual bar shows at least a subtle fill when data is stored (> 0 bytes)
  const rawPercentage = (usedBytes / limitBytes) * 100;
  const visualPercentage = usedBytes > 0 ? Math.min(100, Math.max(2.5, rawPercentage)) : 0;
  const isNearingLimit = rawPercentage > 85;

  return (
    <div className="bg-white dark:bg-[#151D3B] border border-[#E8ECF6] dark:border-[#222E54] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full group">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-[#151D3B] dark:text-white tracking-tight">
            Knowledge Storage
          </h3>
          <p className="text-xs text-[#69779C] font-medium mt-0.5">
            Your quota out of 1 GB
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#EFEDFF] dark:bg-[#5145F5]/20 flex items-center justify-center shrink-0">
          <HardDrive className="w-5 h-5 text-[#5145F5]" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-black font-mono tabular-nums text-[#151D3B] dark:text-white tracking-tight leading-none">
            {formatStorageBytes(usedBytes)}
          </span>
          <span className="text-xs font-bold text-[#69779C] mb-0.5">
            / 1 GB
          </span>
        </div>

        <div className="h-2.5 w-full bg-[#F6F8FD] dark:bg-slate-800 rounded-full overflow-hidden border border-[#E8ECF6] dark:border-slate-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${visualPercentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isNearingLimit ? 'bg-rose-500' : 'bg-gradient-to-r from-[#5145F5] via-indigo-500 to-emerald-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
}

