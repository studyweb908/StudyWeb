import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Calendar, 
  FileText, 
  BrainCircuit, 
  BarChart3, 
  Library, 
  Zap, 
  Target, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Trophy,
  ArrowRight,
  Check,
  ChevronRight,
  BookOpen,
  Send,
  HelpCircle,
  FolderOpen,
  CheckSquare
} from 'lucide-react';

export default function ForStudents() {
  const [activeTab, setActiveTab] = useState(0);

  // For AI Copilot Mockup
  const [aiChatTopic, setAiChatTopic] = useState<'photosynthesis' | 'calculus' | 'history'>('photosynthesis');
  
  // For Planner Mockup
  const [todoTasks, setTodoTasks] = useState([
    { id: 1, text: "Revise Bio Chapter 4", checked: true, subject: "Biology" },
    { id: 2, text: "Solve 5 Integration limit problems", checked: false, subject: "Math" },
    { id: 3, text: "Draft History essay outline", checked: false, subject: "History" }
  ]);
  const completedCount = todoTasks.filter(t => t.checked).length;
  const progressPercent = Math.round((completedCount / todoTasks.length) * 100);

  // For Recall Mockup
  const [flashCardFlipped, setFlashCardFlipped] = useState(false);
  const [flashCardIndex, setFlashCardIndex] = useState(0);
  const flashCards = [
    { q: "What is Mitochondria's primary function in a cell?", a: "To generate ATP (adenosine triphosphate) which acts as the cell's main energy source through cellular respiration." },
    { q: "What does Newton's Third Law of Motion state?", a: "For every action, there is an equal and opposite reaction. Force occurs in matched pairs." },
    { q: "What is the key difference between Mitosis and Meiosis?", a: "Mitosis produces two genetically identical diploid cells for growth, while Meiosis produces four genetically diverse haploid gametes for reproduction." }
  ];

  // For Knowledge Hub Mockup
  const [summarized, setSummarized] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const triggerSummarize = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      setIsSummarizing(false);
      setSummarized(true);
    }, 1200);
  };

  const tabs = [
    {
      id: "ai-assistant",
      label: "AI Copilot",
      icon: <Bot className="w-5 h-5" />,
      title: "Your 24/7 Personal AI Tutor",
      subtitle: "Never get stuck on homework again. Get instant explanations, adaptive breakdowns, and helpful analogies styled for your learning speed.",
      badge: "Gemini-Powered",
      badgeColor: "bg-brand-primary/10 text-brand-primary border-brand-primary/20 dark:bg-brand-primary/20",
      bullets: [
        "Simplify hard topics using interactive 'Explain like I'm 10' mode",
        "Step-by-step tutoring in science, humanities, and advanced equations",
        "Convert lecture recordings or voice memos straight to summarized text"
      ]
    },
    {
      id: "planner",
      label: "Planner & Streak",
      icon: <Calendar className="w-5 h-5" />,
      title: "Habit-Building Study Scheduler",
      subtitle: "Organize your school schedule effortlessly. StudyWeb automatically schedules calendar blocks around exams, classes, and sports.",
      badge: "Smart Sync",
      badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/20",
      bullets: [
        "Generate adaptive daily calendars adjusted for workload difficulty",
        "Build long-term revision consistency with gamified daily streaks",
        "Focus timers designed to prevent study burnout"
      ]
    },
    {
      id: "recall",
      label: "Recall & Quizzes",
      icon: <BrainCircuit className="w-5 h-5" />,
      title: "Adaptive Self-Testing Engine",
      subtitle: "Study less, remember more. Instantly convert notes into custom active-recall flashcards and customized mini-quizzes.",
      badge: "Science-Backed",
      badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20",
      bullets: [
        "Spaced Repetition algorithms (SRS) optimize review times",
        "Custom feedback reports highlight key strengths and weak chapters",
        "Simulate realistic mock exams with automatic grading diagnostics"
      ]
    },
    {
      id: "library",
      label: "Knowledge Hub",
      icon: <Library className="w-5 h-5" />,
      title: "Central Academic Workspace",
      subtitle: "A secure digital vault for all your course assets. Organize notes, textbook PDFs, worksheets, and online research tags in one clean workspace.",
      badge: "Infinite Space",
      badgeColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20 dark:bg-cyan-500/20",
      bullets: [
        "Beautiful rich-text editor supporting custom markdown shortcuts",
        "One-click summarize tool extracts main thesis from long PDF files",
        "Cross-reference notes automatically to find linked definitions"
      ]
    }
  ];

  const benefits = [
    { icon: <Zap className="w-5 h-5 text-amber-500" />, title: "Save Hours", desc: "Every Week" },
    { icon: <Target className="w-5 h-5 text-rose-500" />, title: "Stay Organized", desc: "Track goals" },
    { icon: <Sparkles className="w-5 h-5 text-violet-500" />, title: "Learn with AI", desc: "Smarter study" },
    { icon: <TrendingUp className="w-5 h-5 text-emerald-500" />, title: "Improve Grades", desc: "See results" },
    { icon: <CheckCircle2 className="w-5 h-5 text-brand-primary" />, title: "Build Habits", desc: "Daily streaks" },
    { icon: <Trophy className="w-5 h-5 text-yellow-500" />, title: "Reach Goals", desc: "Ace exams" }
  ];

  return (
    <section id="for-students" className="py-24 relative overflow-hidden bg-brand-bg-light dark:bg-brand-bg-dark transition-colors duration-300">
      
      {/* Decorative Blur Blobs */}
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-brand-secondary/5 rounded-full blur-[150px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ==========================================================
            HEADER
           ========================================================== */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-semibold uppercase tracking-wider"
          >
            🎓 Built for Modern Students
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold font-display text-brand-text tracking-tight"
          >
            Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent animate-pulse">Study Smarter.</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-brand-text-light max-w-2xl mx-auto"
          >
            Ditch the chaos of juggling five different apps. StudyWeb brings your calendar, notes, AI tutor, and self-testing simulators together into a unified learning environment.
          </motion.p>
        </div>

        {/* ==========================================================
            TABS NAVIGATION (PILL STYLING)
           ========================================================== */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 max-w-4xl mx-auto">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(idx);
                setFlashCardFlipped(false); // Reset flashcard flip on switch
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold border transition-all duration-300 cursor-pointer ${
                activeTab === idx
                  ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]'
                  : 'bg-card-bg/80 border-card-border text-brand-text hover:border-brand-primary/30'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ==========================================================
            TWO-COLUMN INTERACTIVE SWITCHER LAYOUT
           ========================================================== */}
        <div className="grid lg:grid-cols-12 gap-12 items-center mb-24">
          
          {/* LEFT COLUMN: INTERACTIVE WORKSPACE MOCKUP (55%) */}
          <div className="lg:col-span-6 relative flex justify-center items-center">
            
            {/* Background Glow Wrapper */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-brand-secondary/15 rounded-full blur-[80px] pointer-events-none -z-10" />

            <div className="w-full max-w-lg min-h-[380px] sm:min-h-0 sm:aspect-square bg-card-bg/60 backdrop-blur-2xl border border-card-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col justify-between overflow-hidden relative group hover:border-brand-primary/20 transition-all duration-500">
              
              {/* Device Window Header */}
              <div className="flex justify-between items-center border-b border-card-border pb-3 mb-4 flex-shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[10px] font-mono text-brand-text-light uppercase tracking-wider bg-card-border/40 px-2.5 py-0.5 rounded-full">
                  studyweb_desktop // {tabs[activeTab].label}
                </div>
              </div>

              {/* Dynamic Interactive Sandboxes */}
              <div className="flex-1 flex flex-col justify-center min-h-0">
                <AnimatePresence mode="wait">
                  
                  {/* TAB 0: INTERACTIVE AI CHAT SANDBOX */}
                  {activeTab === 0 && (
                    <motion.div
                      key="ai-copilot-sandbox"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-4 flex flex-col justify-between h-full"
                    >
                      {/* Subject Selection Pills */}
                      <div className="flex justify-center gap-2 mb-2">
                        <button 
                          onClick={() => setAiChatTopic('photosynthesis')}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            aiChatTopic === 'photosynthesis' 
                              ? 'bg-brand-primary/15 border-brand-primary text-brand-primary' 
                              : 'border-card-border text-brand-text-light'
                          }`}
                        >
                          🍃 Biology
                        </button>
                        <button 
                          onClick={() => setAiChatTopic('calculus')}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            aiChatTopic === 'calculus' 
                              ? 'bg-brand-primary/15 border-brand-primary text-brand-primary' 
                              : 'border-card-border text-brand-text-light'
                          }`}
                        >
                          📐 Calculus
                        </button>
                        <button 
                          onClick={() => setAiChatTopic('history')}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            aiChatTopic === 'history' 
                              ? 'bg-brand-primary/15 border-brand-primary text-brand-primary' 
                              : 'border-card-border text-brand-text-light'
                          }`}
                        >
                          🏛️ History
                        </button>
                      </div>

                      {/* Chat Messages */}
                      <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
                        <div className="flex gap-2 items-start">
                          <div className="w-6 h-6 rounded-lg bg-card-border flex items-center justify-center text-xs text-brand-text-light flex-shrink-0">
                            👤
                          </div>
                          <div className="bg-card-border/40 p-2.5 rounded-2xl rounded-tl-none text-xs text-brand-text border border-card-border max-w-[85%]">
                            {aiChatTopic === 'photosynthesis' && "Explain photosynthesis like I'm 10."}
                            {aiChatTopic === 'calculus' && "Why do we use derivatives in the real world?"}
                            {aiChatTopic === 'history' && "Explain the main cause of the French Revolution."}
                          </div>
                        </div>

                        <div className="flex gap-2 items-start">
                          <div className="w-6 h-6 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary flex-shrink-0">
                            🤖
                          </div>
                          <div className="bg-brand-primary/5 p-2.5 rounded-2xl rounded-tl-none text-xs text-brand-text border border-brand-primary/10 max-w-[85%] leading-relaxed">
                            {aiChatTopic === 'photosynthesis' && (
                              <span>
                                Think of a green leaf like a <strong>solar-powered food factory</strong>! ☀️ It takes in sunlight, carbon dioxide, and water to cook up delicious sugar for fuel, releasing oxygen as a gift for us!
                              </span>
                            )}
                            {aiChatTopic === 'calculus' && (
                              <span>
                                Derivatives measure <strong>instantaneous speed or change</strong>! 🏎️ In the real world, engineers use them to analyze rocket acceleration, and economists use them to track profit shifts.
                              </span>
                            )}
                            {aiChatTopic === 'history' && (
                              <span>
                                The core trigger was <strong>inequality and high debt</strong>! 🍞 The working class (Third Estate) paid all the taxes while facing famine, triggering widespread uprisings against the rich monarchy.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Fake Chat Input Bar */}
                      <div className="relative mt-2">
                        <div className="w-full p-2.5 rounded-xl bg-card-border/30 text-[11px] text-brand-text-light border border-card-border flex items-center justify-between">
                          <span>Ask StudyWeb AI anything...</span>
                          <Send className="w-3.5 h-3.5 text-brand-primary" />
                        </div>
                      </div>
                      <div className="text-[10px] text-center text-brand-text-light font-medium italic">
                        💡 Click the subject buttons above to test different AI replies!
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 1: INTERACTIVE PLANNER & STREAK SANDBOX */}
                  {activeTab === 1 && (
                    <motion.div
                      key="planner-sandbox"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-4 flex flex-col justify-between h-full"
                    >
                      {/* Habit Streak Header */}
                      <div className="flex justify-between items-center bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/10">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                            <Zap className="w-4 h-4 animate-bounce" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-brand-text">Active Streak</p>
                            <p className="text-[10px] text-brand-text-light">Biology & Math goals met</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">18 Days</span>
                        </div>
                      </div>

                      {/* Interactive Task List */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider">Today's Study List</p>
                        <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                          {todoTasks.map((task) => (
                            <div 
                              key={task.id} 
                              onClick={() => {
                                setTodoTasks(prev => 
                                  prev.map(t => t.id === task.id ? { ...t, checked: !t.checked } : t)
                                );
                              }}
                              className="flex items-center justify-between p-2 rounded-lg border border-card-border/50 bg-card-bg/40 hover:bg-brand-primary/5 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                  task.checked 
                                    ? 'bg-brand-primary border-brand-primary text-white' 
                                    : 'border-card-border bg-card-bg/30'
                                }`}>
                                  {task.checked && <Check className="w-3 h-3" />}
                                </div>
                                <span className={`text-[11px] font-semibold text-brand-text ${task.checked ? 'line-through opacity-50' : ''}`}>
                                  {task.text}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-brand-text-light bg-card-border px-2 py-0.5 rounded-md">
                                {task.subject}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Custom Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-semibold text-brand-text-light">Daily Goal Progress</span>
                          <span className="font-mono font-bold text-brand-primary">{progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-card-border/50 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-center text-brand-text-light font-medium italic">
                        💡 Click tasks above to mark them complete and watch the progress bar change!
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: INTERACTIVE ACTIVE RECALL FLASHCARD */}
                  {activeTab === 2 && (
                    <motion.div
                      key="recall-sandbox"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-4 flex flex-col justify-between h-full"
                    >
                      {/* Navigation buttons */}
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-brand-text-light uppercase tracking-wider">
                          Active Recall Card ({flashCardIndex + 1} of {flashCards.length})
                        </span>
                        <button 
                          onClick={() => {
                            setFlashCardIndex(prev => (prev + 1) % flashCards.length);
                            setFlashCardFlipped(false);
                          }}
                          className="text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Next Card <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* 3D Flip Card Container */}
                      <div 
                        onClick={() => setFlashCardFlipped(!flashCardFlipped)}
                        className="relative w-full h-[160px] cursor-pointer group"
                        style={{ perspective: '1000px' }}
                      >
                        <motion.div
                          className="w-full h-full relative rounded-2xl border transition-all duration-500"
                          style={{ 
                            transformStyle: 'preserve-3d',
                            transform: flashCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                          }}
                        >
                          {/* FRONT OF CARD */}
                          <div 
                            className="absolute inset-0 bg-card-bg/95 border border-card-border rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:border-brand-primary/30"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Question</span>
                            <p className="text-xs sm:text-sm font-semibold text-brand-text leading-relaxed text-center my-auto">
                              "{flashCards[flashCardIndex].q}"
                            </p>
                            <span className="text-[10px] font-bold text-brand-text-light text-center">
                              👇 Click to Flip Card and Reveal Answer
                            </span>
                          </div>

                          {/* BACK OF CARD */}
                          <div 
                            className="absolute inset-0 bg-brand-primary/5 border border-brand-primary/25 rounded-2xl p-5 flex flex-col justify-between shadow-sm"
                            style={{ 
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)'
                            }}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary">Core Explanation</span>
                            <p className="text-xs text-brand-text leading-relaxed text-center my-auto px-2">
                              {flashCards[flashCardIndex].a}
                            </p>
                            <span className="text-[10px] font-bold text-brand-primary text-center">
                              👍 Got it! Click to Flip back
                            </span>
                          </div>

                        </motion.div>
                      </div>

                      <div className="text-[10px] text-center text-brand-text-light font-medium italic">
                        💡 Click anywhere on the card to flip, or click "Next Card" to practice different terms!
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: INTERACTIVE KNOWLEDGE HUB */}
                  {activeTab === 3 && (
                    <motion.div
                      key="knowledge-sandbox"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-4 flex flex-col justify-between h-full"
                    >
                      {/* Document Folder view */}
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card-border/30 border border-card-border">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg flex-shrink-0">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-brand-text truncate">Biology_Unit_2_Respiration_Guide.pdf</p>
                          <p className="text-[9px] text-brand-text-light">PDF Document • 4.2 MB uploaded</p>
                        </div>
                        <button
                          disabled={isSummarizing || summarized}
                          onClick={triggerSummarize}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex-shrink-0 cursor-pointer ${
                            summarized 
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-brand-primary hover:bg-brand-secondary text-white'
                          }`}
                        >
                          {isSummarizing ? "Extracting..." : summarized ? "Done ✓" : "AI Summarise"}
                        </button>
                      </div>

                      {/* Content Area */}
                      <div className="border border-card-border bg-card-bg/30 p-3 rounded-xl min-h-[110px] flex flex-col justify-center">
                        <AnimatePresence mode="wait">
                          {isSummarizing ? (
                            <motion.div 
                              key="summarizing-loader"
                              className="text-center py-4 space-y-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
                              <p className="text-[10px] text-brand-text-light font-bold">Scanning text headers & formula keys...</p>
                            </motion.div>
                          ) : summarized ? (
                            <motion.div 
                              key="summarized-output"
                              className="space-y-2 text-left"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                                <Sparkles className="w-3 h-3" /> Core Insights Summarized (92% shorter)
                              </div>
                              <ul className="space-y-1.5">
                                <li className="text-[10px] text-brand-text flex items-start gap-1.5">
                                  <span className="text-brand-primary mt-0.5">•</span>
                                  <span>Aerobic respiration produces far more ATP than anaerobic respiration.</span>
                                </li>
                                <li className="text-[10px] text-brand-text flex items-start gap-1.5">
                                  <span className="text-brand-primary mt-0.5">•</span>
                                  <span>Glycolysis occurs in cell cytoplasm; Krebs cycle happens inside mitochondria.</span>
                                </li>
                                <li className="text-[10px] text-brand-text flex items-start gap-1.5">
                                  <span className="text-brand-primary mt-0.5">•</span>
                                  <span>Main output reactants: Carbon dioxide (CO2), Water (H2O), and 36-38 ATP units.</span>
                                </li>
                              </ul>
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="not-summarized"
                              className="text-center py-4 text-brand-text-light"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <p className="text-xs font-semibold">Select a document above to extract its key concepts.</p>
                              <p className="text-[9px] mt-1">Get precise revision cards in seconds.</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="text-[10px] text-center text-brand-text-light font-medium italic">
                        💡 Click the blue "AI Summarise" button above to witness document extraction in action!
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Bottom decorative bar */}
              <div className="h-1 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent rounded-full mt-4 flex-shrink-0" />
            </div>
          </div>

          {/* RIGHT COLUMN: TEXT INFRASTRUCTURE & VALUE METRICS (45%) */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${tabs[activeTab].badgeColor}`}>
              <span>{tabs[activeTab].badge}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-text tracking-tight leading-tight">
              {tabs[activeTab].title}
            </h3>

            <p className="text-sm sm:text-base text-brand-text-light leading-relaxed">
              {tabs[activeTab].subtitle}
            </p>

            {/* Bullets mapping */}
            <div className="space-y-3 pt-2">
              {tabs[activeTab].bullets.map((bullet, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-500 mt-1">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-brand-text font-medium leading-normal">{bullet}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button 
                onClick={() => (window as any).openStudyWebAuth?.('signup')}
                className="px-5 py-3 rounded-xl bg-brand-primary hover:bg-brand-secondary text-white text-xs sm:text-sm font-bold shadow-lg shadow-brand-primary/15 hover:shadow-xl hover:shadow-brand-secondary/25 transition-all flex items-center gap-2 group cursor-pointer"
              >
                Join StudyWeb Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a 
                href="#demo"
                className="px-5 py-3 rounded-xl border border-card-border hover:bg-card-border/30 text-brand-text text-xs sm:text-sm font-bold transition-colors"
              >
                Watch 1 Min Demo
              </a>
            </div>

          </div>

        </div>

        {/* ==========================================================
            BENEFITS STRIP
           ========================================================== */}
        <div className="mb-24">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-1">
            <h4 className="text-sm font-extrabold text-brand-text">Engineered for Academic Consistency</h4>
            <p className="text-xs text-brand-text-light">Here is why students report higher grades and less exam-week panic with StudyWeb.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {benefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 * idx }}
                className="bg-card-bg border border-card-border rounded-2xl p-5 flex flex-col items-center text-center hover:border-brand-primary/20 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <div className="mb-3 p-2 bg-card-border/40 rounded-xl">
                  {benefit.icon}
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-brand-text">{benefit.title}</h4>
                <p className="text-[11px] text-brand-text-light">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>



      </div>
    </section>
  );
}
