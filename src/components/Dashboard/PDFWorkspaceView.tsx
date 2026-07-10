import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  Trash2, 
  BookOpen, 
  ArrowRight, 
  Check, 
  Highlighter, 
  HelpCircle,
  FileSpreadsheet,
  Layers,
  Award,
  BookMarked,
  Share2
} from 'lucide-react';
import { PDFDocument } from './types';

export default function PDFWorkspaceView() {
  // Mock PDFs list
  const [documents, setDocuments] = useState<PDFDocument[]>([
    { id: '1', name: 'Biology Ch3 - Molecular Genetics.pdf', size: '4.2 MB', pages: 12, highlights: ['Double helix structure discovered by Watson & Crick in 1953.', 'Transcription converts DNA to mRNA inside the nucleus.'] },
    { id: '2', name: 'AP Physics Formula Sheet.pdf', size: '1.1 MB', pages: 3, highlights: ['Kinematic Equation: v^2 = u^2 + 2as', 'Newtonian Torque equation: T = r * F * sin(theta)'] },
    { id: '3', name: 'Calculus Ch1 - Limits & Continuity.pdf', size: '2.8 MB', pages: 18, highlights: ['Squeeze theorem states that if f(x) <= g(x) <= h(x) and lim f(x) = lim h(x) = L, then lim g(x) = L.'] },
  ]);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(['1']);
  const [aiChatLogs, setAiChatLogs] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: "I've indexed 'Biology Ch3 - Molecular Genetics.pdf'. Select text from the document or ask me to generate study guides, summaries, or flashcards." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [activeHighlight, setActiveHighlight] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Toggle selected docs
  const handleToggleDoc = (id: string) => {
    if (selectedDocIds.includes(id)) {
      if (selectedDocIds.length > 1) {
        setSelectedDocIds(selectedDocIds.filter(docId => docId !== id));
      }
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  // Upload simulation
  const handleUploadPDF = () => {
    const customNames = ['English Literature AP.pdf', 'Chemistry Equilibrium.pdf', 'Computer Science Data Structures.pdf'];
    const selectedName = customNames[Math.floor(Math.random() * customNames.length)];
    const newDoc: PDFDocument = {
      id: Date.now().toString(),
      name: selectedName,
      size: `${(Math.random() * 4 + 1).toFixed(1)} MB`,
      pages: Math.floor(Math.random() * 15) + 5,
      highlights: ['Key theorem initialized for quick AI citation synthesis.']
    };
    setDocuments([...documents, newDoc]);
    setSelectedDocIds([...selectedDocIds, newDoc.id]);
  };

  // Run AI operations specifically targeting selected PDFs
  const runAiDocAction = (action: string) => {
    setLoadingAction(action);
    setTimeout(() => {
      let result = '';
      const selectedNames = documents.filter(d => selectedDocIds.includes(d.id)).map(d => d.name).join(', ');

      if (action === 'summary') {
        result = `### Executive Summary: ${selectedNames}\n\nKey Concepts Synthesized:\n- **Primary Focus**: Foundation theories, critical formulas, and academic models.\n- **Structural Breakdown**: Key stages are outlined chronologically with direct cross-references.\n- **Actionable Takeaway**: Pay close attention to active recall margins highlighted in early sections.`;
      } else if (action === 'formulas') {
        result = `### Extracted Formulas & Axioms 📐\n\nCross-referenced from selected sources:\n- **Axiom 1**: $v^2 = u^2 + 2as$ (Kinetic Acceleration model)\n- **Axiom 2**: $T = r \\cdot F \\cdot \\sin(\\theta)$ (Newtonian Torque model)\n- **Equation 3**: mRNA transcript matching sequences: $A \\to U$, $T \\to A$, $C \\to G$.`;
      } else if (action === 'flashcards') {
        result = `### Custom Study Flashcards Generated 🚀\n\n1. **Q**: Who discovered the double helix structure of DNA?\n   **A**: Watson and Crick in 1953.\n\n2. **Q**: What does the Squeeze Theorem prove?\n   **A**: Limits of functions squeezed between two other known limits.\n\n*These have been successfully exported to your Flashcards Deck.*`;
      }

      setAiChatLogs(prev => [...prev, { sender: 'ai', text: result }]);
      setLoadingAction(null);
    }, 1200);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setAiChatLogs(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setLoadingAction('chat');

    setTimeout(() => {
      const activeNames = documents.filter(d => selectedDocIds.includes(d.id)).map(d => d.name).join(', ');
      setAiChatLogs(prev => [...prev, {
        sender: 'ai',
        text: `Based on your selected sources (${activeNames}), here is the direct contextual answer:\n\n- **Answer synthesis**: The document specifies that active recall and systematic review of the highlights is highly correlated with exam success.\n- **Citation reference**: Section 3, subsection 2.2.\n\nWould you like me to draft a practice test on this specific section?`
      }]);
      setLoadingAction(null);
    }, 1200);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm text-left text-xs sm:text-sm">
      {/* LEFT COLUMN: PDF Sources (Notebook style) */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-5 flex flex-col justify-between">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-indigo-500" />
              <span>Source Notebooks</span>
            </h4>
            <button
              onClick={handleUploadPDF}
              className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              title="Add document"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select active PDFs for AI reference:</p>

          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => handleToggleDoc(doc.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/10 border-indigo-200 text-indigo-900 dark:text-indigo-400 font-bold' 
                      : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                      <FileText className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800 dark:text-slate-100 text-xs">{doc.name}</p>
                      <p className="text-[9px] text-slate-400 font-medium mt-1">{doc.pages} Pages • {doc.size}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notebook Summary Info */}
        <div className="pt-4 border-t border-slate-150 dark:border-slate-800 space-y-1.5">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active Workspace</p>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <span>Selected Docs:</span>
            <span className="text-indigo-600 dark:text-indigo-400">{selectedDocIds.length} file(s)</span>
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: Document Viewer / Highlight Compiler */}
      <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800">
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Active PDF Highlight Compiler</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Highlight and compile key sentences to trigger prompt generation</p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-bold uppercase">Citation Board</span>
          </div>

          {/* Interactive highlight triggers */}
          <div className="space-y-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Indexed Citations from Sources:</p>
            
            {documents.filter(d => selectedDocIds.includes(d.id)).map((doc) => (
              <div key={doc.id} className="space-y-2">
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide flex items-center gap-1">
                  <span>Source: {doc.name}</span>
                </p>
                
                <div className="space-y-2 pl-3.5 border-l-2 border-indigo-500/20">
                  {doc.highlights.map((hl, index) => (
                    <div 
                      key={index}
                      onClick={() => {
                        setActiveHighlight(hl);
                        setChatInput(`Analyze this highlighted segment: "${hl}"`);
                      }}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-yellow-500/10 dark:bg-slate-800/40 hover:border-yellow-500/30 border border-slate-100 dark:border-slate-800/60 transition-all cursor-pointer text-slate-700 dark:text-slate-300 relative group"
                    >
                      <p className="font-medium italic leading-relaxed text-xs">"{hl}"</p>
                      <div className="absolute right-2.5 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded border text-[9px] font-bold text-yellow-600">
                        <Highlighter className="w-3 h-3" />
                        <span>Query AI</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Quick compilers */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">AI Synthesis Accelerators:</p>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => runAiDocAction('summary')}
              disabled={!!loadingAction}
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/30 hover:border-indigo-200 border border-slate-150 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
              <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">Generate Summary</span>
            </button>

            <button
              onClick={() => runAiDocAction('formulas')}
              disabled={!!loadingAction}
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/30 hover:border-emerald-200 border border-slate-150 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              <BookOpen className="w-5 h-5 text-emerald-500" />
              <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">Extract Formulas</span>
            </button>

            <button
              onClick={() => runAiDocAction('flashcards')}
              disabled={!!loadingAction}
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-violet-50 dark:bg-slate-800/30 hover:border-violet-200 border border-slate-150 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Layers className="w-5 h-5 text-violet-500" />
              <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">Create Flashcards</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Contextual Document AI Chat */}
      <div className="w-full lg:w-96 flex flex-col bg-slate-50/30 dark:bg-slate-950/20">
        {/* Header indicator */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Notebook Chat Companion</span>
        </div>

        {/* Chat History Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {aiChatLogs.map((log, idx) => (
            <div 
              key={idx} 
              className={`flex gap-3 max-w-[85%] ${log.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-[9px] ${
                log.sender === 'user' ? 'bg-slate-200 text-slate-800' : 'bg-indigo-600 text-white'
              }`}>
                {log.sender === 'user' ? 'ME' : 'AI'}
              </div>

              <div className={`px-3.5 py-2.5 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap ${
                log.sender === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-150 dark:border-slate-800 shadow-sm rounded-tl-none'
              }`}>
                {/* Simplified math/bold format */}
                <div dangerouslySetInnerHTML={{ 
                  __html: log.text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/- (.*?)\n/g, '<li>$1</li>')
                    .replace(/### (.*?)\n/g, '<h5 class="font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">$1</h5>')
                }} />
              </div>
            </div>
          ))}

          {/* Loader */}
          {loadingAction && (
            <div className="flex gap-3 mr-auto max-w-[80%]">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                AI
              </div>
              <div className="bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl rounded-tl-none border border-slate-150 dark:border-slate-800 text-[11px] text-slate-400 font-semibold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>AI processing notebook sources...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input dock */}
        <form onSubmit={handleSendChat} className="p-3 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
          <input
            type="text"
            required
            placeholder="Ask about these documents..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[11px] text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer font-bold text-[11px] flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Simple Send Icon helper if missing
function Send(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4Z" />
    </svg>
  );
}
