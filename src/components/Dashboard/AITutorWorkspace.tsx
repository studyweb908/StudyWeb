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
  RefreshCw
} from 'lucide-react';

export default function AITutorWorkspace() {
  const [messages, setMessages] = useState([
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
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string }[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const handleSend = (textToSend: string) => {
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

    // Simulate AI thinking and streaming response
    setTimeout(() => {
      let aiResponseText = "";
      
      if (textToSend.toLowerCase().includes('quantum')) {
        aiResponseText = "### Quantum Physics Made Simple 🌌\n\nImagine the universe is made of tiny, microscopic Lego blocks. In our normal world, a Lego brick is either red or blue. But in the quantum world, **Lego blocks can be both red and blue at the absolute same time** until you look at them! This is called **Superposition**.\n\nHere are the 3 big rules of the quantum playground:\n1. **Superposition**: Things can exist in multiple states or places simultaneously.\n2. **Quantum Entanglement**: Two tiny blocks can become 'best friends' and mirror each other instantly, even if they are on opposite sides of the universe!\n3. **The Observer Effect**: Simply looking at or measuring a quantum block changes its behavior completely.\n\n*Source citation: StudyWeb Physics Library Vol 2, Page 45*";
      } else if (textToSend.toLowerCase().includes('limit')) {
        aiResponseText = "### Step-by-Step Math Solution 📐\n\nWe need to find:\n$$\\lim_{x \\to 0} \\frac{\\sin(x)}{x}$$\n\n**Step 1: Direct Substitution**\nSubstitute $x = 0$ into the expression:\n$$\\frac{\\sin(0)}{0} = \\frac{0}{0}$$\nThis is an **indeterminate form** (0/0).\n\n**Step 2: Apply L'Hôpital's Rule**\nSince the limit results in $0/0$, we can take the derivative of the numerator and the denominator separately:\n- Derivative of $\\sin(x)$ is $\\cos(x)$\n- Derivative of $x$ is $1$\n\n**Step 3: Evaluate the New Limit**\n$$\\lim_{x \\to 0} \\frac{\\cos(x)}{1} = \\frac{\\cos(0)}{1} = \\frac{1}{1} = 1$$\n\nTherefore, the limit is **1**.";
      } else if (textToSend.toLowerCase().includes('cellular') || textToSend.toLowerCase().includes('respiration')) {
        aiResponseText = "### Cellular Respiration Breakdown 🔋\n\nCellular respiration is how cells turn glucose (sugar) into ATP (usable biological energy). Think of it like a power plant converting raw coal into electricity!\n\nHere are the 3 major stages:\n1. **Glycolysis** (takes place in cytoplasm): Breaks glucose into pyruvate, yielding **2 ATP**.\n2. **Krebs Cycle (Citric Acid Cycle)** (takes place in mitochondria matrix): Extracts electrons, yielding **2 ATP** and releasing CO2.\n3. **Electron Transport Chain (ETC)** (takes place in mitochondria inner membrane): Uses oxygen and high-energy electrons to generate a massive power surge of **28 to 32 ATP**.\n\n*Key takeaway:* Mitochondria is truly the powerhouse of the cell because that's where the ETC yields the most ATP!";
      } else if (textToSend.toLowerCase().includes('quiz') || textToSend.toLowerCase().includes('revolution')) {
        aiResponseText = "### French Revolution Mini-Quiz 🇫🇷\n\nHere are 3 custom practice questions to test your comprehension:\n\n**Question 1:** Which social class bore the greatest tax burden prior to the French Revolution?\n- A) The First Estate (Clergy)\n- B) The Second Estate (Nobility)\n- C) The Third Estate (Commoners)\n*Correct Answer: **C**. The Third Estate made up 98% of the population and paid virtually all taxes.*\n\n**Question 2:** What event on July 14, 1789, is celebrated as the start of the Revolution?\n- A) The Execution of Louis XVI\n- B) The Storming of the Bastille\n- C) The Tennis Court Oath\n*Correct Answer: **B**. This represented the collapse of royal tyranny.*\n\nWould you like me to add these questions to your official StudyWeb Quiz tracker?";
      } else {
        aiResponseText = `I have received your prompt: "${textToSend}". Under ${deepResearch ? 'Deep Research Mode' : 'Standard Mode'} with ${citationMode ? 'active Citations' : 'no citations'}, here is the AI-generated study outline:

- **Core Concept**: Analyzing key academic questions using natural language.
- **Synthesized Overview**: By cross-referencing your AP syllabus and past study sessions, this response targets optimal recall.
- **Recommended next step**: Try generating flashcards or summarizing the attached notes for this topic.

Let me know if you would like me to clarify any specific point or provide an interactive practice quiz!`;
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsThinking(false);
      setAttachedFiles([]);
    }, 1500);
  };

  const handleFileUpload = () => {
    // Simulated upload trigger
    const fileNames = ['biology_notes_ch3.pdf', 'calculus_formulas.png', 'essay_outline.docx'];
    const randomFile = fileNames[Math.floor(Math.random() * fileNames.length)];
    const newFile = {
      name: randomFile,
      type: randomFile.endsWith('pdf') ? 'PDF Document' : randomFile.endsWith('png') ? 'Image File' : 'Document'
    };

    setAttachedFiles(prev => [...prev, newFile]);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm text-left">
      {/* Top Controller Bar */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              Advanced AI Tutor
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">GPT-4o Powered</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Understands formulas, essays, complex logic, and uploaded PDFs</p>
          </div>
        </div>

        {/* Workspace controls */}
        <div className="flex items-center gap-3.5">
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
                : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
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
          className="relative flex items-center bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-2xl overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-indigo-600/20 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 transition-all px-3 py-2"
        >
          {/* File Attachments Trigger */}
          <button
            type="button"
            onClick={handleFileUpload}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Attach a PDF or study material"
          >
            <FileUp className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleFileUpload}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Attach an image of a math problem"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Core Input Field */}
          <input
            type="text"
            required={attachedFiles.length === 0}
            placeholder="Ask AI study partner (e.g. explain Cellular Respiration, solve math problem...)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 px-3 py-2 bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
          />

          {/* Mic */}
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-all hidden xs:block cursor-pointer"
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

        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2.5 font-medium">
          StudyWeb AI may occasionally misinterpret specific diagram margins. Check critical derivations.
        </p>
      </div>
    </div>
  );
}
