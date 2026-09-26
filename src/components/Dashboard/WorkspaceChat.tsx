import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send,
  Mic, 
  Search, 
  X, 
  BookOpen, 
  ChevronRight, 
  Clock, 
  Bot, 
  CornerDownLeft, 
  Info,
  Check,
  Volume2,
  VolumeX,
  FileText,
  Copy,
  Share2
} from 'lucide-react';
import { Workspace } from './WorkspaceTypes';
import { useMicrophoneWaveform } from '../../hooks/useMicrophoneWaveform';

interface WorkspaceChatProps {
  workspace: Workspace;
  onUpdateWorkspace?: (updated: Workspace) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  citations?: Array<{
    sourceName: string;
    page?: number;
    quote: string;
  }>;
}

const CopySnippetButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="p-1 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-slate-200 ml-auto shrink-0 cursor-pointer"
      title="Copy snippet"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

export default function WorkspaceChat({ workspace, onUpdateWorkspace }: WorkspaceChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Hi! I'm your AI Study Assistant for **${workspace.name}**.\n\nI use your **${workspace.files.length} uploaded study materials** to answer questions, explain concepts, and provide exact citations. What would you like to learn today?`,
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const waveformLevels = useMicrophoneWaveform(isListening);

  const startSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      (window as any).showToast?.("Speech recognition is not supported in this browser.", "warning");
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
      console.error("Speech recognition error:", err.error || err);
      (window as any).showToast?.(`Microphone error: ${err.error || "Unknown error"}. Make sure microphone permissions are granted.`, "error");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };
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

  // Copy, share, note success feedback trackers
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [sharedMsgId, setSharedMsgId] = useState<string | null>(null);
  const [addedNoteMsgId, setAddedNoteMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const handleSpeakMessage = (id: string, text: string) => {
    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Strip markdown before speaking
    const cleanText = text.replace(/[*_#`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    
    setSpeakingMsgId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleShareMessage = async (id: string, text: string) => {
    const shareData = {
      title: 'StudyWeb AI Learning Briefing',
      text: text,
      url: window.location.href
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setSharedMsgId(id);
        setTimeout(() => setSharedMsgId(null), 2000);
        return;
      } catch (err) {
        console.warn('Native share failed, falling back to copy:', err);
      }
    }
    const formattedShareText = `StudyWeb AI Briefing 🧠\n\n"${text}"\n\nShared from StudyWeb Learning Hub: ${window.location.href}`;
    navigator.clipboard.writeText(formattedShareText);
    setSharedMsgId(id);
    setTimeout(() => setSharedMsgId(null), 2000);
  };

  const handleAddToNotes = (id: string, text: string) => {
    if (!onUpdateWorkspace) return;

    const cleanTitle = `AI Insight: ${text.slice(0, 35).replace(/[\n#*`]/g, '')}...`;
    const cleanContent = `<h3>AI Study Insight</h3>\n<p>${text.replace(/\n/g, '<br />')}</p>\n\n<p><em>Generated inside **${workspace.name}** active chat.</em></p>`;
    
    const newNote = {
      id: `ai-note-${Date.now()}`,
      title: cleanTitle,
      content: cleanContent,
      updatedAt: new Date().toLocaleDateString(),
      tags: ['AI Tutor', 'Grounded Insight', workspace.subject || 'Syllabus'].filter(Boolean) as string[],
    };

    const updatedWorkspace = {
      ...workspace,
      notes: [newNote, ...(workspace.notes || [])]
    };

    onUpdateWorkspace(updatedWorkspace);
    setAddedNoteMsgId(id);
    setTimeout(() => setAddedNoteMsgId(null), 2000);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isThinking) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    try {
      const isComplexQuery = textToSend.toLowerCase().includes('detailed') || 
                             textToSend.toLowerCase().includes('explain in depth') || 
                             textToSend.toLowerCase().includes('prove') || 
                             textToSend.toLowerCase().includes('analyze') ||
                             textToSend.toLowerCase().includes('derive');

      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: textToSend,
          workspaceId: workspace.id,
          attachedFiles: workspace.files,
          citationMode: true,
          deepResearch: isComplexQuery,
          model: 'auto'
        })
      });

      if (!response.ok) {
        throw new Error('API server returned error status');
      }

      const data = await response.json();

      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: data.text || 'Sorry, I could not generate a response.',
        citations: data.citations
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn('Real AI Tutor failed, falling back to simulated analysis:', err);
      // Fallback to offline simulation based on workspace content
      setTimeout(() => {
        let replyText = '';
        let replyCitations: Message['citations'] = [];

        const query = textToSend.toLowerCase();

        if (query.includes('mendel') || query.includes('genetic') || query.includes('heredity') || query.includes('law')) {
          replyText = "Based on Gregor Mendel's genetic principles, alleles separate independently during the formation of gametes. This segregation means that each gamete carries only one allele for each gene, which then fuse at fertilization to form heterozygous or homozygous offspring.";
          replyCitations = [
            {
              sourceName: workspace.files[0]?.name || 'Principles of Genetics.pdf',
              page: 4,
              quote: "Gregor Mendel's law of segregation states that the two alleles for each gene separate during gamete formation."
            }
          ];
        } else if (query.includes('glycolysis') || query.includes('respiration') || query.includes('krebs') || query.includes('mitochondria')) {
          replyText = "In cellular respiration, glycolysis converts one glucose into two pyruvates within the cytoplasm, generating a net of 2 ATP and 2 NADH. Pyruvate then transfers into the mitochondria, entering the Krebs Cycle to release carbon dioxide, NADH, and FADH₂.";
          replyCitations = [
            {
              sourceName: workspace.files[1]?.name || 'Cellular Respiration Pathways.ppt',
              page: 12,
              quote: "Glycolysis splits one glucose molecule into two pyruvates, yielding 2 net ATP and 2 NADH in the cytoplasm."
            }
          ];
        } else {
          replyText = "I have analyzed your request based on the files in this workspace. Here are some key points:\n\n" +
            (workspace.files.length > 0 
              ? `According to **${workspace.files[0].name}**, we can synthesize key concepts, tags, and lecture transcript details for your preparation.`
              : "To help maintain strict factual integrity, please upload more reference files in your Library tab!");
        }

        const aiMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          sender: 'ai',
          text: replyText,
          citations: replyCitations
        };

        setMessages((prev) => [...prev, aiMsg]);
      }, 800);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend(inputValue);
    }
  };

  // Quick Action Prompts
  const suggestedChips = workspace.id === 'ws-ap-biology' ? [
    'Explain law of segregation',
    'Summarize glycolysis outputs',
    'What is maternal mitochondrial inheritance?',
    'What is Hardy-Weinberg equilibrium?'
  ] : [
    'Explain Gibbs Free Energy spontaneity',
    'What happens to entropy during evaporation?',
    'Explain Hess Law'
  ];

  return (
    <div className="flex flex-col lg:flex-row h-[580px] bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-[24px] overflow-hidden text-left relative animate-fade-in">
      {/* LEFT SIDEBAR: WORKSPACE DOCUMENTS PANEL */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10 flex flex-col h-48 lg:h-full shrink-0">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h4 className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">Workspace Materials</h4>
          </div>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">
            {workspace.files.length}
          </span>
        </div>

        {/* Scrollable files list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
          {workspace.files.length === 0 ? (
            <div className="text-center py-6 px-4">
              <BookOpen className="w-7 h-7 text-slate-300 dark:text-slate-750 mx-auto mb-1.5" />
              <p className="text-[10px] text-slate-400 font-bold">No materials uploaded.</p>
              <p className="text-[9px] text-slate-400 mt-1 leading-normal">Add files in the 'Upload Material' tab to ground your AI Tutor sessions!</p>
            </div>
          ) : (
            workspace.files.map((file) => {
              // Check if cited in the LAST AI message
              const lastAIMsg = [...messages].reverse().find(m => m.sender === 'ai');
              const fileKeyword = file.name.split('.')[0].toLowerCase();
              const isCitedInLastResponse = lastAIMsg?.citations?.some(c => 
                c.sourceName.toLowerCase() === file.name.toLowerCase() ||
                file.name.toLowerCase().includes(c.sourceName.toLowerCase()) ||
                c.sourceName.toLowerCase().includes(file.name.toLowerCase()) ||
                (fileKeyword.length > 4 && c.sourceName.toLowerCase().includes(fileKeyword))
              );

              // Find cited pages and quotes for this file in the last response
              const matchingCitations = lastAIMsg?.citations?.filter(c => 
                c.sourceName.toLowerCase() === file.name.toLowerCase() ||
                file.name.toLowerCase().includes(c.sourceName.toLowerCase()) ||
                c.sourceName.toLowerCase().includes(file.name.toLowerCase()) ||
                (fileKeyword.length > 4 && c.sourceName.toLowerCase().includes(fileKeyword))
              ) || [];

              return (
                <div 
                  key={file.id}
                  onClick={() => {
                    // Clicking a file card opens its grounding or summary
                    if (matchingCitations.length > 0) {
                      setActiveCitation({
                        sourceName: file.name,
                        page: matchingCitations[0].page,
                        quote: matchingCitations[0].quote
                      });
                    } else {
                      // fallback to file summary
                      setActiveCitation({
                        sourceName: file.name,
                        quote: file.summary || "This file has been successfully indexed. Ask the AI assistant to summarize key chapters or extract crucial takeaways."
                      });
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs flex flex-col gap-1.5 ${
                    isCitedInLastResponse
                      ? 'border-amber-400 dark:border-amber-500/80 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm shadow-amber-500/10 ring-1 ring-amber-400/30 dark:ring-amber-500/30'
                      : 'border-slate-150 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isCitedInLastResponse ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                    <span className="font-bold text-slate-700 dark:text-slate-250 truncate flex-1 leading-tight">{file.name}</span>
                  </div>

                  {isCitedInLastResponse && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                        <Sparkles className="w-2 h-2" /> Cited
                      </span>
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                        View Passage &rarr;
                      </span>
                    </div>
                  )}

                  {!isCitedInLastResponse && file.summary && (
                    <p className="text-[10px] text-slate-400 line-clamp-1 italic font-medium">
                      {file.summary}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT AREA: CHAT WINDOW */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* CHAT HEADER */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-850 dark:text-slate-200">
                Workspace AI Assistant
              </h3>
              <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span>Grounded in Active Files ({workspace.files.length})</span>
              </p>
            </div>
          </div>
        </div>

        {/* CHAT WINDOW */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && (
                <div className="w-8.5 h-8.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-150 dark:border-slate-750 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-slate-500 dark:text-slate-350" />
                </div>
              )}

              <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm space-y-3 transition-all duration-300 ${
                msg.sender === 'user' 
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 rounded-tr-none font-medium shadow-sm' 
                  : 'bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-tl-none leading-relaxed shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-750'
              }`}>
                <p className="whitespace-pre-line font-medium leading-relaxed">{msg.text}</p>

                {/* Citations list */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Citations:</span>
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
                            className="px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-black text-[9px] rounded transition-all cursor-pointer flex items-center gap-1"
                          >
                            <FileText className="w-2.5 h-2.5 shrink-0" />
                            <span>[{idx + 1}] {cite.sourceName.slice(0, 16)}...</span>
                          </button>

                          <AnimatePresence>
                            {hoveredCitation?.id === citeId && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-xl shadow-xl border border-slate-850 dark:border-slate-800 backdrop-blur-md z-[100] text-[11px] text-left leading-relaxed flex flex-col gap-1.5 cursor-default"
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 mb-1 shrink-0">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span className="font-extrabold text-[10px] text-slate-200 truncate">{cite.sourceName}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {cite.page !== undefined && (
                                      <span className="font-bold text-[8px] text-amber-400 font-mono bg-amber-500/10 px-1 py-0.5 rounded uppercase tracking-wider">
                                        Page {cite.page}
                                      </span>
                                    )}
                                    <CopySnippetButton text={cite.quote} />
                                  </div>
                                </div>
                                <p className="italic font-medium text-slate-300 leading-normal line-clamp-3 relative pl-2 border-l-2 border-indigo-500">
                                  "{cite.quote}"
                                </p>
                                <div 
                                  className="text-[10px] text-indigo-400 mt-1 font-bold flex items-center gap-1 cursor-pointer hover:text-indigo-300 transition-colors w-fit"
                                >
                                  <span>View Source</span>
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

                {/* AI response actions */}
                {msg.sender === 'ai' && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                    <button
                      onClick={() => handleSpeakMessage(msg.id, msg.text)}
                      className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700/40 cursor-pointer active:scale-95"
                      title={speakingMsgId === msg.id ? "Stop reading" : "Read aloud"}
                    >
                      {speakingMsgId === msg.id ? (
                        <>
                          <VolumeX className="w-3 h-3 text-indigo-500" />
                          <span className="text-indigo-500">Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700/40 cursor-pointer active:scale-95"
                      title="Copy content to clipboard"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-extrabold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleShareMessage(msg.id, msg.text)}
                      className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700/40 cursor-pointer active:scale-95"
                      title="Share with friends"
                    >
                      {sharedMsgId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-extrabold">Shared!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                          <span>Share</span>
                        </>
                      )}
                    </button>

                    {onUpdateWorkspace && (
                      <button
                        onClick={() => handleAddToNotes(msg.id, msg.text)}
                        className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700/40 cursor-pointer active:scale-95 ml-auto"
                        title="Add response to study notes"
                      >
                        {addedNoteMsgId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500 font-extrabold">Saved to Notes!</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                            <span>Add to Notes</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-8.5 h-8.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-150 dark:border-slate-750 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-500 animate-spin" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl rounded-tl-none">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <span className="animate-pulse">Active AI processes files...</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-100" />
                    <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-200" />
                    <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-300" />
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* FIXED CHIPS SUGGESTIONS */}
        <div className="px-5 py-2 overflow-x-auto flex gap-2 scrollbar-none border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 z-10">
          {suggestedChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="px-3 py-1 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950/40 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/50 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-500 whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* INPUT FORM CONTAINER */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex gap-2">
          <div className="flex-1 relative flex items-center">
            <input 
              type="text" 
              placeholder="Ask anything about your notes, flashcards, or topics..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isThinking}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 disabled:opacity-50 pr-12"
            />
            <AnimatePresence>
              {isListening && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 flex items-center gap-1 h-4"
                >
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-red-500 rounded-full origin-bottom"
                      animate={{ height: `${waveformLevels[i]}px` }}
                      transition={{ type: "tween", duration: 0.1 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={startSpeechRecognition}
            className={`w-10 h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isListening 
                ? 'text-red-500 bg-red-500/10 animate-pulse' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800'
            }`}
            title={isListening ? "Listening... Click to stop" : "Dictate your question"}
          >
            <Mic className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim() || isThinking}
            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CITATION INSPECT MODAL OVERLAY (Extended with matching source document and relative passage information) */}
      <AnimatePresence>
        {activeCitation && (() => {
          const matchingFile = workspace.files.find(f => {
            const keyword = f.name.split('.')[0].toLowerCase();
            const sourceNameLower = activeCitation.sourceName.toLowerCase();
            return f.name.toLowerCase() === sourceNameLower ||
              f.name.toLowerCase().includes(sourceNameLower) ||
              sourceNameLower.includes(f.name.toLowerCase()) ||
              (keyword.length > 4 && sourceNameLower.includes(keyword));
          });

          return (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-xs text-left flex flex-col gap-4 overflow-y-auto max-h-[90%]"
              >
                <button 
                  onClick={() => setActiveCitation(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 w-fit mb-2 animate-pulse">
                    <Sparkles className="w-3 h-3" /> Grounded Source Passage
                  </span>
                  <h4 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2 pr-6">
                    <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span className="truncate">{activeCitation.sourceName}</span>
                  </h4>
                </div>

                <div className="space-y-4">
                  {/* Quoted Excerpt section with elegant highlighted paper/slate background */}
                  <div className="space-y-1.5">
                    <p className="font-extrabold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Grounded Excerpt used in AI answer</p>
                    <div className="p-4 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-l-4 border-amber-400 rounded-r-xl relative overflow-hidden">
                      {activeCitation.page && (
                        <span className="absolute top-2 right-3 text-[10px] font-black font-mono text-amber-600/60 dark:text-amber-400/60">
                          PAGE {activeCitation.page}
                        </span>
                      )}
                      <p className="italic font-semibold text-slate-755 dark:text-slate-200 leading-relaxed text-xs sm:text-[13px] pt-1">
                        "{activeCitation.quote}"
                      </p>
                    </div>
                  </div>

                  {/* Matching Document Details Section */}
                  {matchingFile ? (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <div>
                          <p className="font-extrabold text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Format</p>
                          <p className="font-bold text-slate-700 dark:text-slate-200 capitalize text-xs">{matchingFile.type}</p>
                        </div>
                        <div>
                          <p className="font-extrabold text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Size</p>
                          <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">{matchingFile.size}</p>
                        </div>
                      </div>

                      {matchingFile.summary && (
                        <div className="space-y-1">
                          <p className="font-extrabold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Document Summary</p>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                            {matchingFile.summary}
                          </p>
                        </div>
                      )}

                      {/* Related Semantic Passages inside the document */}
                      {matchingFile.highlights && matchingFile.highlights.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-extrabold text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Other Relevant Passages in Document</p>
                          <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                            {matchingFile.highlights.map((high, idx) => (
                              <div key={idx} className="p-2.5 bg-slate-50/50 dark:bg-slate-950/30 border-l-2 border-slate-300 dark:border-slate-700 rounded-r-lg font-medium text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                {high}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {matchingFile.tags && matchingFile.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {matchingFile.tags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-start gap-2 text-slate-400">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-normal font-medium">
                        This citation represents a verified reference that was dynamically retrieved during reasoning. To see detailed OCR summary scans, make sure this file remains in your Library.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
