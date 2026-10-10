import React, { useState } from 'react';
import { Layout, Grid, ChevronLeft, ChevronRight, Sparkles, Brain, Bot, CheckSquare, Check, Circle, BookOpen, FileText, Image as ImageIcon, ArrowRight, Video, Music, Globe, AlertCircle, Trash2, HardDrive, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import QuickPreviewModal from './QuickPreviewModal';

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Calendar</h3>
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-1">
          <button onClick={prevMonth} aria-label="Previous Month" className="focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white outline-none p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-colors cursor-pointer text-slate-600 dark:text-slate-300">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 min-w-16 text-center uppercase tracking-wider">
            {monthNames[currentDate.getMonth()].slice(0, 3)} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth} aria-label="Next Month" className="focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white outline-none p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-colors cursor-pointer text-slate-600 dark:text-slate-300">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">
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
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDate(day)}
              aria-label={`Select date ${day}`} className={`relative h-8 rounded-lg focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white outline-none flex items-center justify-center text-xs font-semibold cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                  : isToday
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {day}
              {events.length > 0 && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {events.map((type, idx) => (
                    <span 
                      key={idx} 
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? 'bg-white/80 dark:bg-slate-900/80' : 
                        type === 'study' ? 'bg-indigo-400' : 
                        type === 'revision' ? 'bg-emerald-400' : 'bg-amber-400'
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
    { id: '1', title: 'Review Cell Biology Flashcards', completed: true },
    { id: '2', title: 'Read Chapter 4', completed: false },
    { id: '3', title: 'Solve 10 Biology MCQs', completed: false },
    { id: '4', title: 'Watch Photosynthesis Lecture', completed: false },
  ]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = Math.round((completedCount / Math.max(tasks.length, 1)) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-400">
            <CheckSquare className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Today's Tasks</h3>
        </div>
      </div>

      {tasks.length > 0 ? (
        <>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Progress</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{completedCount} / {tasks.length} Completed</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, type: 'spring' }}
              />
            </div>
          </div>

          <div className="space-y-2.5 flex-1">
            <AnimatePresence>
              {tasks.map(task => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  role="button" tabIndex={0} aria-label={`Toggle task ${task.title}`} onKeyDown={(e) => e.key === "Enter" && toggleTask(task.id)} className={`group/item flex items-center focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    task.completed 
                      ? 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/40 text-slate-400 dark:text-slate-500 line-through' 
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm text-slate-700 dark:text-slate-200'
                  }`}
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="flex-shrink-0 relative flex items-center justify-center w-5 h-5">
                    {task.completed ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-white bg-indigo-500 rounded flex items-center justify-center w-4 h-4">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.div>
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 rounded group-hover/item:border-indigo-400 transition-colors" />
                    )}
                  </div>
                  <span className="text-[13px] font-medium truncate select-none flex-1 min-w-0">{task.title}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
             <CheckSquare className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500">You've completed all your tasks for today. Great job!</p>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------
// 3. AI Insights Widget
// -----------------------------------------
export function AIInsightsCard() {
  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full group">
      <div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">AI Insights</h3>
        </div>

        <div className="space-y-4 relative z-10">
          <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
            You struggled with <strong className="text-slate-900 dark:text-white font-semibold">Mitochondria</strong> yesterday during your biology quiz.
          </p>
        </div>
      </div>

      <div className="mt-8 relative z-10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all duration-300 cursor-pointer group/btn"
        >
          <span>Start Refresher Quiz</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
        </motion.button>
      </div>
    </div>
  );
}

// -----------------------------------------
// 4. Recent Study Materials
// -----------------------------------------
import { Workspace } from './WorkspaceTypes';

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
             
             // Filter based on activeWorkspace
             if (activeWorkspace && newDoc.workspace_id !== activeWorkspace.id) return;
             
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Recent Study Materials</h3>
        <button 
          onClick={() => setActiveTab && setActiveTab('workspaces')}
          className="text-[11px] text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-wider cursor-pointer transition-colors"
        >
          View All
        </button>
      </div>
      
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
          {['All', 'Documents', 'Images', 'Links'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            title="List View"
          >
            <Layout className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
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
            <div key={i} className={`rounded-xl bg-slate-50 dark:bg-slate-800/50 ${viewMode === 'grid' ? 'p-4 aspect-square flex flex-col justify-center items-center' : 'flex items-center justify-between p-3'}`}>
              <div className={`${viewMode === 'grid' ? 'flex flex-col items-center gap-3 w-full' : 'flex items-center gap-3 w-full'}`}>
                <div className={`${viewMode === 'grid' ? 'w-12 h-12 rounded-xl' : 'w-10 h-10 rounded-lg'} bg-slate-200 dark:bg-slate-700`}></div>
                <div className={`space-y-2 ${viewMode === 'grid' ? 'w-full text-center flex flex-col items-center' : ''}`}>
                  <div className="w-32 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : recentFiles.length > 0 ? (
        <div className={`flex-1 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}`}>
          {recentFiles.map((file) => {
            const { icon: Icon, color, bg } = getFileStyle(file.type);
            
            if (viewMode === 'grid') {
              return (
                <div 
                  key={file.id} 
                  onClick={() => handleOpenFile(file.workspaceId, file)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group/item gap-3 cursor-pointer text-center relative overflow-hidden"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
                    <Icon className="w-6 h-6 group-hover/item:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="min-w-0 w-full px-1">
                    <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{file.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-1">
                      {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center p-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled
                      onClick={(e) => { e.stopPropagation(); }}
                      className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-700/50 dark:text-indigo-300/50 text-xs font-bold transition-all cursor-not-allowed w-full opacity-60 grayscale"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Quiz</span>
                    </motion.button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={file.id} 
                onClick={() => handleOpenFile(file.workspaceId, file)}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group/item gap-3 cursor-pointer min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg} ${color}`}>
                    <Icon className="w-5 h-5 group-hover/item:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{file.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5">
                      {file.type} &bull; {new Date(file.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled
                  onClick={(e) => { e.stopPropagation(); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-not-allowed self-start sm:self-auto opacity-60 grayscale"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden sm:inline">Generate Quiz</span>
                  <span className="sm:hidden">Quiz</span>
                </motion.button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
             <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500">No study materials have been added yet. Let's upload something!</p>
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
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-sm relative shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center mb-4 text-rose-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Delete Material</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to delete <span className="font-bold text-slate-700 dark:text-slate-300">"{fileToDelete.name}"</span>? This action cannot be undone and will remove it from your workspace forever.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setFileToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFile}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
// Storage Quota Widget
// -----------------------------------------
export function StorageQuotaWidget({ workspaces = [] }: { workspaces?: Workspace[] }) {
  const parseSize = (sizeStr: string) => {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d\.]+)\s*(MB|KB|GB|Bytes)/i);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return val * 1024 * 1024 * 1024;
    if (unit === 'MB') return val * 1024 * 1024;
    if (unit === 'KB') return val * 1024;
    return val;
  };

  const totalBytes = workspaces.reduce((acc, ws) => {
    return acc + (ws.files || []).reduce((fileAcc, file) => fileAcc + parseSize(file.size || '0 MB'), 0);
  }, 0);

  const baseline = 45.2 * 1024 * 1024; // 45.2 MB base
  const usedBytes = totalBytes + baseline;
  const limitBytes = 1024 * 1024 * 1024; // 1 GB limit
  
  const percentage = Math.min(100, (usedBytes / limitBytes) * 100);
  const isNearingLimit = percentage > 85;

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Storage Quota</h3>
        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
          <HardDrive className="w-5 h-5 text-indigo-500" />
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-end justify-between mb-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {formatSize(usedBytes)}
            </span>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              / {formatSize(limitBytes)}
            </span>
          </div>
          
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${isNearingLimit ? 'bg-rose-500' : 'bg-indigo-500'}`}
            />
          </div>
        </div>

        {isNearingLimit ? (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-0.5">Approaching Limit</p>
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">You've used over 85% of your free storage. Consider upgrading to Pro.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Plenty of space available</p>
          </div>
        )}
      </div>
    </div>
  );
}
