import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Brain, Bot, CheckSquare, Check, Circle, BookOpen, FileText, Image as ImageIcon, ArrowRight, Video, Music, Globe, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

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
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500" />
              Ready for a 5-minute refresher?
            </p>
          </div>
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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchDocuments() {
      if (!activeWorkspace) {
        setDbFiles([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        if (supabase) {
           const { data, error: fetchError } = await supabase
             .from('documents')
             .select('*')
             .eq('workspace_id', activeWorkspace.id)
             .order('created_at', { ascending: false })
             .limit(5);
           
           if (fetchError) {
             setError(fetchError.message);
           } else if (data && data.length > 0) {
             setDbFiles(data.map(d => ({
               id: d.id,
               name: d.title || d.name || 'Untitled Document',
               type: d.file_type || d.type || 'pdf',
               uploadDate: d.created_at || d.upload_date || new Date().toISOString(),
               workspaceId: d.workspace_id
             })));
             setLoading(false);
             return; // Success with Supabase
           }
        }
      } catch (err: any) {
        console.error("Error fetching documents from Supabase:", err);
        setError(err.message || 'Failed to fetch documents');
      }

      // Fallback: If no supabase data or error occurred, try local workspace files
      const localFiles = activeWorkspace.files ? activeWorkspace.files.map(f => ({ ...f, workspaceId: activeWorkspace.id })) : [];
      localFiles.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
      setDbFiles(localFiles.slice(0, 5));
      setLoading(false);
    }
    fetchDocuments();
  }, [activeWorkspace, workspaces]);

  const recentFiles = dbFiles;

  const getFileStyle = (type: string) => {
    switch (type) {
      case 'pdf': return { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40' };
      case 'video': return { icon: Video, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40' };
      case 'audio': return { icon: Music, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' };
      case 'url': return { icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40' };
      case 'image': return { icon: ImageIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' };
      default: return { icon: FileText, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' };
    }
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

  const handleOpenFile = (workspaceId: string) => {
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
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Recent Study Materials</h3>
        <button 
          onClick={() => setActiveTab && setActiveTab('workspaces')}
          className="text-[11px] text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 uppercase tracking-wider cursor-pointer transition-colors"
        >
          View All
        </button>
      </div>
      
      {error && (
        <div className="mb-4 flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-semibold">We couldn't load your recent files. Please try refreshing.</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2 flex-1 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
                <div className="space-y-2">
                  <div className="w-32 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : recentFiles.length > 0 ? (
        <div className="space-y-2 flex-1">
          {recentFiles.map((file) => {
            const { icon: Icon, color, bg } = getFileStyle(file.type);
            return (
              <div 
                key={file.id} 
                onClick={() => handleOpenFile(file.workspaceId)}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 group/item gap-3 cursor-pointer min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateQuiz(file.workspaceId);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-sm text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Create Practice Quiz</span>
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
          <p className="text-sm font-medium text-slate-500">You haven't uploaded any study materials yet.</p>
        </div>
      )}
    </div>
  );
}
