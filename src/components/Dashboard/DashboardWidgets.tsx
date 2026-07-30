import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Brain, Bot, CheckSquare, Check, Circle, BookOpen, FileText, Image as ImageIcon, ArrowRight, Video, Music, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Calendar</h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} aria-label="Previous Month" className="focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white outline-none p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-600 dark:text-slate-400">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs xl:text-sm font-bold text-slate-800 dark:text-slate-200 min-w-16 w-auto text-center truncate">
            {monthNames[currentDate.getMonth()].slice(0, 3)} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth} aria-label="Next Month" className="focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white outline-none p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-600 dark:text-slate-400">
            <ChevronRight className="w-4 h-4" />
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
              aria-label={`Select date ${day}`} className={`relative h-8 rounded-xl focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white outline-none flex items-center justify-center text-xs font-semibold cursor-pointer transition-colors ${
                isSelected 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                  : isToday
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-slate-700'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                        type === 'study' ? 'bg-indigo-500' : 
                        type === 'revision' ? 'bg-emerald-500' : 'bg-purple-500'
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
      <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-tl from-slate-100 to-transparent dark:from-slate-800/30 rounded-tl-[64px] -z-10 transition-transform duration-500 group-hover:scale-110" />

      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Today's Tasks</h3>
        </div>
      </div>

      {tasks.length > 0 ? (
        <>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Progress</span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">{completedCount} / {tasks.length} Completed</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-slate-900 dark:bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, type: 'spring' }}
              />
            </div>
          </div>

          <div className="space-y-2 flex-1">
            <AnimatePresence>
              {tasks.map(task => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  role="button" tabIndex={0} aria-label={`Toggle task ${task.title}`} onKeyDown={(e) => e.key === "Enter" && toggleTask(task.id)} className={`group/item flex items-center focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white outline-none gap-3 p-3 rounded-[16px] border cursor-pointer transition-all duration-300 ${
                    task.completed 
                      ? 'bg-slate-50/80 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/40 text-slate-400 dark:text-slate-500 line-through' 
                      : 'bg-white dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm text-slate-800 dark:text-slate-200'
                  }`}
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="flex-shrink-0 relative flex items-center justify-center w-5 h-5">
                    {task.completed ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 rounded-full p-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.div>
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors" />
                    )}
                  </div>
                  <span className="text-sm font-semibold truncate select-none flex-1 min-w-0">{task.title}</span>
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
          <p className="text-sm font-medium text-slate-500">You're all caught up!</p>
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
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full group">
      {/* Subtle glow background */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors duration-500" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-500" />
      
      <div>
        <div className="flex items-center gap-2 mb-4 relative z-10">
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">AI Insights</h3>
        </div>

        <div className="space-y-3 relative z-10">
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            You struggled with <strong className="text-slate-900 dark:text-white font-extrabold relative inline-block">Mitochondria
              <svg className="absolute -bottom-1 left-0 w-full h-1 text-slate-400 dark:text-slate-500" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0,5 Q50,10 100,5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </strong> yesterday.
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
            Want to take a quick 5-min refresher quiz?
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3 relative z-10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-[16px] text-sm font-bold shadow-md shadow-slate-900/20 dark:shadow-white/20 transition-all duration-300 cursor-pointer group/btn"
        >
          <span>Start Quiz</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </motion.button>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold text-center uppercase tracking-wider">
          Personalized for you
        </p>
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
  setActiveTab
}: { 
  workspaces?: Workspace[],
  setActiveWorkspace?: (workspace: Workspace | null) => void,
  setActiveTab?: (tab: string) => void
}) {
  // Aggregate all files from all workspaces
  const allFiles = workspaces.flatMap(w => w.files ? w.files.map(f => ({ ...f, workspaceId: w.id })) : []);
  // Sort files by upload date descending
  allFiles.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  // Take top 3 recent files
  const recentFiles = allFiles.slice(0, 3);

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-24 bg-gradient-to-bl from-slate-50 to-transparent dark:from-slate-800/30 rounded-bl-[64px] -z-10 transition-transform duration-500 group-hover:scale-105" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Recent Study Materials</h3>
        <button 
          onClick={() => setActiveTab && setActiveTab('workspaces')}
          className="text-xs text-slate-600 dark:text-slate-400 font-bold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>
      
      {recentFiles.length > 0 ? (
        <div className="space-y-3 flex-1">
          {recentFiles.map((file) => {
            const { icon: Icon, color, bg } = getFileStyle(file.type);
            return (
              <div 
                key={file.id} 
                onClick={() => handleOpenFile(file.workspaceId)}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-[16px] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50 group/item gap-3 sm:gap-2 cursor-pointer min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
                    <Icon className="w-5 h-5 group-hover/item:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">{file.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{file.type}</p>
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
                  <span>Generate Quiz</span>
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
          <p className="text-sm font-medium text-slate-500">No recent materials.</p>
        </div>
      )}
    </div>
  );
}
