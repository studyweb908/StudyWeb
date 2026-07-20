import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Flame, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  BookOpen, 
  AlertCircle, 
  TrendingUp, 
  Trophy, 
  Star,
  ChevronRight,
  Brain,
  FileText,
  FileEdit
} from 'lucide-react';
import { TaskItem } from './types';

interface DashboardHomeProps {
  setActiveTab: (tab: string) => void;
}

export default function DashboardHome({ setActiveTab }: DashboardHomeProps) {
  // Local state for interactive tasks
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Biology');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskTime, setNewTaskTime] = useState('30m');
  const [showAddTask, setShowAddTask] = useState(false);

  // Stats
  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: Date.now().toString(),
      title: newTaskTitle,
      subject: newTaskSubject,
      priority: newTaskPriority,
      estimatedTime: newTaskTime,
      completed: false
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ================= HERO CARD ================= */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-brand-primary via-indigo-600 to-brand-secondary p-[1px] shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative bg-white dark:bg-slate-900/95 backdrop-blur-3xl px-6 py-8 md:p-10 rounded-[27px] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-5 max-w-xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary dark:bg-indigo-500/10 dark:text-indigo-400 text-xs font-bold border border-brand-primary/20">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Smart Study Space Active</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-brand-text dark:text-white tracking-tight font-display leading-tight">
                Good Morning 👋 <br />
                Welcome back!
              </h1>
              <p className="text-sm md:text-base text-brand-text-light dark:text-slate-300 leading-relaxed font-medium">
                "Small daily improvements over time lead to stunning academic results." Your AI Tutor analyzed your math homework. Ready to crush your AP targets?
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                onClick={() => setActiveTab('ai-tutor')}
                className="px-5 py-3 rounded-xl bg-brand-primary hover:bg-brand-secondary text-white text-xs sm:text-sm font-bold transition-all shadow-xl shadow-brand-primary/30 hover:shadow-brand-secondary/40 hover:-translate-y-0.5 flex items-center gap-2 group cursor-pointer"
              >
                <span>Ask AI Tutor Anything</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setActiveTab('study-session')}
                className="px-5 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-brand-text dark:text-slate-200 text-xs sm:text-sm font-bold transition-all border border-slate-200 dark:border-slate-700/60 hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-brand-primary dark:text-slate-400 animate-spin-slow" />
                <span>Start Focus Pomodoro</span>
              </button>
            </div>
          </div>

          {/* Graphical Representation Card */}
          <div className="relative w-full max-w-[280px] md:max-w-xs flex-shrink-0">
            <div className="relative rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 p-5 space-y-4 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-brand-text-light dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Today's Target</span>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-bold bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded">0% Complete</span>
              </div>
              
              {/* Target rings list */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-text dark:text-white">Daily Focus Goal</span>
                  <span className="text-xs text-slate-500 font-bold">0 / 60 mins</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 dark:bg-slate-600 rounded-full" style={{ width: '0%' }} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-text dark:text-white">Quizzes Cleared</span>
                  <span className="text-xs text-slate-500 font-bold">0 tasks</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 dark:bg-slate-600 rounded-full" style={{ width: '0%' }} />
                </div>
              </div>

              {/* Achievements Highlight */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <p className="text-[10px] text-brand-text-light dark:text-slate-400">Start studying to unlock achievements!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= DUAL GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        {/* Left Column: Tasks and Progress */}
        <div className="lg:col-span-2 space-y-8">
          {/* TODAY'S PLAN SECTION */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Today's Study Plan</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Focus items selected for active recall</p>
              </div>
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 mb-6 flex items-center gap-4">
              <div className="relative w-12 h-12 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" fill="transparent" stroke="#E2E8F0" strokeWidth="4" className="dark:stroke-slate-700" />
                  <circle cx="24" cy="24" r="20" fill="transparent" stroke="#4F46E5" strokeWidth="4" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * progressPercent) / 100} className="transition-all duration-500 ease-out" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                  {progressPercent}%
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Daily Goal Progress</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{completedCount} of {tasks.length} actions complete</p>
              </div>
            </div>

            {/* Dynamic Add Task Form */}
            <AnimatePresence>
              {showAddTask && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddTask}
                  className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 space-y-3 overflow-hidden text-xs"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Task Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Read Physics Chapter 4..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                      <select
                        value={newTaskSubject}
                        onChange={(e) => setNewTaskSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                      >
                        <option>Biology</option>
                        <option>Mathematics</option>
                        <option>Physics</option>
                        <option>Chemistry</option>
                        <option>English</option>
                        <option>Computer Science</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                      >
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Est. Time</label>
                      <input
                        type="text"
                        placeholder="e.g. 30m"
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddTask(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow"
                    >
                      Add to Plan
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Task Checklist Items */}
            <div className="space-y-3">
              {tasks.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No tasks added yet. Start planning!</p>
                </div>
              )}
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                    task.completed
                      ? 'bg-slate-50/60 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800/40 text-slate-400 dark:text-slate-500 line-through'
                      : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/60 hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex-shrink-0">
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700 hover:text-indigo-400" />
                      )}
                    </span>
                    <div className="text-left min-w-0">
                      <p className={`text-xs sm:text-sm font-semibold truncate ${task.completed ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                          {task.subject}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          task.priority === 'High' 
                            ? 'bg-rose-500/10 text-rose-500' 
                            : task.priority === 'Medium'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {task.priority} Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-medium">{task.estimatedTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CONTINUE LEARNING SECTION */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Continue Learning</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Resume your ongoing course modules</p>
              </div>
              <button 
                onClick={() => setActiveTab('subjects')}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
              >
                <span>View all subjects</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 text-center py-8">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No active courses. Add a subject to start learning!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Recommendations and Deadlines */}
        <div className="space-y-8">
          {/* AI COACH INSIGHTS / COGNITIVE ANALYSIS */}
          <div className="bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">AI Copilot Recommendations</h3>
            </div>

            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Take some quizzes or use flashcards to get personalized AI study recommendations.</p>
              </div>
            </div>
          </div>

          {/* EXAM COUNTDOWN WIDGET */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4">Exam Countdown</h3>
            
            <div className="space-y-4">
              <div className="text-center py-6">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No upcoming exams tracked.</p>
              </div>
            </div>
          </div>
          {/* RECENT DOCUMENTS */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Recent Documents</h3>
              <button 
                onClick={() => setActiveTab('notes')}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                View All
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="text-center py-6">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No recent documents.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
