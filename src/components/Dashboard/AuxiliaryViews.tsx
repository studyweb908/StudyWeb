import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  BookOpen, 
  FileText, 
  Network, 
  Library, 
  BarChart2, 
  Trophy, 
  ListOrdered, 
  User, 
  Users,
  Search,
  Plus,
  Sparkles,
  Download,
  Flame,
  Award,
  TrendingUp,
  Brain,
  AlertCircle,
  FileSpreadsheet,
  Check,
  CheckCircle,
  Heart,
  CalendarDays,
  Target,
  Settings,
  Clock,
  Wifi,
  WifiOff,
  Trash2,
  Save
} from 'lucide-react';
import { NoteItem, SubjectMetric } from './types';

// ==========================================
// 1. STUDY PLANNER VIEW
// ==========================================
export function StudyPlannerView() {
  const [plannerTasks, setPlannerTasks] = useState(() => {
    const saved = localStorage.getItem('studyweb_planner_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: '1', day: 'Monday', action: 'AP Calculus Practice Exam 2', hours: '2h', priority: 'High', completed: false },
      { id: '2', day: 'Tuesday', action: 'Biology Krebs cycle note synthesis', hours: '1.5h', priority: 'Medium', completed: true },
      { id: '3', day: 'Wednesday', action: 'Chemistry kinetics homework sheet', hours: '1h', priority: 'High', completed: false },
      { id: '4', day: 'Thursday', action: 'English Lit essay outline builder', hours: '45m', priority: 'Low', completed: false },
      { id: '5', day: 'Friday', action: 'Physics Rotational dynamics quiz review', hours: '2h', priority: 'High', completed: false },
    ];
  });

  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newAction, setNewAction] = useState('');
  const [newDay, setNewDay] = useState('Monday');
  const [newHours, setNewHours] = useState('1h');
  const [newPriority, setNewPriority] = useState('Medium');

  // Sync tasks
  React.useEffect(() => {
    localStorage.setItem('studyweb_planner_tasks', JSON.stringify(plannerTasks));
  }, [plannerTasks]);

  // Listen for Quick Action trigger
  React.useEffect(() => {
    const handleTriggerAddPlan = () => {
      setShowAddPlan(true);
    };
    window.addEventListener('studyweb_trigger_add_plan', handleTriggerAddPlan);
    return () => window.removeEventListener('studyweb_trigger_add_plan', handleTriggerAddPlan);
  }, []);

  const toggleTask = (id: string) => {
    setPlannerTasks(plannerTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      day: newDay,
      action: newAction,
      hours: newHours,
      priority: newPriority,
      completed: false
    };

    setPlannerTasks([...plannerTasks, newTask]);
    setNewAction('');
    setShowAddPlan(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5.5 h-5.5 text-indigo-500" />
            <span>Intelligent Study Planner</span>
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Your study timeline customized by AI for optimal spaced repetition</p>
        </div>
        
        <button
          onClick={() => setShowAddPlan(!showAddPlan)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      <AnimatePresence>
        {showAddPlan && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddTask}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 space-y-3.5 overflow-hidden text-xs"
          >
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Study Action Item</label>
              <input
                type="text"
                required
                placeholder="e.g. Solve AP Calculus derivatives worksheet"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Day</label>
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Study Hours</label>
                <input
                  type="text"
                  required
                  value={newHours}
                  onChange={(e) => setNewHours(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                  placeholder="e.g. 1.5h or 45m"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPlan(false)}
                className="px-3 py-1.5 rounded-lg border text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer hover:bg-indigo-700"
              >
                Add Study Task
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
          const tasksForDay = plannerTasks.filter(t => t.day === day);
          return (
            <div key={day} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">{day}</span>
              
              <div className="space-y-2">
                {tasksForDay.map((task) => (
                  <div 
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-2.5 rounded-lg border text-[11px] cursor-pointer transition-all ${
                      task.completed 
                        ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-100 dark:border-slate-850 text-slate-400 line-through' 
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-indigo-300 font-semibold'
                    }`}
                  >
                    <p className="leading-tight line-clamp-2">{task.action}</p>
                    <div className="flex justify-between items-center mt-2 text-[9px] text-slate-400 font-bold">
                      <span>{task.hours}</span>
                      <span className={task.priority === 'High' ? 'text-rose-500' : 'text-slate-400'}>{task.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 2. SUBJECTS OVERVIEW VIEW
// ==========================================
export function SubjectsView() {
  const [subjects] = useState<SubjectMetric[]>([
    { name: 'AP Calculus AB', progress: 84, studyHours: 32, averageScore: 88, weakTopics: ['Implicit Differentiation', 'Related Rates'], recommendedRevision: 'Limit Theorems' },
    { name: 'AP Biology', progress: 68, studyHours: 24, averageScore: 78, weakTopics: ['Krebs Cycle', 'Calvin Cycle'], recommendedRevision: 'Transcription Regulation' },
    { name: 'AP Chemistry', progress: 72, studyHours: 28, averageScore: 81, weakTopics: ['Rate Laws', 'Gibbs Free Energy'], recommendedRevision: 'Buffer Solutions' },
    { name: 'AP Physics 1', progress: 61, studyHours: 19, averageScore: 74, weakTopics: ['Torque & Equilibrium', 'Simple Harmonic Motion'], recommendedRevision: 'Moment of Inertia' },
    { name: 'Computer Science A', progress: 91, studyHours: 40, averageScore: 94, weakTopics: ['Recursion Trace', '2D Arrays'], recommendedRevision: 'Polymorphism' },
  ]);

  return (
    <div className="space-y-6 text-left text-xs sm:text-sm">
      <div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5.5 h-5.5 text-indigo-500" />
          <span>Subject Mastery Analytics</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Mastery profiles mapped directly to your AP curriculum parameters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((sub, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-extrabold text-base text-slate-800 dark:text-white leading-tight">{sub.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">AP Curriculum Track</p>
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                {sub.progress}% Mastery
              </span>
            </div>

            {/* Progress Gauge */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${sub.progress}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-slate-100 dark:border-slate-800 py-3 text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Study Time</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{sub.studyHours} hours total</p>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Avg Test Score</span>
                <p className="font-bold text-emerald-500 mt-0.5">{sub.averageScore}% accuracy</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] uppercase font-bold text-rose-500 tracking-wider block flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Weak Topics Detected:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sub.weakTopics.map((wt, wtIdx) => (
                  <span key={wtIdx} className="bg-rose-500/10 text-rose-500 text-[9.5px] font-semibold px-2 py-0.5 rounded">
                    {wt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 3. NOTES VIEW
// ==========================================
export function NotesView() {
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem('studyweb_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: '1', title: 'Cell Biology - Transcription Factors', subject: 'Biology', content: 'Transcription factors are proteins involved in the process of transcribing DNA into RNA. They contain one or more DNA-binding domains...', updatedAt: 'July 5, 2026', aiSummarized: true },
      { id: '2', title: 'Calculus - Shell Method vs Washer Method', subject: 'Mathematics', content: 'Washer method integrates perpendicular to axis of rotation: V = pi * integral[R(x)^2 - r(x)^2] dx. Shell method integrates parallel: V = 2pi * integral[r(y)*h(y)] dy...', updatedAt: 'July 4, 2026', aiSummarized: false },
      { id: '3', title: 'Organic Chem - Nucleophilic Substitutions', subject: 'Chemistry', content: 'SN1 reactions are multi-step mechanisms involving carbocation intermediates. Rate is dependent solely on substrate. SN2 reactions are single concert steps...', updatedAt: 'July 2, 2026', aiSummarized: true },
    ];
  });

  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // Connection and Storage status states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectivelyOffline = !isOnline || simulateOffline;

  // Initialize selectedNote and sync with changes
  React.useEffect(() => {
    if (notes.length > 0) {
      const savedSelectedId = localStorage.getItem('studyweb_selected_note_id');
      const found = notes.find(n => n.id === savedSelectedId);
      setSelectedNote(found || notes[0]);
    } else {
      setSelectedNote(null);
    }
  }, [notes]);

  // Persist notes and trigger simulated "saving" states
  React.useEffect(() => {
    setSaveStatus(effectivelyOffline ? 'offline' : 'saving');
    localStorage.setItem('studyweb_notes', JSON.stringify(notes));
    
    const timer = setTimeout(() => {
      setSaveStatus(effectivelyOffline ? 'offline' : 'saved');
    }, 500);

    return () => clearTimeout(timer);
  }, [notes, effectivelyOffline]);

  // Handle custom events
  React.useEffect(() => {
    const handleNotesUpdate = () => {
      const saved = localStorage.getItem('studyweb_notes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNotes(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener('studyweb_notes_updated', handleNotesUpdate);
    return () => window.removeEventListener('studyweb_notes_updated', handleNotesUpdate);
  }, []);

  const handleAiSummarize = () => {
    if (!selectedNote) return;
    
    if (effectivelyOffline) {
      alert('⚠️ Offline Mode is Active! AI Summarization requires an active internet connection. Your local draft has been safely saved in localStorage and is ready for AI compilation once you reconnect.');
      return;
    }

    setNotes(notes.map(n => n.id === selectedNote.id ? { ...n, aiSummarized: true, content: n.content + '\n\n=== AI SYNTHESIZED BULLET POINTS ===\n- Transcription factors bind directly to enhancers or promoters.\n- Essential for eukaryotic cell regulation and differentiation.\n- Verified with AP biology syllabus guidelines.' } : n));
    alert('✨ AI successfully expanded and summarized the selected note!');
  };

  const handleCreateNote = () => {
    const newNote: NoteItem = {
      id: Date.now().toString(),
      title: 'Untitled Study Note',
      subject: 'General Study',
      content: 'Start drafting your study note here...\nAll edits are instantly saved locally in offline storage.',
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      aiSummarized: false
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setSelectedNote(newNote);
    localStorage.setItem('studyweb_selected_note_id', newNote.id);
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = notes.filter(n => n.id !== id);
    setNotes(remaining);
    if (selectedNote?.id === id) {
      setSelectedNote(remaining[0] || null);
      if (remaining[0]) {
        localStorage.setItem('studyweb_selected_note_id', remaining[0].id);
      } else {
        localStorage.removeItem('studyweb_selected_note_id');
      }
    }
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.subject.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5.5 h-5.5 text-indigo-500" />
            <span>AI Notes Repository</span>
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Draft notes with complete offline storage protection</p>
        </div>

        {/* Offline & Connection Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Simulated Offline Toggle */}
          <button
            onClick={() => setSimulateOffline(!simulateOffline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              simulateOffline 
                ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            }`}
            title="Toggle offline simulation to test local caching and offline capabilities"
          >
            {simulateOffline ? <WifiOff className="w-3.5 h-3.5 text-rose-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{simulateOffline ? 'Disable Simulation' : 'Simulate Offline'}</span>
          </button>

          {/* Search */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-850 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Offline Status Warning Bar */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
        effectivelyOffline 
          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 text-amber-800 dark:text-amber-300' 
          : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
      }`}>
        <div className="flex items-center gap-2.5 font-semibold">
          <div className={`w-2 h-2 rounded-full ${effectivelyOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          <p>
            {effectivelyOffline 
              ? 'Offline Mode Active — Notes are stored locally in your browser cache and accessible without an internet connection.' 
              : 'Online Mode Active — Application shell pre-cached via Service Worker. Changes instantly saved to local storage.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-white/60 dark:bg-slate-800/40 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase">
            {saveStatus === 'saved' && '✓ Synced'}
            {saveStatus === 'saving' && '⚡ Saving...'}
            {saveStatus === 'offline' && '✓ Saved Locally'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px]">
        {/* Left Column: List */}
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col bg-slate-50/50 dark:bg-slate-950/20 p-2.5 h-full">
          <button
            onClick={handleCreateNote}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Note</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    setSelectedNote(note);
                    localStorage.setItem('studyweb_selected_note_id', note.id);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-start group ${
                    selectedNote?.id === note.id
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white dark:bg-slate-800 border-slate-150/80 dark:border-slate-850 hover:bg-slate-100/60 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-xs truncate text-left">{note.title || 'Untitled Note'}</p>
                    <div className="flex justify-between text-[10px] opacity-75 mt-2 font-medium">
                      <span>{note.subject}</span>
                      <span>{note.updatedAt}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className={`p-1 rounded hover:bg-rose-500 hover:text-white transition-all focus:outline-none ${
                      selectedNote?.id === note.id 
                        ? 'text-white/80 group-hover:block hidden' 
                        : 'text-slate-400 dark:text-slate-500 group-hover:block hidden'
                    }`}
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 text-xs py-8">No notes found.</p>
            )}
          </div>
        </div>

        {/* Right Column: Note detail editor */}
        <div className="lg:col-span-2 border border-slate-150 dark:border-slate-850 rounded-xl p-5 bg-white dark:bg-slate-900 flex flex-col justify-between h-full overflow-hidden">
          {selectedNote ? (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex-1 min-w-0 w-full space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedNote.title}
                      onChange={(e) => {
                        const updatedTitle = e.target.value;
                        setNotes(notes.map(n => n.id === selectedNote.id ? { 
                          ...n, 
                          title: updatedTitle,
                          updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        } : n));
                      }}
                      placeholder="Note Title"
                      className="w-full font-extrabold text-base text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none py-0.5 px-1 rounded transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase text-left">
                    <span>Subject:</span>
                    <input
                      type="text"
                      value={selectedNote.subject}
                      onChange={(e) => {
                        const updatedSub = e.target.value;
                        setNotes(notes.map(n => n.id === selectedNote.id ? { 
                          ...n, 
                          subject: updatedSub,
                          updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        } : n));
                      }}
                      placeholder="Subject (e.g. Biology)"
                      className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none py-0.5 px-1 rounded transition-colors font-extrabold"
                    />
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>Last updated {selectedNote.updatedAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <button
                    onClick={handleAiSummarize}
                    className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                      effectivelyOffline
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                        : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300'
                    }`}
                    title={effectivelyOffline ? "AI summary requires internet connection" : "Let AI summarize your draft"}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Summarize</span>
                  </button>
                </div>
              </div>

              <textarea
                value={selectedNote.content}
                onChange={(e) => {
                  const updatedText = e.target.value;
                  setNotes(notes.map(n => n.id === selectedNote.id ? { 
                    ...n, 
                    content: updatedText,
                    updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  } : n));
                }}
                placeholder="Write your notes here..."
                className="flex-1 w-full text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 rounded-lg border border-slate-150 dark:border-slate-800 leading-relaxed focus:outline-none resize-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-24 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300" />
              <p className="text-slate-400 text-xs">Select a note from the left panel to begin editing or click the button to create one.</p>
              <button
                onClick={handleCreateNote}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Create Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. MIND MAPS VIEW
// ==========================================
export function MindMapsView() {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-6">
      <div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Network className="w-5.5 h-5.5 text-indigo-500" />
          <span>Interactive AI Mind Map Canvas</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Visual conceptual maps generated dynamically from notes</p>
      </div>

      <div className="relative w-full h-[400px] border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 rounded-2xl overflow-hidden flex items-center justify-center">
        
        {/* Interactive SVG Nodes */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Main lines */}
          <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#4F46E5" strokeWidth="2.5" strokeDasharray="5,5" />
          <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="#4F46E5" strokeWidth="2.5" strokeDasharray="5,5" />
          <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="#4F46E5" strokeWidth="2.5" strokeDasharray="5,5" />
        </svg>

        {/* Central Core Node */}
        <div 
          onClick={() => setExpandedNode('root')}
          className="absolute z-10 p-5 rounded-2xl bg-indigo-600 text-white font-extrabold shadow-lg shadow-indigo-600/30 text-center cursor-pointer hover:scale-105 transition-transform"
        >
          <Brain className="w-5 h-5 mx-auto mb-1" />
          <p className="text-xs">Cell Biology</p>
          <span className="block text-[9px] opacity-75 font-bold uppercase tracking-wider">AP Target 1</span>
        </div>

        {/* Secondary Node Left */}
        <div 
          onClick={() => setExpandedNode('glycolysis')}
          className="absolute left-[15%] top-[15%] z-10 p-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold border border-indigo-500/20 text-center cursor-pointer hover:scale-105 transition-transform"
        >
          <p className="text-xs text-indigo-400">Glycolysis</p>
          <span className="block text-[8px] text-slate-400">Yields: 2 ATP, 2 NADH</span>
        </div>

        {/* Secondary Node Right */}
        <div 
          onClick={() => setExpandedNode('transcription')}
          className="absolute right-[15%] top-[15%] z-10 p-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold border border-indigo-500/20 text-center cursor-pointer hover:scale-105 transition-transform"
        >
          <p className="text-xs text-violet-400">Transcription</p>
          <span className="block text-[8px] text-slate-400">Inside Nucleus</span>
        </div>

        {/* Secondary Node Bottom */}
        <div 
          onClick={() => setExpandedNode('mitochondria')}
          className="absolute bottom-[10%] z-10 p-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold border border-indigo-500/20 text-center cursor-pointer hover:scale-105 transition-transform"
        >
          <p className="text-xs text-emerald-400">Mitochondria</p>
          <span className="block text-[8px] text-slate-400">ETC Generator</span>
        </div>

        {/* Detail Panel Popup */}
        <AnimatePresence>
          {expandedNode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 right-4 max-w-xs p-4 bg-white dark:bg-slate-900 border border-indigo-500/30 rounded-xl shadow-xl space-y-2 text-xs"
            >
              <div className="flex justify-between items-center pb-1.5 border-b font-extrabold text-slate-800 dark:text-white uppercase">
                <span>AI Core definition</span>
                <button onClick={() => setExpandedNode(null)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                {expandedNode === 'root' && "General cellular mechanics outlining biosynthesis pathways and Krebs synthesis structures."}
                {expandedNode === 'glycolysis' && "The chemical breakdown of glucose into pyruvic acid, occurring anaerobic inside human muscle structures."}
                {expandedNode === 'transcription' && "The biological process by which chemical DNA code sequences are replicated into RNA copies by polymerase catalysts."}
                {expandedNode === 'mitochondria' && "ATP Synthesis factory responsible for active phosphorylation and energy surge cycles."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==========================================
// 5. RESOURCES LIBRARY VIEW
// ==========================================
export function ResourcesView() {
  const materials = [
    { title: 'AP Chemistry formula quicksheet', type: 'PDF Document', size: '2.1 MB' },
    { title: 'Biology Chapter 4 Study guide', type: 'EPUB Ebook', size: '4.8 MB' },
    { title: 'Calculus previous year solved exams', type: 'PDF Document', size: '8.4 MB' },
    { title: 'Physics rotational kinematics cheat sheet', type: 'Markdown Text', size: '45 KB' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-6">
      <div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Library className="w-5.5 h-5.5 text-indigo-500" />
          <span>Syllabus Reference Library</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Curated textbooks, past papers, and previous year answers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materials.map((mat, idx) => (
          <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-all bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 dark:text-white truncate">{mat.title}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{mat.type} • {mat.size}</p>
              </div>
            </div>

            <button 
              onClick={() => alert('📥 Material download started successfully.')}
              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Download className="w-4.5 h-4.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 6. ANALYTICS VIEW
// ==========================================
export function AnalyticsView() {
  return (
    <div className="space-y-6 text-left text-xs sm:text-sm">
      <div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart2 className="w-5.5 h-5.5 text-indigo-500" />
          <span>Interactive Study Analytics</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Real-time metrics measuring focus, accuracy, and syllabus pacing</p>
      </div>

      {/* Grid of micro cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Weekly Focus</span>
          <p className="font-black text-2xl text-slate-900 dark:text-white mt-1">14.5 hrs</p>
          <span className="text-[10px] text-emerald-500 font-bold mt-1 block">&uarr; 15% from last week</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quiz Accuracy</span>
          <p className="font-black text-2xl text-slate-900 dark:text-white mt-1">82.4%</p>
          <span className="text-[10px] text-emerald-500 font-bold mt-1 block">&uarr; 2.1% from last week</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Coins Acquired</span>
          <p className="font-black text-2xl text-slate-900 dark:text-white mt-1">420</p>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Level 12 Scholar status</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pacing Rank</span>
          <p className="font-black text-2xl text-slate-900 dark:text-white mt-1">AP Top 5%</p>
          <span className="text-[10px] text-indigo-500 font-bold mt-1 block">Excellent consistency</span>
        </div>
      </div>

      {/* SVG graph representation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly hours */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 space-y-4 shadow-sm">
          <p className="font-bold text-slate-800 dark:text-white">Weekly Focus Time Distribution</p>
          <div className="h-44 flex items-end justify-between gap-2.5 pt-4 border-b border-l border-slate-100 dark:border-slate-800 pl-4 pb-2">
            {[
              { day: 'Mon', h: '2.5h', pct: 60 },
              { day: 'Tue', h: '3.0h', pct: 75 },
              { day: 'Wed', h: '1.5h', pct: 40 },
              { day: 'Thu', h: '4.2h', pct: 100 },
              { day: 'Fri', h: '2.1h', pct: 55 },
              { day: 'Sat', h: '1.2h', pct: 30 },
              { day: 'Sun', h: '0.0h', pct: 0 }
            ].map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{d.h}</span>
                <div 
                  className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t-md transition-all duration-500"
                  style={{ height: `${d.pct}%` }}
                />
                <span className="text-[10px] text-slate-400 font-bold">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Consistency Calendar Heatmap */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-5 space-y-4 shadow-sm">
          <p className="font-bold text-slate-800 dark:text-white">Active Studying Streak Heatmap</p>
          <div className="grid grid-cols-7 gap-2 pt-2">
            {Array.from({ length: 28 }).map((_, i) => {
              // Custom gradient color mapping
              let bg = "bg-slate-100 dark:bg-slate-800";
              if (i % 4 === 1) bg = "bg-indigo-300 dark:bg-indigo-900/60";
              if (i % 4 === 2) bg = "bg-indigo-500 dark:bg-indigo-700";
              if (i % 4 === 3) bg = "bg-indigo-600 dark:bg-indigo-600";
              
              return (
                <div 
                  key={i} 
                  className={`w-full aspect-square rounded-md ${bg} hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer`}
                  title={`Day ${i+1}: Active focus recorded`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold pt-2">
            <span>Less Focus</span>
            <span>Highly Locked-In</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. ACHIEVEMENTS VIEW
// ==========================================
export function AchievementsView() {
  const badges = [
    { title: '7 Day Streak', desc: 'Secure an active study cycle for 7 consecutive days.', icon: <Flame className="w-5 h-5 text-amber-500" />, unlocked: true },
    { title: 'Quiz Master', desc: 'Answer 10 consecutive quiz questions without single error.', icon: <Trophy className="w-5 h-5 text-yellow-500" />, unlocked: true },
    { title: 'AI Pathfinder', desc: 'Complete 15 custom chats with the advanced AI Tutor.', icon: <Sparkles className="w-5 h-5 text-indigo-500" />, unlocked: true },
    { title: 'Night Owl', desc: 'Log study hours after midnight on multiple days.', icon: <Award className="w-5 h-5 text-violet-500" />, unlocked: false },
    { title: 'Bookworm', desc: 'Read and extract formulas from 5 custom PDF notebooks.', icon: <BookOpen className="w-5 h-5 text-emerald-500" />, unlocked: false },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-6">
      <div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-5.5 h-5.5 text-yellow-500 animate-bounce" />
          <span>My Achievements & Badges</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Collect points, level up, and unlock secret study perks</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {badges.map((b, idx) => (
          <div 
            key={idx} 
            className={`p-4 rounded-xl border flex items-start gap-4 transition-all hover:-translate-y-1 ${
              b.unlocked 
                ? 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-150 dark:border-slate-800' 
                : 'bg-slate-100/40 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900 opacity-60'
            }`}
          >
            <div className={`p-3 rounded-lg flex-shrink-0 ${b.unlocked ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-200'}`}>
              {b.icon}
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <span>{b.title}</span>
                {b.unlocked && <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />}
              </p>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">{b.desc}</p>
              <span className="text-[9px] font-bold block mt-3 uppercase tracking-wide">
                {b.unlocked ? <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Unlocked</span> : <span className="text-slate-400">Locked</span>}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 8. LEADERBOARD VIEW
// ==========================================
export function LeaderboardView() {
  const [activeSubTab, setActiveSubTab] = useState<'School' | 'Global' | 'Friends'>('School');

  const rankData = [
    { rank: 1, name: 'Siddharth Patel', score: '3,840 XP', coins: 1400, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' },
    { rank: 2, name: 'Emily Chen', score: '3,120 XP', coins: 950, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
    { rank: 3, name: 'Tariq Malik', score: '2,900 XP', coins: 820, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
    { rank: 4, name: 'Alex Johnson (You)', score: '2,420 XP', coins: 420, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100', active: true },
    { rank: 5, name: 'Sophie Dubois', score: '1,980 XP', coins: 380, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <ListOrdered className="w-5.5 h-5.5 text-indigo-500" />
            <span>Scholar Leaderboard</span>
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Compete with friends, school cohorts, or global AP students</p>
        </div>

        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border">
          {['School', 'Global', 'Friends'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === tab 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rankData.map((student) => (
          <div 
            key={student.rank}
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              student.active 
                ? 'bg-indigo-500/10 border-indigo-200' 
                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-850'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <span className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs ${
                student.rank === 1 ? 'bg-amber-500/10 text-amber-600' : student.rank === 2 ? 'bg-slate-300 text-slate-600' : 'text-slate-400'
              }`}>
                #{student.rank}
              </span>
              <img
                src={student.avatar}
                alt={student.name}
                className="w-8 h-8 rounded-full border object-cover"
              />
              <span className="font-bold text-slate-800 dark:text-white">{student.name}</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-indigo-600 dark:text-indigo-400">{student.score}</span>
              <span className="text-slate-400 font-semibold">{student.coins} Coins</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 9. PROFILE VIEW
// ==========================================
interface ProfileViewProps {
  sessionTimeout: number;
  setSessionTimeout: (timeout: number) => void;
}

export function ProfileView({ sessionTimeout, setSessionTimeout }: ProfileViewProps) {
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'preferences'>('overview');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <img
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
          alt="Alex Avatar"
          className="w-16 h-16 rounded-2xl border object-cover shadow"
        />
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Alex Johnson</h3>
          <p className="text-xs text-slate-400 font-semibold">Grade 11 Honors Scholar • AP Board Coordinator</p>
          <span className="inline-block mt-1.5 text-[9px] bg-indigo-500/10 text-indigo-500 font-bold px-2 py-0.5 rounded">Premium Plan Active</span>
        </div>
      </div>

      {/* Profile Inner Tabs */}
      <div className="flex gap-6 border-b border-slate-100 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveProfileTab('overview')}
          className={`pb-3 px-1 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 focus:outline-none ${
            activeProfileTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile Overview</span>
        </button>
        <button
          onClick={() => setActiveProfileTab('preferences')}
          className={`pb-3 px-1 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 focus:outline-none ${
            activeProfileTab === 'preferences'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Account Preferences</span>
        </button>
      </div>

      {activeProfileTab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="font-bold text-slate-800 dark:text-white">Core Account Details</p>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Email address</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">studyweb908@gmail.com</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Syllabus Class Board</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">Advanced Placement AP US Curriculum</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Study Goal Target</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">60 minutes focus sessions daily</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="font-bold text-slate-800 dark:text-white">Study Preferences Mode</p>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">AI Learning Voice Style</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">Calm Academic Tutor voice</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cognitive Learning Style</span>
                <p className="font-bold text-indigo-600">Visual & Active Spaced Recall</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-base text-slate-800 dark:text-white">Secure Session Auto-Logout</h4>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Protect your account by automatically ending your session after a period of inactivity.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Short Test (30s)", value: 30, desc: "Warns at 15s. Ideal for testing session expiry quickly." },
              { label: "Standard (60s)", value: 60, desc: "Warns at 30s. Balance between protection and utility." },
              { label: "Relaxed (5m / 300s)", value: 300, desc: "Warns at 150s. Suitable for continuous study." }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSessionTimeout(option.value)}
                className={`p-5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between focus:outline-none ${
                  sessionTimeout === option.value
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-lg shadow-indigo-600/10'
                    : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-800'
                }`}
              >
                <div className="space-y-1">
                  <p className={`font-black text-xs uppercase tracking-wide ${sessionTimeout === option.value ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {option.label}
                  </p>
                  <p className="font-bold text-sm tracking-tight leading-tight mt-1">{option.value} Seconds Inactivity</p>
                </div>
                <p className={`text-[10px] mt-4 leading-relaxed ${sessionTimeout === option.value ? 'text-indigo-100 opacity-90' : 'text-slate-400'}`}>
                  {option.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Timing Parameters Details Card */}
          <div className="bg-slate-50 dark:bg-slate-950/80 rounded-2xl p-5 border border-slate-150 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              <p className="font-bold text-sm text-slate-800 dark:text-white">Active Session Config Details</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Session Timeout</span>
                <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{sessionTimeout} seconds</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">If no activity is detected, you will be automatically logged out.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-[10px] uppercase font-bold text-slate-400">Warning Trigger</span>
                <p className="text-sm font-black text-amber-500 dark:text-amber-400 mt-0.5">{Math.round(sessionTimeout / 2)} seconds</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">A modal will prompt you to extend the session after this point.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 10. PARENT DASHBOARD LINK LINK
// ==========================================
export function ParentDashboardView() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5.5 h-5.5 text-indigo-500 animate-pulse" />
            <span>Parent Tracking Console Link</span>
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Let parents view curriculum metrics, study times, and download reports</p>
        </div>

        <button
          onClick={() => {
            alert('📥 Generating StudyWeb monthly scholar report PDF...');
            setTimeout(() => {
              alert('✅ PDF Study Report generated! Saved to local downloads.');
            }, 1000);
          }}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow"
        >
          <Download className="w-4 h-4" />
          <span>Download PDF Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50/50 dark:bg-slate-850 p-4 rounded-xl border space-y-2">
          <p className="font-bold text-slate-800 dark:text-white">Monthly Active Studying</p>
          <p className="text-3xl font-black text-indigo-600">58.4 Hours</p>
          <p className="text-[10px] text-slate-400">Class average: 42 hours</p>
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-850 p-4 rounded-xl border space-y-2">
          <p className="font-bold text-slate-800 dark:text-white">Active Quiz Pass Rate</p>
          <p className="text-3xl font-black text-emerald-500">86.2%</p>
          <p className="text-[10px] text-slate-400">Target goal is AP standard 80%</p>
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-850 p-4 rounded-xl border space-y-2">
          <p className="font-bold text-slate-800 dark:text-white">Strongest Area</p>
          <p className="text-3xl font-black text-indigo-500">AP Biology</p>
          <p className="text-[10px] text-slate-400">Syllabus pacing is ahead by 12 days</p>
        </div>
      </div>

      {/* Parental message board */}
      <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/10 space-y-3.5">
        <p className="font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
          <Sparkles className="w-4.5 h-4.5" /> Latest Parent Feedback Note:
        </p>
        <blockquote className="italic text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
          "Alex is showing fantastic focus during the evening Pomodoro sessions. The AI study partner explanations are really helping build confidence on those difficult AP biology molecular structures."
        </blockquote>
        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">— Parent Review Log • Updated 2 days ago</span>
      </div>
    </div>
  );
}
