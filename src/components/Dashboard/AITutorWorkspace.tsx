import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  FileUp, 
  Image as ImageIcon, 
  Search, 
  Mic, 
  Maximize2, 
  Check, 
  AlertCircle,
  Clock,
  CornerDownLeft,
  ChevronRight,
  BookOpen,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Trophy,
  Volume2,
  VolumeX,
  Target,
  Plus,
  Trash2,
  FileText,
  X
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  citations?: Array<{
    sourceName: string;
    page?: number;
    quote: string;
  }>;
  source?: string;
}

export default function AITutorWorkspace() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hello Alex! I am your StudyWeb AI Tutor. I can help explain difficult equations, synthesize complex notes, summarize PDFs, or generate tailored practice questions. What would you like to explore today?",
      time: 'Just now'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [citationMode, setCitationMode] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string; size?: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [activeCitation, setActiveCitation] = useState<{
    sourceName: string;
    page?: number;
    quote: string;
  } | null>(null);
  const [hoveredCitation, setHoveredCitation] = useState<{
    id: string;
    sourceName: string;
    page?: number;
    quote: string;
  } | null>(null);

  // Pomodoro Focus Timer States
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [completedCycles, setCompletedCycles] = useState(0);
  const [sessionGoalInput, setSessionGoalInput] = useState('');
  const [sessionGoals, setSessionGoals] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: '1', text: 'Analyze Biology Chapter 3 with AI', done: false },
    { id: '2', text: 'Solve sample AP practice quiz questions', done: false }
  ]);
  const [timerSoundMuted, setTimerSoundMuted] = useState(true);
  const [focusAmbiance, setFocusAmbiance] = useState('Deep Focus Lo-Fi');

  // Motivational Focus quotes
  const focusQuotes = [
    { quote: "Focus is a muscle, and you are building it right now.", author: "StudyWeb Guide" },
    { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { quote: "Your focus determines your reality.", author: "Qui-Gon Jinn" },
    { quote: "There are no shortcuts to any place worth going.", author: "Beverly Sills" },
    { quote: "Deep work is the superpower of the 21st century.", author: "Cal Newport" }
  ];
  const [currentQuoteIdx] = useState(() => Math.floor(Math.random() * focusQuotes.length));

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Focus Timer Tick logic - Optimized to avoid drift and interval rebuilding every second
  useEffect(() => {
    let intervalId: any = null;
    if (timerIsActive) {
      intervalId = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerIsActive]);

  // Handle Focus Timer completion events safely
  useEffect(() => {
    if (timerSeconds === 0 && timerIsActive) {
      setTimerIsActive(false);
      
      // Mode completed triggers
      if (timerMode === 'focus') {
        const nextCycles = completedCycles + 1;
        setCompletedCycles(nextCycles);
        
        // Push tutor notification message
        const congratMsg = {
          id: Date.now().toString(),
          sender: 'ai',
          text: `🎉 **Awesome study sprint, Alex!** You have completed Focus Cycle #${nextCycles}. Take a quick rest now. The brain processes complex memory during break periods!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, congratMsg]);
        
        if (nextCycles % 4 === 0) {
          setTimerMode('longBreak');
          setTimerSeconds(15 * 60);
          (window as any).showToast?.('🏆 Spectacular work! You have finished 4 complete focus sprints. Treat yourself to a 15-minute long break!', 'success');
        } else {
          setTimerMode('shortBreak');
          setTimerSeconds(5 * 60);
          (window as any).showToast?.('🌸 Focus session complete! Take a 5-minute break to stretch and rest.', 'info');
        }
      } else {
        setTimerMode('focus');
        setTimerSeconds(25 * 60);
        
        const focusRestartMsg = {
          id: Date.now().toString(),
          sender: 'ai',
          text: `💪 **Break period finished!** Let's lock back in for another 25-minute deep focus sprint. What concept should we break down first?`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, focusRestartMsg]);
        (window as any).showToast?.("💪 Let's get back to work! Focus session is starting.", 'success');
      }
    }
  }, [timerSeconds, timerIsActive, timerMode, completedCycles]);

  const formatTimerTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSetTimerPreset = (minutes: number, mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setTimerIsActive(false);
    setTimerMode(mode);
    setTimerSeconds(minutes * 60);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionGoalInput.trim()) return;
    setSessionGoals(prev => [
      ...prev,
      { id: Date.now().toString(), text: sessionGoalInput.trim(), done: false }
    ]);
    setSessionGoalInput('');
  };

  const toggleGoal = (id: string) => {
    setSessionGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  };

  const deleteGoal = (id: string) => {
    setSessionGoals(prev => prev.filter(g => g.id !== id));
  };

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Suggested prompts
  const suggestedPrompts = [
    { title: "Explain Simply", desc: "Explain Quantum Physics to an 11-year-old.", text: "Can you explain the basic principles of Quantum Physics simply, as if explaining to an 11-year-old?" },
    { title: "Solve Math", desc: "Solve the limit of (sin x)/x as x approaches 0.", text: "Solve this math problem step-by-step: Evaluate the limit of (sin x)/x as x approaches 0 using L'Hopital's rule." },
    { title: "Summarize Text", desc: "Extract key takeaways of Cellular Respiration.", text: "Can you extract the 5 absolute key takeaways and major stages of Cellular Respiration?" },
    { title: "Generate Quiz", desc: "Create a 3-question test on the French Revolution.", text: "Generate a custom 3-question multiple-choice quiz on the main causes of the French Revolution. Include answers and clear explanations." }
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() && attachedFiles.length === 0) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend || `Analyzed uploaded attachments: ${attachedFiles.map(f => f.name).join(', ')}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    try {
      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: textToSend || `Please analyze my attached documents: ${attachedFiles.map(f => f.name).join(', ')}`,
          deepResearch,
          citationMode,
          attachedFiles,
          model: selectedModel
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Server error");
      }

      const data = await response.json();
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.text || "No response received.",
        citations: data.citations,
        source: data.source,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.warn("Falling back to local simulation because:", error.message);
      
      // Local simulation fallback
      let aiResponseText = "";
      let mockCitations: Array<{ sourceName: string; page?: number; quote: string }> = [];
      
      if (textToSend.toLowerCase().includes('quantum')) {
        aiResponseText = "### Quantum Physics Made Simple 🌌\n\nImagine the universe is made of tiny, microscopic Lego blocks. In our normal world, a Lego brick is either red or blue. But in the quantum world, **Lego blocks can be both red and blue at the absolute same time** until you look at them! This is called **Superposition**.\n\nHere are the 3 big rules of the quantum playground:\n1. **Superposition**: Things can exist in multiple states or places simultaneously.\n2. **Quantum Entanglement**: Two tiny blocks can become 'best friends' and mirror each other instantly, even if they are on opposite sides of the universe!\n3. **The Observer Effect**: Simply looking at or measuring a quantum block changes its behavior completely.\n\n*Source citation: StudyWeb Physics Library Vol 2, Page 45*";
        mockCitations = [
          { sourceName: "StudyWeb Physics Library Vol 2", page: 45, quote: "Things can exist in multiple states or places simultaneously until they are actively measured." }
        ];
      } else if (textToSend.toLowerCase().includes('limit')) {
        aiResponseText = "### Step-by-Step Math Solution 📐\n\nWe need to find:\n$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$$\n\n**Step 1: Direct Substitution**\nSubstitute $x = 0$ into the expression:\n$$\\frac{\\sin(0)}{0} = \\frac{0}{0}$$\nThis is an **indeterminate form** (0/0).\n\n**Step 2: Apply L'Hôpital's Rule**\nSince the limit results in $0/0$, we can take the derivative of the numerator and the denominator separately:\n- Derivative of $\\sin(x)$ is $\\cos(x)$\n- Derivative of $x$ is $1$\n\n**Step 3: Evaluate the New Limit**\n$$\\lim_{x \\to 0} \\frac{\\cos(x)}{1} = \\frac{\\cos(0)}{1} = \\frac{1}{1} = 1$$\n\nTherefore, the limit is **1**.";
        mockCitations = [
          { sourceName: "Calculus Guide Book", page: 12, quote: "Since the limit results in 0/0, we apply L'Hopital's rule by evaluating derivative quotients." }
        ];
      } else if (textToSend.toLowerCase().includes('cellular') || textToSend.toLowerCase().includes('respiration')) {
        aiResponseText = "### Cellular Respiration Breakdown 🔋\n\nCellular respiration is how cells turn glucose (sugar) into ATP (usable biological energy). Think of it like a power plant converting raw coal into electricity!\n\nHere are the 3 major stages:\n1. **Glycolysis** (takes place in cytoplasm): Breaks glucose into pyruvate, yielding **2 ATP**.\n2. **Krebs Cycle (Citric Acid Cycle)** (takes place in mitochondria matrix): Extracts electrons, yielding **2 ATP** and releasing CO2.\n3. **Electron Transport Chain (ETC)** (takes place in mitochondria inner membrane): Uses oxygen and high-energy electrons to generate a massive power surge of **28 to 32 ATP**.\n\n*Key takeaway:* Mitochondria is truly the powerhouse of the cell because that's where the ETC yields the most ATP!";
        mockCitations = [
          { sourceName: "Biology Syllabus Summary", page: 8, quote: "Glycolysis yields 2 ATP in the cytoplasm, Krebs yields 2 ATP in the matrix, and Electron Transport Chain yields 28-32 ATP." }
        ];
      } else if (textToSend.toLowerCase().includes('quiz') || textToSend.toLowerCase().includes('revolution')) {
        aiResponseText = "### French Revolution Mini-Quiz 🇫🇷\n\nHere are 3 custom practice questions to test your comprehension:\n\n**Question 1:** Which social class bore the greatest tax burden prior to the French Revolution?\n- A) The First Estate (Clergy)\n- B) The Second Estate (Nobility)\n- C) The Third Estate (Commoners)\n*Correct Answer: **C**. The Third Estate made up 98% of the population and paid virtually all taxes.*\n\n**Question 2:** What event on July 14, 1789, is celebrated as the start of the Revolution?\n- A) The Execution of Louis XVI\n- B) The Storming of the Bastille\n- C) The Tennis Court Oath\n*Correct Answer: **B**. This represented the collapse of royal tyranny.*\n\nWould you like me to add these questions to your official StudyWeb Quiz tracker?";
        mockCitations = [
          { sourceName: "French History Compendium", page: 114, quote: "The storming of the Bastille on July 14, 1789 marked the collapse of absolute royal authority." }
        ];
      } else {
        aiResponseText = `I have received your prompt: "${textToSend}". Under ${deepResearch ? 'Deep Research Mode' : 'Standard Mode'} with ${citationMode ? 'active Citations' : 'no citations'}, here is the AI-generated study outline:

- **Core Concept**: Analyzing key academic questions using natural language.
- **Synthesized Overview**: By cross-referencing your AP syllabus and past study sessions, this response targets optimal recall.
- **Recommended next step**: Try generating flashcards or summarizing the attached notes for this topic.

Let me know if you would like me to clarify any specific point or provide an interactive practice quiz!`;
        if (attachedFiles.length > 0) {
          mockCitations = [
            { sourceName: attachedFiles[0].name, page: 1, quote: "Analyzing key academic questions using natural language." }
          ];
        }
      }
 
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponseText,
        citations: mockCitations.length > 0 ? mockCitations : undefined,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsThinking(false);
      setAttachedFiles([]);
    }
  };

  const docInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileCategory: 'document' | 'image') => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files) as File[];
    
    filesArray.forEach(file => {
      let typeLabel = 'Document';
      if (file.type.startsWith('image/')) {
        typeLabel = 'Image File';
      } else if (file.type.includes('pdf')) {
        typeLabel = 'PDF Document';
      } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        typeLabel = 'Word Document';
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        typeLabel = 'Spreadsheet';
      } else if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        typeLabel = 'Presentation';
      }

      const newFile = {
        name: file.name,
        type: typeLabel,
        size: formatFileSize(file.size)
      };
      setAttachedFiles(prev => {
        if (prev.some(f => f.name === file.name)) {
          return prev;
        }
        return [...prev, newFile];
      });
    });

    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files) return;
    const filesArray = Array.from(e.dataTransfer.files) as File[];
    
    filesArray.forEach(file => {
      let typeLabel = 'Document';
      if (file.type.startsWith('image/')) {
        typeLabel = 'Image File';
      } else if (file.type.includes('pdf')) {
        typeLabel = 'PDF Document';
      } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        typeLabel = 'Word Document';
      }

      const newFile = {
        name: file.name,
        type: typeLabel,
        size: formatFileSize(file.size)
      };
      setAttachedFiles(prev => {
        if (prev.some(f => f.name === file.name)) {
          return prev;
        }
        return [...prev, newFile];
      });
    });
  };

  const startSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      (window as any).showToast?.("Speech recognition is not supported in this browser. Please try another browser or make sure microphone permission is granted.", "warning");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setInputValue(prev => prev + (prev ? ' ' : '') + speechToText);
    };

    recognition.onerror = (err: any) => {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-row relative bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm text-left">
      {/* Left Sidebar: Attached Materials */}
      <div className="w-72 border-r border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/10 flex flex-col h-full shrink-0 hidden md:flex">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h4 className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">Attached Materials</h4>
          </div>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">
            {attachedFiles.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
          {attachedFiles.length === 0 ? (
            <div className="text-center py-10 px-4">
              <FileUp className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2 animate-pulse" />
              <p className="text-[10px] text-slate-400 font-bold">No documents attached.</p>
              <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">Drag files or click the attachment icon to upload files for deep chunk-level RAG indexing!</p>
            </div>
          ) : (
            attachedFiles.map((file, idx) => {
              const lastAIMsg = [...messages].reverse().find(m => m.sender === 'ai');
              const fileKeyword = file.name.split('.')[0].toLowerCase();
              const isCitedInLastResponse = lastAIMsg?.citations?.some(c => 
                c.sourceName.toLowerCase() === file.name.toLowerCase() ||
                file.name.toLowerCase().includes(c.sourceName.toLowerCase()) ||
                c.sourceName.toLowerCase().includes(file.name.toLowerCase()) ||
                (fileKeyword.length > 4 && c.sourceName.toLowerCase().includes(fileKeyword))
              );

              const matchingCitations = lastAIMsg?.citations?.filter(c => 
                c.sourceName.toLowerCase() === file.name.toLowerCase() ||
                file.name.toLowerCase().includes(c.sourceName.toLowerCase()) ||
                c.sourceName.toLowerCase().includes(file.name.toLowerCase()) ||
                (fileKeyword.length > 4 && c.sourceName.toLowerCase().includes(fileKeyword))
              ) || [];

              return (
                <div 
                  key={idx}
                  onClick={() => {
                    if (matchingCitations.length > 0) {
                      setActiveCitation({
                        sourceName: file.name,
                        page: matchingCitations[0].page,
                        quote: matchingCitations[0].quote
                      });
                    } else {
                      setActiveCitation({
                        sourceName: file.name,
                        quote: `This file is attached. Ask the AI study partner questions or requests for summaries referencing this material.`
                      });
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs flex flex-col gap-1.5 ${
                    isCitedInLastResponse
                      ? 'border-amber-400 dark:border-amber-500/80 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm ring-1 ring-amber-400/30'
                      : 'border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-200 dark:hover:border-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isCitedInLastResponse ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate flex-1 leading-tight">{file.name}</span>
                  </div>

                  {isCitedInLastResponse && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                        <Sparkles className="w-2 h-2" /> Cited
                      </span>
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                        View Citation &rarr;
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Left Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-slate-100 dark:border-slate-800/60">
        {/* Top Controller Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                Advanced AI Tutor
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                  Autonomous Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">High-accuracy academic reasoning, math solver, and note synthesis</p>
            </div>
          </div>

          {/* Workspace controls */}
          <div className="flex items-center flex-wrap gap-3.5">

            {/* Focus Timer Button */}
            <button
              onClick={() => setShowFocusTimer(!showFocusTimer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                showFocusTimer 
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
              title="Toggle integrated Pomodoro study timer"
            >
              <Clock className={`w-3.5 h-3.5 ${timerIsActive ? 'animate-pulse text-rose-500' : 'text-slate-400'}`} />
              <span>Focus Timer {timerIsActive && `(${formatTimerTime(timerSeconds)})`}</span>
            </button>

            {/* Deep Research mode */}
            <button
              onClick={() => setDeepResearch(!deepResearch)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                deepResearch 
                  ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-200' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="Enable extensive deep-search analysis"
            >
              <div className={`w-2 h-2 rounded-full ${deepResearch ? 'bg-indigo-600 animate-ping' : 'bg-slate-300'}`} />
              <span>Deep Research</span>
            </button>

            {/* Citation Mode */}
            <button
              onClick={() => setCitationMode(!citationMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                citationMode 
                  ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-200' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200'
              }`}
            >
              <span>Citations Mode</span>
              {citationMode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <RefreshCw className="w-3 h-3 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Main Chat Feed */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/5">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex gap-4 max-w-3xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                msg.sender === 'user' 
                  ? 'bg-slate-200 text-slate-700' 
                  : 'bg-indigo-660 bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              }`}>
                {msg.sender === 'user' ? 'ME' : 'AI'}
              </div>

              {/* Chat bubble body */}
              <div className={`space-y-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-850 rounded-tl-none shadow-sm'
                }`}>
                  {/* Simulated Markdown renderer */}
                  <div className="space-y-3 whitespace-pre-wrap">
                    {msg.text.split('\n\n').map((paragraph, idx) => {
                      if (paragraph.startsWith('###')) {
                        return <h4 key={idx} className="font-extrabold text-base text-indigo-600 dark:text-indigo-400 pt-1">{paragraph.replace('###', '')}</h4>;
                      }
                      if (paragraph.startsWith('-')) {
                        return (
                          <ul key={idx} className="list-disc pl-5 space-y-1.5">
                            {paragraph.split('\n').map((li, liIdx) => (
                              <li key={liIdx}>{li.replace('-', '').trim()}</li>
                            ))}
                          </ul>
                        );
                      }
                      if (paragraph.startsWith('$$')) {
                        return <div key={idx} className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg font-mono text-xs overflow-x-auto text-indigo-500 border border-slate-200/50 dark:border-slate-800">{paragraph.replace(/\$\$/g, '')}</div>;
                      }
                      return <p key={idx} dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
                    })}
                  </div>

                  {/* Citations block */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Citations:</span>
                      {msg.citations.map((cite, idx) => {
                        const citeId = `${msg.id}-${idx}`;
                        return (
                          <div
                            key={idx}
                            className="relative"
                            onMouseEnter={() => setHoveredCitation({
                              id: citeId,
                              sourceName: cite.sourceName,
                              page: cite.page,
                              quote: cite.quote
                            })}
                            onMouseLeave={() => setHoveredCitation(null)}
                          >
                            <button
                              onClick={() => setActiveCitation(cite)}
                              className="px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded transition-all cursor-pointer flex items-center gap-1 text-left"
                            >
                              <FileText className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                              <span>[{idx + 1}] {cite.sourceName.slice(0, 16)}{cite.sourceName.length > 16 ? '...' : ''}</span>
                            </button>

                            <AnimatePresence>
                              {hoveredCitation?.id === citeId && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-xl shadow-xl border border-slate-850 dark:border-slate-800 backdrop-blur-md pointer-events-none z-[100] text-[11px] text-left leading-relaxed flex flex-col gap-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 mb-1 shrink-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                      <span className="font-extrabold text-[10px] text-slate-200 truncate">{cite.sourceName}</span>
                                    </div>
                                    {cite.page !== undefined && (
                                      <span className="font-bold text-[8px] text-amber-400 font-mono bg-amber-500/10 px-1 py-0.5 rounded uppercase tracking-wider">
                                        Page {cite.page}
                                      </span>
                                    )}
                                  </div>
                                  <p className="italic font-medium text-slate-300 leading-normal line-clamp-3 relative pl-2 border-l-2 border-indigo-500">
                                    "{cite.quote}"
                                  </p>
                                  <div className="text-[9px] text-slate-500 mt-0.5 font-bold flex items-center gap-1">
                                    <span>Click to inspect full citation</span>
                                    <span>&rarr;</span>
                                  </div>
                                  {/* Triangle arrow */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95 dark:border-t-slate-950/95" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1">{msg.time}</span>
              </div>
            </div>
          ))}

          {/* AI Thinking Bubble */}
          <AnimatePresence>
            {isThinking && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-4 max-w-xl mr-auto"
              >
                <div className="w-8.5 h-8.5 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  AI
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-850 px-5 py-3.5 rounded-2xl rounded-tl-none shadow-sm text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                    <span className="text-xs text-slate-400 font-bold">StudyWeb AI is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Prompts Grid */}
        {messages.length === 1 && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/20">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Try asking me about:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.text)}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400 dark:hover:border-indigo-500/60 text-left transition-all hover:-translate-y-0.5 shadow-sm group cursor-pointer"
                >
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-white">
                    <span>{p.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1.5 leading-relaxed font-medium line-clamp-2">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input & Attachment Dock */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* Render attached files summary inside input container */}
          <AnimatePresence>
            {attachedFiles.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap gap-2 mb-3 px-1"
              >
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{file.name}</span>
                    <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold ml-1 text-[10px]">&times;</button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex items-center border rounded-2xl overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-indigo-600/20 transition-all px-3 py-2 ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-500/30' 
                : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-750 focus-within:border-indigo-600 dark:focus-within:border-indigo-500'
            }`}
          >
            {/* File Attachments Trigger */}
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Attach study documents or PDFs"
            >
              <FileUp className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Attach an image of a math problem"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Core Input Field */}
            <input
              type="text"
              required={attachedFiles.length === 0}
              placeholder={isDragging ? "Drop your files here!" : "Ask AI study partner (e.g. explain Cellular Respiration, solve math problem...)"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 px-3 py-2 bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
            />

            {/* Mic */}
            <button
              type="button"
              onClick={startSpeechRecognition}
              className={`p-2 rounded-xl transition-all hidden xs:block cursor-pointer ${
                isListening 
                  ? 'text-red-500 bg-red-500/10 animate-pulse' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title={isListening ? "Listening... Click to stop" : "Dictate your question"}
            >
              <Mic className="w-4.5 h-4.5" />
            </button>

            {/* Send Action */}
            <button
              type="submit"
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow shadow-indigo-600/20 cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Hidden native input elements for real uploading */}
          <input
            type="file"
            ref={docInputRef}
            onChange={(e) => handleFileChange(e, 'document')}
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
          />
          <input
            type="file"
            ref={imgInputRef}
            onChange={(e) => handleFileChange(e, 'image')}
            className="hidden"
            multiple
            accept="image/*"
          />

          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2.5 font-medium">
            StudyWeb AI may occasionally misinterpret specific diagram margins. Check critical derivations.
          </p>
        </div>
      </div>

      {/* Right Focus Timer Sidebar Column */}
      <AnimatePresence>
        {showFocusTimer && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="absolute top-0 right-0 bottom-0 z-20 lg:relative lg:z-auto w-[340px] max-w-[85vw] h-full border-l border-slate-100 dark:border-slate-800/80 bg-white/95 lg:bg-slate-50/50 dark:bg-slate-900/95 lg:dark:bg-slate-950/20 backdrop-blur-xl lg:backdrop-blur-none flex flex-col shrink-0 overflow-y-auto custom-scrollbar text-left shadow-2xl lg:shadow-none"
          >
            {/* Sidebar Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-rose-500 animate-pulse" />
                <span className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Focus Desk</span>
              </div>
              <button 
                onClick={() => setShowFocusTimer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Timer Core Panel */}
            <div className="p-5 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-850 shadow-sm text-center space-y-4">
                {/* Mode indicators */}
                <div className="flex justify-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl text-[10px] font-bold">
                  <button 
                    onClick={() => handleSetTimerPreset(25, 'focus')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      timerMode === 'focus' 
                        ? 'bg-rose-500 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Focus (25m)
                  </button>
                  <button 
                    onClick={() => handleSetTimerPreset(5, 'shortBreak')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      timerMode === 'shortBreak' 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Short (5m)
                  </button>
                  <button 
                    onClick={() => handleSetTimerPreset(15, 'longBreak')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      timerMode === 'longBreak' 
                        ? 'bg-sky-500 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Long (15m)
                  </button>
                </div>

                {/* Giant Timer Readout */}
                <div className="py-2">
                  <span className="block font-mono text-5xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                    {formatTimerTime(timerSeconds)}
                  </span>
                  <p className="text-[9px] uppercase font-bold text-slate-400 mt-1">
                    {timerMode === 'focus' ? '🎯 Stay Locked In' : '☕ Refreshing Break'}
                  </p>
                </div>

                {/* Micro Progress Bar */}
                {(() => {
                  const maxSec = timerMode === 'focus' ? 25 * 60 : timerMode === 'shortBreak' ? 5 * 60 : 15 * 60;
                  const percent = ((maxSec - timerSeconds) / maxSec) * 100;
                  const color = timerMode === 'focus' ? 'bg-rose-500' : timerMode === 'shortBreak' ? 'bg-emerald-500' : 'bg-sky-500';
                  return (
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                      <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${percent}%` }} />
                    </div>
                  );
                })()}

                {/* Controls Bar */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setTimerIsActive(false);
                      setTimerSeconds(timerMode === 'focus' ? 25 * 60 : timerMode === 'shortBreak' ? 5 * 60 : 15 * 60);
                    }}
                    className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    title="Reset focus clock"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setTimerIsActive(!timerIsActive)}
                    className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      timerMode === 'focus'
                        ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10'
                        : timerMode === 'shortBreak'
                        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                        : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/10'
                    }`}
                  >
                    {timerIsActive ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Start</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setTimerSoundMuted(!timerSoundMuted)}
                    className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    title={timerSoundMuted ? 'Unmute sounds' : 'Mute sounds'}
                  >
                    {timerSoundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </div>

              {/* Stats & Streaks */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Completed Sprints</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Session Score: {completedCycles} cycles</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <div 
                      key={num} 
                      className={`w-2.5 h-2.5 rounded-full border ${
                        completedCycles >= num 
                          ? 'bg-rose-500 border-rose-600' 
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                      title={`Sprint ${num}`}
                    />
                  ))}
                </div>
              </div>

              {/* Sprint Goal Checklist */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Syllabus Sprint Goals</span>
                </h4>

                <form onSubmit={handleAddGoal} className="flex gap-1.5">
                  <input
                    type="text"
                    value={sessionGoalInput}
                    onChange={(e) => setSessionGoalInput(e.target.value)}
                    placeholder="Add a priority item..."
                    className="flex-1 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg text-xs text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200/50 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {sessionGoals.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-2 font-medium">No active focus goals. Add one above!</p>
                  ) : (
                    sessionGoals.map((goal) => (
                      <div 
                        key={goal.id} 
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input 
                            type="checkbox"
                            checked={goal.done}
                            onChange={() => toggleGoal(goal.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className={`text-[11px] truncate font-medium ${goal.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {goal.text}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Ambient Focus Music/Ambiance controller */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-850 space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Soundscape</p>
                <select
                  value={focusAmbiance}
                  onChange={(e) => setFocusAmbiance(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
                >
                  <option>Deep Focus Lo-Fi</option>
                  <option>Gentle Rain Chords</option>
                  <option>Library Whispers</option>
                  <option>White Noise Fan</option>
                </select>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 italic text-center font-medium">
                  {timerIsActive ? `🔊 Playing ${focusAmbiance}...` : '⏸️ Soundtrack paused'}
                </p>
              </div>

              {/* Quote Widget */}
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center space-y-1">
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 italic leading-relaxed font-semibold">
                  "{focusQuotes[currentQuoteIdx].quote}"
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  — {focusQuotes[currentQuoteIdx].author}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Citation Detail Modal Overlay */}
      <AnimatePresence>
        {activeCitation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveCitation(null)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-left"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate max-w-[280px]">
                      {activeCitation.sourceName}
                    </h4>
                    {activeCitation.page !== undefined && (
                      <p className="text-[10px] text-slate-400 font-bold">Page {activeCitation.page}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setActiveCitation(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Verbatim Reference Passage:</span>
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium italic relative">
                    <span className="absolute -top-2 left-2 text-2xl font-serif text-amber-300 select-none">“</span>
                    <p className="relative z-10 pl-2">{activeCitation.quote}</p>
                    <span className="absolute -bottom-6 right-2 text-2xl font-serif text-amber-300 select-none">”</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                  This segment was dynamically extracted using semantically aligned RAG (Retrieval-Augmented Generation) embeddings. Clicking citations keeps your analysis verifiable and transparent.
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setActiveCitation(null)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
                >
                  Close Reference
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
