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
  Brain
} from 'lucide-react';
import { TaskItem } from './types';

interface DashboardHomeProps {
  setActiveTab: (tab: string) => void;
}

export default function DashboardHome({ setActiveTab }: DashboardHomeProps) {
  // Local state for interactive tasks
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', title: 'Revise Mitochondria structure & Krebs Cycle', subject: 'Biology', priority: 'High', estimatedTime: '45m', completed: false },
    { id: '2', title: 'Solve 10 integration problems on parts', subject: 'Mathematics', priority: 'High', estimatedTime: '50m', completed: true },
    { id: '3', title: 'Write an essay draft on Shakespearian sonnets', subject: 'English', priority: 'Medium', estimatedTime: '30m', completed: false },
    { id: '4', title: 'Memorize Physics kinematic formulae', subject: 'Physics', priority: 'Low', estimatedTime: '20m', completed: false },
  ]);

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
                Welcome back, Alex
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
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded">75% Complete</span>
              </div>
              
              {/* Target rings list */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-text dark:text-white">Daily Focus Goal</span>
                  <span className="text-xs text-brand-primary dark:text-indigo-400 font-bold">45 / 60 mins</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-primary rounded-full" style={{ width: '75%' }} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-text dark:text-white">Quizzes Cleared</span>
                  <span className="text-xs text-brand-secondary dark:text-violet-400 font-bold">2 / 3 tasks</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-secondary rounded-full" style={{ width: '66.6%' }} />
                </div>
              </div>

              {/* Achievements Highlight */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="w-4.5 h-4.5 text-yellow-600 dark:text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-text dark:text-white">Weekly Streak Secured</p>
                  <p className="text-[10px] text-brand-text-light dark:text-slate-400">Earned +100 XP today</p>
                </div>
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

                  <div className="grid grid-cols-3 gap-3">
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
              {/* Card 1 */}
              <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/10 flex flex-col justify-between h-44 text-left">
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">AP Chemistry</span>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 2h left
                    </span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">Chemical Kinetics & Rate Laws</h4>
                  <p className="text-xs text-slate-400 font-medium line-clamp-1">Module 4 • Lesson 3 of 8</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-indigo-600 dark:text-indigo-400">62%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '62%' }} />
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('ai-tutor')}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Resume Lesson
                </button>
              </div>

              {/* Card 2 */}
              <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/10 flex flex-col justify-between h-44 text-left">
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400 tracking-wider">AP Physics 1</span>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 45m left
                    </span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mt-1 line-clamp-1">Rotational Dynamics & Torque</h4>
                  <p className="text-xs text-slate-400 font-medium line-clamp-1">Module 5 • Lesson 6 of 10</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-violet-600 dark:text-violet-400">80%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: '80%' }} />
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('ai-tutor')}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Resume Lesson
                </button>
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
              {/* Insight 1 */}
              <div className="p-3.5 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400 mb-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Topic Weakness Detected</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Your last Math quiz on <strong>Differential Equations</strong> scored 64%. Revise using flashcards before taking the exam.
                </p>
                <button
                  onClick={() => setActiveTab('flashcards')}
                  className="mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Open math flashcards &rarr;
                </button>
              </div>

              {/* Insight 2 */}
              <div className="p-3.5 rounded-xl bg-violet-500/5 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-900/40 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-violet-700 dark:text-violet-400 mb-1.5">
                  <Star className="w-4 h-4" />
                  <span>Streak Multiplier Live</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Clear 1 more biology homework module today to earn <strong>Double Study Coins (+50 XP)</strong>. Keep the streak hot!
                </p>
                <button
                  onClick={() => setActiveTab('quiz-center')}
                  className="mt-2 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
                >
                  Start biology quiz &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* EXAM COUNTDOWN WIDGET */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4">Exam Countdown</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">AP Calculus AB Exam</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Focus: Limit Theorems, Integrals</p>
                </div>
                <div className="text-right">
                  <span className="block font-black text-rose-500 text-lg leading-none">24</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Days left</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">AP Biology Finals</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Focus: Molecular genetics</p>
                </div>
                <div className="text-right">
                  <span className="block font-black text-amber-500 text-lg leading-none">38</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Days left</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
