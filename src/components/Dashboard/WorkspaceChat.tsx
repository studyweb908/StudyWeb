import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  Mic, 
  Paperclip,
  X,
  RotateCcw, 
  Copy, 
  CheckCircle2, 
  Loader2, 
  Pin, 
  ChevronDown, 
  BookOpen, 
  ArrowRight, 
  GraduationCap,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Workspace, WorkspaceFile } from './WorkspaceTypes';
import { useMicrophoneWaveform } from '../../hooks/useMicrophoneWaveform';

export type TutorPersona = 'plain_english' | 'socratic' | 'exam_prep' | 'flashcard';

export const TUTOR_PERSONAS: Record<TutorPersona, {
  name: string;
  icon: string;
  shortDesc: string;
  samplePrompt: string;
}> = {
  plain_english: {
    name: 'Simple Explainer',
    icon: '💡',
    shortDesc: 'Everyday words and easy analogies',
    samplePrompt: 'Explain this in super simple words with an everyday analogy.'
  },
  socratic: {
    name: 'Socratic Guide',
    icon: '🧭',
    shortDesc: 'Step-by-step guided questions',
    samplePrompt: 'Guide me step-by-step to understand this through easy questions.'
  },
  exam_prep: {
    name: 'Quiz & Exam Coach',
    icon: '🎯',
    shortDesc: 'High-yield points and test practice',
    samplePrompt: 'Give me 3 practice quiz questions from my notes with explanations.'
  },
  flashcard: {
    name: 'Quick Flashcards',
    icon: '⚡',
    shortDesc: 'Active memory drill',
    samplePrompt: 'Give me a rapid active-recall flashcard question to test my memory.'
  }
};

export interface Citation {
  sourceName: string;
  page?: number;
  quote: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  source?: string;
  persona?: TutorPersona;
  citations?: Citation[];
  attachedFileNames?: string[];
  isError?: boolean;
  failedPrompt?: string;
  errorCode?: string | number;
  errorDetails?: string;
}

interface AttachedDraftFile {
  id: string;
  name: string;
  size: string;
  type: string;
  content?: string;
  fileObj: File;
}

interface WorkspaceChatProps {
  workspace: Workspace;
  workspaces?: Workspace[];
  onSelectWorkspace?: (ws: Workspace) => void;
  onUpdateWorkspace?: (updated: Workspace) => void;
  onOpenUploadModal?: () => void;
}

export default function WorkspaceChat({
  workspace,
  workspaces,
  onSelectWorkspace,
  onUpdateWorkspace
}: WorkspaceChatProps) {
  // Chat input and state
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [addedNoteMsgId, setAddedNoteMsgId] = useState<string | null>(null);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showFilesList, setShowFilesList] = useState(false);

  // Attached files for the current pending draft message
  const [attachedDrafts, setAttachedDrafts] = useState<AttachedDraftFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active tutor persona (default: Simple Explainer)
  const [activePersona, setActivePersona] = useState<TutorPersona>(() => {
    try {
      const saved = localStorage.getItem(`study_persona_${workspace.id}`);
      if (saved && (saved in TUTOR_PERSONAS)) return saved as TutorPersona;
    } catch {}
    return 'plain_english';
  });

  // Voice dictation state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const waveformLevels = useMicrophoneWaveform(isListening);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean files list for grounding
  const activeFiles = useMemo(() => {
    return (workspace.files || []).map(f => {
      const isPlaceholder = f.summary?.includes("comprehensively outlines") || f.summary?.includes("foundational definitions");
      const cleanSummary = isPlaceholder 
        ? (f.name ? `Study material: ${f.name}` : "Study material in workspace") 
        : f.summary;
      const cleanHighlights = (f.highlights || []).filter((h: string) => 
        !h.includes("Foundational definitions") && 
        !h.includes("Critical frameworks") && 
        !h.includes("Structural analysis") &&
        !h.includes("comprehensively outlines")
      );
      return {
        ...f,
        summary: cleanSummary,
        highlights: cleanHighlights
      };
    });
  }, [workspace.files]);

  // Persistent conversation messages
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(`study_chat_history_${workspace.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    const hasDocs = (workspace.files || []).length > 0;
    return [{
      id: 'welcome-msg',
      sender: 'ai',
      text: hasDocs
        ? `👋 **Hi! I'm your AI Study Tutor for ${workspace.name}!**\n\nI have loaded your **${workspace.files.length} study document${workspace.files.length === 1 ? '' : 's'}**. Ask me anything, speak using the **Voice** button, or attach documents with the **Attach** button!`
        : `👋 **Hi! I'm your AI Study Tutor!**\n\nAsk me any question about your studies, homework, or concepts. You can type, speak using **Voice Input**, or attach notes using **Attach** to get started!`,
      time: 'Just now',
      persona: 'plain_english'
    }];
  });

  // Save persona preference
  useEffect(() => {
    try {
      localStorage.setItem(`study_persona_${workspace.id}`, activePersona);
    } catch {}
  }, [activePersona, workspace.id]);

  // Save chat messages
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(`study_chat_history_${workspace.id}`, JSON.stringify(messages));
      }
    } catch {}
  }, [messages, workspace.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, attachedDrafts]);

  // Reset chat thread
  const handleResetChat = () => {
    if (!window.confirm("Start a new conversation?")) return;
    try {
      localStorage.removeItem(`study_chat_history_${workspace.id}`);
    } catch {}
    const p = TUTOR_PERSONAS[activePersona];
    setMessages([{
      id: `welcome-${Date.now()}`,
      sender: 'ai',
      text: `✨ **Fresh Conversation Started!**\n\nI'm ready in **${p.icon} ${p.name}** mode (*${p.shortDesc}*).\n\nWhat would you like to learn or practice right now?`,
      time: 'Just now',
      persona: activePersona
    }]);
  };

  // File Attachment Handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDrafts: AttachedDraftFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let content: string | undefined = undefined;

      // Read text content for common textual formats
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        try {
          content = await file.text();
        } catch {}
      }

      newDrafts.push({
        id: `draft-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        type: file.type || 'document',
        content,
        fileObj: file
      });
    }

    setAttachedDrafts(prev => [...prev, ...newDrafts]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachedDraft = (id: string) => {
    setAttachedDrafts(prev => prev.filter(f => f.id !== id));
  };

  // Voice input handler
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Save answer to notes
  const handleSaveToNotes = (id: string, text: string) => {
    if (!onUpdateWorkspace) return;

    const firstLine = text.split('\n')[0].replace(/^[#*\s-]+/, '').slice(0, 45);
    const cleanTitle = firstLine ? `AI Tutor: ${firstLine}` : `AI Tutor Note - ${new Date().toLocaleDateString()}`;
    const cleanContent = `<h3>AI Study Tutor Note</h3>\n<p>${text.replace(/\n/g, '<br />')}</p>\n\n<p><em>Saved from AI Tutor in ${workspace.name}.</em></p>`;
    
    const newNote = {
      id: `ai-note-${Date.now()}`,
      title: cleanTitle,
      content: cleanContent,
      updatedAt: new Date().toLocaleDateString(),
      tags: ['AI Tutor', workspace.subject || 'Notes']
    };

    onUpdateWorkspace({
      ...workspace,
      notes: [newNote, ...(workspace.notes || [])]
    });

    setAddedNoteMsgId(id);
    setTimeout(() => setAddedNoteMsgId(null), 2000);
  };

  // Send message
  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputValue).trim();
    if ((!textToSend && attachedDrafts.length === 0) || isThinking) return;

    const currentDrafts = [...attachedDrafts];
    const draftNames = currentDrafts.map(d => d.name);

    // Build user message
    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: textToSend || `Please analyze the attached document: ${draftNames.join(', ')}`,
      attachedFileNames: draftNames.length > 0 ? draftNames : undefined,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setAttachedDrafts([]); // Clear attachment queue
    setIsThinking(true);

    // Convert attached drafts into WorkspaceFile objects
    const newlyConvertedFiles: WorkspaceFile[] = currentDrafts.map(d => {
      const lower = d.name.toLowerCase();
      const fileType: WorkspaceFile['type'] = lower.endsWith('.pdf') 
        ? 'pdf' 
        : lower.match(/\.(png|jpg|jpeg|webp|gif|svg)$/) 
        ? 'image' 
        : lower.match(/\.(mp3|wav|m4a|ogg)$/) 
        ? 'audio' 
        : lower.match(/\.(mp4|webm|mov)$/) 
        ? 'video' 
        : 'doc';

      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: d.name,
        size: d.size,
        type: fileType,
        uploadDate: new Date().toISOString(),
        status: 'indexed',
        tags: ['Attachment', 'Chat Upload'],
        summary: d.content ? d.content.slice(0, 400) : `Uploaded study file: ${d.name}`,
        transcription: d.content,
        highlights: [d.content ? d.content.slice(0, 200) : `Study document: ${d.name}`]
      };
    });

    // Optionally save newly attached files into workspace
    if (onUpdateWorkspace && newlyConvertedFiles.length > 0) {
      onUpdateWorkspace({
        ...workspace,
        files: [...(workspace.files || []), ...newlyConvertedFiles]
      });
    }

    const effectiveFiles = [...activeFiles, ...newlyConvertedFiles];
    const startTime = Date.now();
    const history = messages.slice(-8).map(m => ({
      role: m.sender === 'ai' ? 'model' : 'user',
      content: m.text
    }));

    try {
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg.text,
          history,
          persona: activePersona,
          modelMode: 'auto',
          workspaceId: workspace.id,
          attachedFiles: effectiveFiles,
          citationMode: true
        })
      });

      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        const text = await response.text().catch(() => '');
        const isHtml = text.trim().startsWith('<') || text.includes('<html');
        data = { 
          error: isHtml 
            ? 'Server connection issue (non-JSON response received). Please try again.' 
            : (text || `HTTP ${response.status} ${response.statusText}`),
          details: isHtml ? 'The server returned an HTML response instead of JSON.' : undefined
        };
      }

      if (!response.ok || !data || data.error) {
        const statusCode = response.status || data?.statusCode || 500;
        const originalError = data?.error || data?.message || `Failed to generate response (HTTP ${response.status}).`;
        const errorDetails = data?.details || (typeof data === 'object' ? JSON.stringify(data) : undefined);

        console.error('[WorkspaceChat] Gemini API request failed:', {
          status: response.status,
          statusText: response.statusText,
          statusCode,
          error: originalError,
          model: data?.model,
          correlationId: data?.correlationId,
          details: errorDetails
        });

        const customErr: any = new Error(originalError);
        customErr.statusCode = statusCode;
        customErr.details = errorDetails;
        customErr.model = data?.model;
        throw customErr;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < 400) {
        await new Promise(r => setTimeout(r, 400 - elapsed));
      }

      const aiMsg: Message = {
        id: `msg-ai-${Date.now() + 1}`,
        sender: 'ai',
        text: data.reply || data.text || 'I am ready to help you with your question.',
        citations: data.citations,
        source: data.source || 'Gemini AI',
        persona: (data.personaUsed as TutorPersona) || activePersona,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 400) {
        await new Promise(r => setTimeout(r, 400 - elapsed));
      }

      const statusCode = err?.statusCode || 'Client Error';
      const rawMsg = err?.message || "Failed to communicate with AI Tutor.";
      const isHtmlResponse = rawMsg.includes("<!doctype") || rawMsg.includes("<html");
      const errorMessage = isHtmlResponse 
        ? "Server connection issue (non-JSON response received). Please try again." 
        : rawMsg;

      console.error('[WorkspaceChat] AI Tutor error encountered:', {
        statusCode,
        message: errorMessage,
        model: err?.model,
        details: err?.details
      });

      const aiMsg: Message = {
        id: `msg-ai-${Date.now() + 1}`,
        sender: 'ai',
        text: errorMessage,
        isError: true,
        failedPrompt: userMsg.text,
        source: 'StudyWeb AI',
        persona: activePersona,
        errorCode: statusCode,
        errorDetails: err?.details,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // Minimalist Markdown Formatter
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-sm sm:text-[15px] leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1.5" />;

          // Heading 3
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-extrabold text-base text-slate-900 dark:text-white pt-1">
                {trimmed.replace('### ', '')}
              </h4>
            );
          }
          // Heading 2 or 1
          if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            return (
              <h3 key={idx} className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white pt-1">
                {trimmed.replace(/^#+\s*/, '')}
              </h3>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                <span 
                  className="flex-1"
                  dangerouslySetInnerHTML={{ 
                    __html: content
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                  }} 
                />
              </div>
            );
          }

          // Numbered lists
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 font-mono text-xs mt-0.5">
                  {numMatch[1]}.
                </span>
                <span 
                  className="flex-1"
                  dangerouslySetInnerHTML={{ 
                    __html: numMatch[2]
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                  }} 
                />
              </div>
            );
          }

          // Standard paragraph
          return (
            <p 
              key={idx} 
              dangerouslySetInnerHTML={{ 
                __html: trimmed
                  .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
              }} 
            />
          );
        })}
      </div>
    );
  };

  // Easy starter prompts
  const starterCards = [
    {
      icon: '💡',
      title: 'Explain in simple words',
      prompt: 'Explain the most important concepts from my notes in very simple everyday language.'
    },
    {
      icon: '🎯',
      title: 'Test me with a quiz question',
      prompt: 'Ask me one practice question to test my understanding, and wait for my answer.'
    },
    {
      icon: '🔑',
      title: 'Top 3 key takeaways',
      prompt: 'What are the top 3 key takeaways I must know for an exam?'
    },
    {
      icon: '🌍',
      title: 'Give me a real-life example',
      prompt: 'Give me a fun, relatable real-world example that illustrates the main concept.'
    }
  ];

  return (
    <div className="w-full h-[calc(100vh-130px)] min-h-[620px] flex flex-col bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative font-sans overflow-hidden">
      
      {/* ============================================================== */}
      {/* 1. MINIMALIST TOP HEADER                                       */}
      {/* ============================================================== */}
      <header className="px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0 z-20">
        
        {/* Left: Tutor Branding & Workspace indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-sm shadow-indigo-600/20 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight truncate">
                AI Study Tutor
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online & ready" />
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              {/* Workspace Switcher or Name */}
              {workspaces && workspaces.length > 1 && onSelectWorkspace ? (
                <div className="relative">
                  <button
                    onClick={() => setShowWorkspaceMenu(prev => !prev)}
                    className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors truncate max-w-[160px] sm:max-w-xs"
                  >
                    <span>{workspace.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showWorkspaceMenu && (
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 space-y-0.5">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Switch Study Workspace
                      </div>
                      {workspaces.map(ws => (
                        <button
                          key={ws.id}
                          onClick={() => {
                            onSelectWorkspace(ws);
                            setShowWorkspaceMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                            ws.id === workspace.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{ws.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {ws.files?.length || 0} docs
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                  {workspace.name}
                </span>
              )}

              {/* Source docs count pill */}
              {(workspace.files || []).length > 0 && (
                <button
                  onClick={() => setShowFilesList(prev => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 cursor-pointer transition-colors"
                  title="Click to see loaded documents"
                >
                  <BookOpen className="w-3 h-3 text-indigo-500" />
                  <span>{workspace.files.length} doc{workspace.files.length === 1 ? '' : 's'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Tutor Style Toggle & New Chat Button */}
        <div className="flex items-center gap-2">
          
          {/* Persona Style Dropdown / Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowPersonaMenu(prev => !prev)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200/80 dark:border-slate-700/80"
              title="Change teaching style"
            >
              <span>{TUTOR_PERSONAS[activePersona].icon}</span>
              <span className="hidden sm:inline">{TUTOR_PERSONAS[activePersona].name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {showPersonaMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Tutor Teaching Style
                </div>
                {(Object.keys(TUTOR_PERSONAS) as TutorPersona[]).map(key => {
                  const p = TUTOR_PERSONAS[key];
                  const isCur = activePersona === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setActivePersona(key);
                        setShowPersonaMenu(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 text-xs cursor-pointer ${
                        isCur
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-base mt-0.5">{p.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>{p.name}</span>
                          {isCur && <span className="text-[10px] text-indigo-600 font-bold">Active</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-tight mt-0.5">
                          {p.shortDesc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleResetChat}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700/80"
            title="Start new conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Popover file list if user taps document badge */}
      {showFilesList && (workspace.files || []).length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <span className="text-slate-400 font-medium shrink-0">Study documents:</span>
            {workspace.files.map(f => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium shrink-0"
              >
                <FileText className="w-3 h-3 text-indigo-500" />
                <span className="truncate max-w-[150px]">{f.name}</span>
              </span>
            ))}
          </div>
          <button
            onClick={() => setShowFilesList(false)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-3 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. FULL-WIDTH CONVERSATION AREA                                */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Welcome Card & Starter Suggestions if conversation is fresh */}
          {messages.length <= 1 && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center space-y-5 my-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
                {TUTOR_PERSONAS[activePersona].icon}
              </div>

              <div className="space-y-1.5 max-w-lg mx-auto">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  How can I help you study today?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  I can explain concepts, give you practice quizzes, or break down difficult topics from your notes into simple terms.
                </p>
              </div>

              {/* 4 Easy Starter Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto pt-2 text-left">
                {starterCards.map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(card.prompt)}
                    disabled={isThinking}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-750 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex items-center justify-between group cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{card.icon}</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {card.title}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Stream */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI Avatar */}
              {msg.sender === 'ai' && (
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-sm shrink-0 mt-0.5">
                  <GraduationCap className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble Container */}
              <div className={`space-y-1.5 max-w-2xl ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                
                {/* Bubble */}
                <div className={`p-4 sm:p-5 rounded-3xl ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white font-medium text-[15px] shadow-sm rounded-tr-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-xs'
                }`}>
                  
                  {/* AI Message Header */}
                  {msg.sender === 'ai' && (
                    <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          AI Tutor
                        </span>
                        {msg.persona && TUTOR_PERSONAS[msg.persona] && (
                          <span className="text-[11px] text-slate-400">
                            · {TUTOR_PERSONAS[msg.persona].icon} {TUTOR_PERSONAS[msg.persona].name}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {msg.time}
                      </span>
                    </div>
                  )}

                  {/* Attached files indicator on user message */}
                  {msg.sender === 'user' && msg.attachedFileNames && msg.attachedFileNames.length > 0 && (
                    <div className="mb-2 pb-2 border-b border-indigo-500/40 flex flex-wrap gap-1.5 justify-end">
                      {msg.attachedFileNames.map((fn, fIdx) => (
                        <span
                          key={fIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-700/80 text-white text-[11px] font-semibold"
                        >
                          <Paperclip className="w-3 h-3 text-indigo-200" />
                          <span className="truncate max-w-[150px]">{fn}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Body Text or Error Banner */}
                  {msg.isError ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>
                          {msg.errorCode && msg.errorCode !== 'unknown'
                            ? `Failed to generate response (${msg.errorCode})`
                            : 'Failed to generate response'}
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 dark:text-rose-300 font-normal leading-relaxed break-words">
                        {msg.text || "There was a problem contacting the Gemini API. Please try again."}
                      </p>
                      {msg.failedPrompt && (
                        <button
                          type="button"
                          onClick={() => handleSend(msg.failedPrompt)}
                          disabled={isThinking}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry Question</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    renderMessageContent(msg.text)
                  )}

                  {/* Clean Citation Footnotes */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[11px] font-bold text-slate-400">Sources:</span>
                      {msg.citations.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium"
                        >
                          <BookOpen className="w-3 h-3 text-indigo-500" />
                          <span>{c.sourceName}</span>
                          {c.page && <span className="opacity-70">p.{c.page}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Bubble Actions: Copy & Save to Notes */}
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-3 pl-2 text-xs text-slate-400">
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy text to clipboard"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <span>·</span>

                    <button
                      onClick={() => handleSaveToNotes(msg.id, msg.text)}
                      className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Save answer into your Workspace notes"
                    >
                      {addedNoteMsgId === msg.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Saved to Notes</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5" />
                          <span>Save to Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {msg.sender === 'user' && (
                <div className="w-9 h-9 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  You
                </div>
              )}
            </div>
          ))}

          {/* Thinking Indicator */}
          {isThinking && (
            <div className="flex gap-3.5 items-center">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-sm shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-500 flex items-center gap-2 shadow-xs">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>Thinking of a simple explanation...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MINIMALIST FULL-WIDTH CHAT INPUT DOCK                       */}
      {/* ============================================================== */}
      <footer className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm shrink-0">
        <div className="max-w-3xl mx-auto space-y-2.5">
          
          {/* Attached Files Queue (Visual chips indicating attached documents) */}
          {attachedDrafts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 animate-in fade-in slide-in-from-bottom-1">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 pl-1 shrink-0">
                <Paperclip className="w-3.5 h-3.5" />
                Attached ({attachedDrafts.length}):
              </span>
              {attachedDrafts.map((draft) => (
                <span
                  key={draft.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-850 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{draft.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({draft.size})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachedDraft(draft.id)}
                    className="p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                    title="Remove attached file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Quick suggestion chips above input */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Suggestions:</span>
            {[
              "💡 Explain simply",
              "🎯 Quiz me",
              "🔑 Top takeaways",
              "⚡ Quick flashcard"
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (chip.includes("Explain")) handleSend("Explain the core ideas from my notes in simple everyday language.");
                  else if (chip.includes("Quiz")) handleSend("Ask me a practice quiz question from my notes with multiple choices, and wait for my response.");
                  else if (chip.includes("takeaways")) handleSend("What are the 3 most important takeaways from my study materials?");
                  else handleSend("Give me a quick active recall flashcard question to test my memory.");
                }}
                disabled={isThinking}
                className="px-3 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 dark:bg-slate-850 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold shrink-0 cursor-pointer transition-colors border border-slate-200/60 dark:border-slate-800"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Hidden Native File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Clean Input Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-750 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-xs max-w-full">
            
            {/* 1. ATTACH BUTTON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking}
              className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/70 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 shadow-2xs group"
              title="Attach study material (PDF, image, notes, or document)"
              aria-label="Attach study file"
            >
              <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 transition-colors" />
              <span className="text-xs font-bold hidden sm:inline text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                Attach
              </span>
            </button>

            {/* 2. VOICE INPUT BUTTON */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isThinking}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/25 animate-pulse'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/70 dark:hover:bg-slate-750 border-slate-200/90 dark:border-slate-700 shadow-2xs group'
              }`}
              title={isListening ? "Listening... click to stop" : "Voice Input: Speak your question"}
              aria-label="Voice Input"
            >
              {isListening ? (
                <>
                  <div className="flex items-center gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1 bg-white rounded-full animate-bounce"
                        style={{ height: `${waveformLevels[i] || 12}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-white">Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 transition-colors" />
                  <span className="text-xs font-bold hidden sm:inline text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                    Voice
                  </span>
                </>
              )}
            </button>

            {/* Input Box */}
            <input
              ref={inputRef}
              type="text"
              placeholder={
                attachedDrafts.length > 0 
                  ? "Instructions for document..." 
                  : "Ask your AI tutor..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isThinking}
              className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 bg-transparent text-xs sm:text-base font-normal text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={(!inputValue.trim() && attachedDrafts.length === 0) || isThinking}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-indigo-600/25 shrink-0 active:scale-95"
              title="Send message"
            >
              {isThinking ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>

        </div>
      </footer>

    </div>
  );
}
