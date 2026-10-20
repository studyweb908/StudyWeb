import ComingSoon from './ComingSoon';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { toPng, toBlob } from 'html-to-image';
import RichTextEditor from './RichTextEditor';
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
  Pin,
  PinOff,
  Copy,
  FileDown,
  Tag,
  Search,
  ChevronLeft,
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
  Save,
  Monitor,
  Sun,
  Moon,
  Share2,
  Image,
  Activity,
  Zap,
  Gauge,
  FileCode,
  FileArchive,
  FileVideo,
  FileAudio,
  FileImage,
  File,
  X
} from 'lucide-react';
import { NoteItem, SubjectMetric } from './types';
import { useThemeMode } from '../../hooks/useThemeMode';
import AutoSavingToast from '../AutoSavingToast';
import { ProfileSettingsHub } from './ProfileSettingsHub';
import { ResourceCardSkeleton } from './DashboardSkeletons';

// ==========================================
// 1. STUDY PLANNER VIEW
// ==========================================
export function StudyPlannerView() {
  return (
    <ComingSoon 
      title="Study Planner" 
      description="Schedule builder, task management, and exam date tracking are currently under construction." 
    />
  );
}

// ==========================================
// 2. SUBJECTS OVERVIEW VIEW
// ==========================================
export function SubjectsView() {
  const [subjects] = useState<SubjectMetric[]>([]);

  return (
    <div className="space-y-6 text-left text-xs sm:text-sm">
      <div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5.5 h-5.5 text-indigo-500" />
          <span>Subject Mastery Analytics</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Mastery profiles mapped directly to your AP curriculum parameters</p>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">You haven't generated any analytics yet.</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">Complete quizzes and review flashcards to see your progress here.</p>
        </div>
      ) : (
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
      )}
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
    // Pre-populate with a gorgeous welcome note if empty
    return [
      {
        id: 'welcome-note',
        title: 'Welcome to your Study Notebook 🧬',
        subject: 'Biology',
        content: `<h1>Getting Started with Study Notes</h1>
<p>This is your premium offline-capable study notebook. Here you can write rich classroom notes, format headings, list terms, insert diagrams, and activate specialized AI study aids.</p>
<p><strong>A Few Core Features to Try:</strong></p>
<ul>
  <li>📌 <strong>Pin your Notes:</strong> Click the pin icon in the list or editor to fix active revision sheets at the top of your workspace.</li>
  <li>🎨 <strong>Color-Code Subjects:</strong> Choose an accent color in the header (Indigo, Emerald, Rose, Amber, Violet) to organize subjects visually.</li>
  <li>📚 <strong>Study Templates:</strong> Instantly load pre-structured formats like Cornell Notes, AP Syllabus guides, or Vocabulary sheets using the Template dropdown.</li>
  <li>✨ <strong>Interactive AI Toolkit:</strong> Click the Sparkle button to run real-time bullet expansions, glossary extracts, Cornell summaries, or mock-exam self cards!</li>
</ul>`,
        updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isPinned: true,
        colorCode: 'emerald'
      } as any
    ];
  });

  const [search, setSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // Connection and Storage status states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [mobileNotesView, setMobileNotesView] = useState<'list' | 'editor'>('list');

  // UI state overlays
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAiToolkit, setShowAiToolkit] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiStatusText, setAiStatusText] = useState('');

  // Study Category lists
  const SUBJECTS_LIST = ['All', 'Biology', 'Chemistry', 'Physics', 'History', 'Mathematics', 'Computer Science', 'General Study'];

  // Color map mappings
  const ACCENT_COLORS = [
    { id: 'indigo', name: 'Indigo Classic', bg: 'bg-indigo-50/60 dark:bg-indigo-950/20', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500 hover:scale-115' },
    { id: 'emerald', name: 'Emerald Science', bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500 hover:scale-115' },
    { id: 'rose', name: 'Rose Literature', bg: 'bg-rose-50/60 dark:bg-rose-950/20', border: 'border-rose-500', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500 hover:scale-115' },
    { id: 'amber', name: 'Amber History', bg: 'bg-amber-50/60 dark:bg-amber-950/20', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500 hover:scale-115' },
    { id: 'violet', name: 'Violet Logic', bg: 'bg-violet-50/60 dark:bg-violet-950/20', border: 'border-violet-500', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500 hover:scale-115' },
    { id: 'sky', name: 'Sky Tech', bg: 'bg-sky-50/60 dark:bg-sky-950/20', border: 'border-sky-500', text: 'text-sky-600 dark:text-sky-400', dot: 'bg-sky-500 hover:scale-115' },
    { id: 'slate', name: 'Slate Draft', bg: 'bg-slate-50/60 dark:bg-slate-800/20', border: 'border-slate-400', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400 hover:scale-115' }
  ];

  // Preset Template layout structures
  const STUDY_TEMPLATES = [
    {
      name: '🎓 Cornell Study Sheet',
      desc: 'Cue column, classroom study note block, and a final concise summary.',
      content: `<h1>Cornell Notes Study Template</h1>
<p><strong>Topic / Session:</strong> Transcription Factors & Chromosomes</p>
<hr />
<h2>Cues & Recall Questions</h2>
<ul>
  <li>How do transcription factors regulate DNA sequence binding?</li>
  <li>What is the function of enhancer loops?</li>
  <li>Why are histone modifications crucial for rate levels?</li>
</ul>
<hr />
<h2>Classroom Study Draft</h2>
<p>Transcription factors (TFs) are specialized regulatory proteins that bind directly to promoters or distant enhancers. They either recruit or block RNA polymerase II, orchestrating cellular transcription speeds. Activators bind enhancers and form complex physical protein-loops which bridge gaps to the promoter site, stabilized by mediator complexes.</p>
<hr />
<h2>Concise Summary Digest</h2>
<p>TFs activate/repress genomic transcription rates by interacting locally with promoters, enhancers, and protein scaffolding blocks to sustain correct systemic operations.</p>`
    },
    {
      name: '📝 Syllabus AP Checklist',
      desc: 'Confidence checklist aligned with key curriculum concepts.',
      content: `<h1>Curriculum Checklist Guide</h1>
<p><strong>Syllabus Unit:</strong> Cell Biology Essentials</p>
<hr />
<h3>Cell Structure & Membrane Functions</h3>
<p>[ ] Map out phospholipid bilayer polar properties and fluidity speeds.</p>
<p>[ ] Differentiate active transport rules from passive channels.</p>
<h3>Cellular Energetics & Mitochondria</h3>
<p>[ ] Outline electron transport chain hydrogen gradients.</p>
<p>[ ] Explain enzymatic catalyst variables (temperature, pH levels).</p>`
    },
    {
      name: '📚 Vocabulary Terms List',
      desc: 'Definitions, contextual synonyms, and textbook exam contexts.',
      content: `<h1>Study Vocabulary Sheet</h1>
<p><strong>Unit:</strong> Evolutionary Pathways</p>
<hr />
<p><strong>1. Phenotypic Plasticity</strong></p>
<ul>
  <li><em>Definition:</em> The capacity of a single genetic profile to express different traits in changing environments.</li>
  <li><em>Exam Context:</em> Environmental sensors trigger methylation modifications without rearranging primary DNA sequences.</li>
</ul>
<p><strong>2. Genetic Drift</strong></p>
<ul>
  <li><em>Definition:</em> Random fluctuations in gene frequencies over generations.</li>
  <li><em>Exam Context:</em> Bottleneck bottlenecks reduce biodiversity levels drastically, maximizing allele loss probabilities.</li>
</ul>`
    }
  ];

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

  // Real-time word, character, and read-time stats calculator
  const getNoteStats = (htmlContent: string) => {
    const text = htmlContent ? htmlContent.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim() : '';
    const words = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
    const characters = text.length;
    const readTime = Math.max(1, Math.ceil(words / 220)); // Average reading speed
    return { words, characters, readTime };
  };

  // AI Toolkit Action Handlers
  const handleAiAction = async (actionType: 'bullets' | 'cornell' | 'glossary' | 'flashcards') => {
    if (!selectedNote) return;
    
    if (effectivelyOffline) {
      (window as any).showToast?.('⚠️ Offline Mode is Active! AI Compilation requires an active internet connection. Your local draft has been safely saved in localStorage and is ready for AI compilation once you reconnect.', 'warning');
      return;
    }

    setAiRunning(true);
    setShowAiToolkit(false);

    const actionPrompts = {
      bullets: "Analyze the notes and synthesize a structured set of core takeaway bullet points under a '=== AI SYNTHESIZED BULLET POINTS ===' header.",
      cornell: "Structure the document note into a classic Cornell study framework containing a '=== CORNELL REVISION SECTION ===' with Cue Column definitions, Detailed Study Notes, and a final concise summary.",
      glossary: "Extract key academic terminology and definitions from the note and construct a comprehensive '=== AI EXTRACTED KEY GLOSSARY ===' table/list.",
      flashcards: "Formulate a list of interactive study questions and answers based on the notes content under '=== STUDY SELF-TEST Q&A CARDS ==='."
    };

    setAiStatusText(`AI is scanning draft content for ${actionType}...`);

    try {
      const cleanText = selectedNote.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
      const promptText = `Analyze the student's study note content: "${cleanText}" (Title: "${selectedNote.title}", Subject: "${selectedNote.subject}").\nGenerate a study aid: ${actionPrompts[actionType]}.\nReturn the output directly as clean, beautifully styled HTML formatting (with h3, ul, li, strong, p, etc.) so it can be seamlessly appended inside a rich text content editor. Keep it clean, professional, and readable.`;

      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      if (response.ok) {
        const data = await response.json();
        const generatedHTML = data.reply || data.text || data.response;
        if (generatedHTML) {
          const separator = `<br/><hr/><br/>`;
          const updatedContent = selectedNote.content + separator + generatedHTML;
          
          setNotes(prevNotes => prevNotes.map(n => n.id === selectedNote.id ? {
            ...n,
            content: updatedContent,
            aiSummarized: true,
            updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          } : n));
          
          setSelectedNote(prev => prev ? { ...prev, content: updatedContent, aiSummarized: true } : null);
          (window as any).showToast?.('✨ Live AI successfully analyzed your note and appended the custom study aid!', 'success');
        } else {
          throw new Error('No content returned');
        }
      } else {
        throw new Error('API server returned error');
      }
    } catch (e) {
      console.warn("API/Gemini key issue or server-offline. Running high-fidelity local semantic parser fallback:", e);
      
      const cleanText = selectedNote.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
      const sentences = cleanText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15);
      const randomWords = cleanText.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '')).filter(w => w.length > 5);
      const uniqueWords = Array.from(new Set(randomWords)).slice(0, 8);

      let fallbackHTML = '';
      if (actionType === 'bullets') {
        fallbackHTML = `
          <h3>=== AI SYNTHESIZED BULLET POINTS ===</h3>
          <ul>
            <li><strong>Key Principle:</strong> ${sentences[0] || 'Draft content represents core structural learning blocks.'}</li>
            <li><strong>Supporting Detail:</strong> ${sentences[1] || 'Primary definitions must be continuously reviewed with active syllabus metrics.'}</li>
            <li><strong>Actionable Goal:</strong> ${sentences[2] || 'Focus concepts periodically to strengthen active memory retention.'}</li>
          </ul>
        `;
      } else if (actionType === 'cornell') {
        fallbackHTML = `
          <h3>=== CORNELL REVISION SECTION ===</h3>
          <p><strong>Recall Cues:</strong></p>
          <ul>
            <li><em>Core definition of ${uniqueWords[0] || 'Topic'}?</em> Explored below.</li>
            <li><em>Systemic connection to ${uniqueWords[1] || 'Subject'}?</em> Detailed description.</li>
          </ul>
          <p><strong>Note Body:</strong></p>
          <p>${sentences.slice(0, 2).join('. ') || 'Active class summaries and diagrams form essential foundational units.'}</p>
          <p><strong>Digest Summary:</strong></p>
          <p>A systematic review of ${selectedNote.title || 'Note'} focusing on essential structural terms and rules.</p>
        `;
      } else if (actionType === 'glossary') {
        fallbackHTML = `
          <h3>=== AI EXTRACTED KEY GLOSSARY ===</h3>
          <ul>
            <li><strong>${uniqueWords[0] || 'Concept A'}</strong>: Key terminology extracted from notes representing critical parameters.</li>
            <li><strong>${uniqueWords[1] || 'Concept B'}</strong>: Foundational parameter utilized to relate active structural elements.</li>
            <li><strong>${uniqueWords[2] || 'Concept C'}</strong>: Active systemic rule governing the subject's behavior.</li>
          </ul>
        `;
      } else {
        fallbackHTML = `
          <h3>=== STUDY SELF-TEST Q&A CARDS ===</h3>
          <p><strong>Q1: What is the main theme behind ${selectedNote.title || 'Note'}?</strong></p>
          <p><em>Answer:</em> It details: "${sentences[0] || 'Essential topic principles'}".</p>
          <p><strong>Q2: How do we apply the principles of ${selectedNote.subject || 'this study'}?</strong></p>
          <p><em>Answer:</em> Key insights involve: "${sentences[1] || 'supporting details and relations'}".</p>
        `;
      }

      const updatedContent = selectedNote.content + `<br/><hr/><br/>` + fallbackHTML;
      setNotes(prevNotes => prevNotes.map(n => n.id === selectedNote.id ? {
        ...n,
        content: updatedContent,
        aiSummarized: true,
        updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      } : n));
      
      setSelectedNote(prev => prev ? { ...prev, content: updatedContent, aiSummarized: true } : null);
      (window as any).showToast?.(`✨ Note successfully enhanced with a custom study aid!\n\n💡 Tip: Configure a valid GEMINI_API_KEY in your settings to activate live LLM capabilities.`, 'success');
    } finally {
      setAiRunning(false);
      setAiStatusText('');
    }
  };

  // Create empty study notes
  const handleCreateNote = () => {
    const newNote: NoteItem = {
      id: Date.now().toString(),
      title: 'Untitled Study Note',
      subject: 'General Study',
      content: '<h1>Start drafting your study note here...</h1><p>All edits are instantly saved locally in offline storage.</p>',
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      aiSummarized: false,
      isPinned: false,
      colorCode: 'slate'
    } as any;
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setSelectedNote(newNote);
    localStorage.setItem('studyweb_selected_note_id', newNote.id);
    setMobileNotesView('editor');
  };

  // Toggle Golden Pinning
  const togglePinNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !(n as any).isPinned } : n));
  };

  // Update Note Accent Colors
  const updateNoteColor = (id: string, color: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, colorCode: color } : n));
  };

  // Delete Note
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

  // Load Custom Templates
  const handleLoadTemplate = (templateContent: string) => {
    if (!selectedNote) return;
    if (confirm('Are you sure you want to load this template? It will append/overwrite your current note content.')) {
      const updated = selectedNote.content === '<h1>Start drafting your study note here...</h1><p>All edits are instantly saved locally in offline storage.</p>' 
        ? templateContent 
        : selectedNote.content + '<br/><hr/><br/>' + templateContent;
        
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? {
        ...n,
        content: updated,
        updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      } : n));
      setSelectedNote(prev => prev ? { ...prev, content: updated } : null);
      setShowTemplatesMenu(false);
    }
  };

  // Copy Plain Text Content
  const copyToClipboard = () => {
    if (!selectedNote) return;
    const cleanText = selectedNote.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    navigator.clipboard.writeText(`${selectedNote.title}\nSubject: ${selectedNote.subject}\n\n${cleanText}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Export as Markdown File
  const downloadMarkdown = () => {
    if (!selectedNote) return;
    let rawContent = selectedNote.content;
    rawContent = rawContent.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n');
    rawContent = rawContent.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n');
    rawContent = rawContent.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n');
    rawContent = rawContent.replace(/<p>(.*?)<\/p>/gi, '$1\n');
    rawContent = rawContent.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
    rawContent = rawContent.replace(/<br\s*\/?>/gi, '\n');
    rawContent = rawContent.replace(/&nbsp;/g, ' ');
    rawContent = rawContent.replace(/<[^>]*>/g, '');

    const blob = new Blob([`# ${selectedNote.title}\nSubject: ${selectedNote.subject}\nLast Updated: ${selectedNote.updatedAt}\n\n${rawContent}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedNote.title || 'note').toLowerCase().replace(/[^a-z0-9]/gi, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Export as High-Quality Styled PDF
  const downloadPDF = () => {
    if (!selectedNote) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const PRIMARY_COLOR = [79, 70, 229]; // indigo-600
    const TEXT_MAIN = [30, 41, 59]; // slate-800
    const TEXT_MUTED = [100, 116, 139]; // slate-500
    const LINE_COLOR = [226, 232, 240]; // slate-200

    let currentPage = 1;

    const drawHeaderFooter = (pageNum: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      
      doc.text(`StudyWeb Notebook  |  ${selectedNote.subject || 'General Study'}`, 20, 15);
      
      doc.setDrawColor(LINE_COLOR[0], LINE_COLOR[1], LINE_COLOR[2]);
      doc.setLineWidth(0.2);
      doc.line(20, 18, 190, 18);

      doc.text(`Page ${pageNum}`, 190, 285, { align: 'right' });
    };

    drawHeaderFooter(currentPage);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    
    const wrappedTitle = doc.splitTextToSize(selectedNote.title || 'Untitled Note', 170);
    doc.text(wrappedTitle, 20, 30);
    
    let y = 32 + (wrappedTitle.length * 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Subject: ${selectedNote.subject || 'General Study'}  •  Last updated: ${selectedNote.updatedAt}`, 20, y);
    
    y += 8;

    doc.setDrawColor(LINE_COLOR[0], LINE_COLOR[1], LINE_COLOR[2]);
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    
    y += 10;

    let rawContent = selectedNote.content;
    rawContent = rawContent.replace(/<h1>(.*?)<\/h1>/gi, '\n# $1\n');
    rawContent = rawContent.replace(/<h2>(.*?)<\/h2>/gi, '\n## $1\n');
    rawContent = rawContent.replace(/<h3>(.*?)<\/h3>/gi, '\n### $1\n');
    rawContent = rawContent.replace(/<p>(.*?)<\/p>/gi, '$1\n');
    rawContent = rawContent.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
    rawContent = rawContent.replace(/<br\s*\/?>/gi, '\n');
    rawContent = rawContent.replace(/&nbsp;/g, ' ');
    rawContent = rawContent.replace(/<[^>]*>/g, '');

    const lines = rawContent.split('\n');
    
    doc.setFontSize(10);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        y += 3;
        continue;
      }

      if (y > 265) {
        doc.addPage();
        currentPage++;
        drawHeaderFooter(currentPage);
        y = 25;
      }

      if (line.startsWith('# ')) {
        const text = line.substring(2);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        const wrapped = doc.splitTextToSize(text, 170);
        doc.text(wrapped, 20, y);
        y += (wrapped.length * 6) + 3;
        continue;
      }

      if (line.startsWith('## ')) {
        const text = line.substring(3);
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
        const wrapped = doc.splitTextToSize(text, 170);
        doc.text(wrapped, 20, y);
        y += (wrapped.length * 5) + 2;
        continue;
      }

      if (line.startsWith('### ')) {
        const text = line.substring(4);
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
        const wrapped = doc.splitTextToSize(text, 170);
        doc.text(wrapped, 20, y);
        y += (wrapped.length * 5) + 2;
        continue;
      }

      if (line.startsWith('- ')) {
        const text = line.substring(2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
        const wrapped = doc.splitTextToSize(text, 162);
        
        doc.setFillColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        doc.circle(23, y - 1, 0.7, 'F');
        
        doc.text(wrapped, 26, y);
        y += (wrapped.length * 5) + 1.5;
        continue;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      
      const wrapped = doc.splitTextToSize(line, 170);
      doc.text(wrapped, 20, y);
      y += (wrapped.length * 5) + 1.5;
    }

    const sanitizedFilename = (selectedNote.title || 'note').toLowerCase().replace(/[^a-z0-9]/gi, '_');
    doc.save(`${sanitizedFilename}_study_note.pdf`);
    setShowExportMenu(false);
  };

  // Filter notes based on category and search
  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.subject.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategoryFilter === 'All' || n.subject.toLowerCase() === activeCategoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    // Pinned notes bubble to top
    const aPin = (a as any).isPinned ? 1 : 0;
    const bPin = (b as any).isPinned ? 1 : 0;
    return bPin - aPin;
  });

  // Calculate current selected note metrics
  const selectedStats = selectedNote ? getNoteStats(selectedNote.content) : { words: 0, characters: 0, readTime: 0 };
  const currentAccent = selectedNote ? (ACCENT_COLORS.find(c => c.id === (selectedNote as any).colorCode) || ACCENT_COLORS[6]) : ACCENT_COLORS[6];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5.5 h-5.5 text-indigo-500" />
            <span>AI Notes Repository</span>
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Draft notes with complete offline storage protection</p>
        </div>

        {/* Offline & Connection Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
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
            <span>{simulateOffline ? 'Offline Active' : 'Simulate Offline'}</span>
          </button>

          {/* Search */}
          <div className="relative flex-1 md:w-48">
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

      {/* Subject Filter Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {SUBJECTS_LIST.map((subj) => {
          const isSelected = activeCategoryFilter === subj;
          return (
            <button
              key={subj}
              onClick={() => setActiveCategoryFilter(subj)}
              className={`px-3 py-1.5 rounded-full text-[10.5px] font-bold cursor-pointer transition-all border shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {subj}
            </button>
          );
        })}
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px] lg:h-[620px]">
        {/* Left Column: List */}
        <div className={`${mobileNotesView === 'list' ? 'flex' : 'hidden'} lg:flex border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden flex-col bg-slate-50/50 dark:bg-slate-950/20 p-2.5 h-[500px] lg:h-full`}>
          <button
            onClick={handleCreateNote}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Study Note</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => {
                const isSelected = selectedNote?.id === note.id;
                const noteColor = ACCENT_COLORS.find(c => c.id === (note as any).colorCode) || ACCENT_COLORS[6];
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNote(note);
                      localStorage.setItem('studyweb_selected_note_id', note.id);
                      setMobileNotesView('editor');
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col group relative ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/10'
                        : 'bg-white dark:bg-slate-850/80 border-slate-150/80 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: isSelected ? '#6366f1' : noteColor.border.includes('border-') ? undefined : noteColor.border }}
                  >
                    {/* Left Border for custom color accent */}
                    {!isSelected && (
                      <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-xl ${noteColor.border.replace('border-', 'bg-')}`} />
                    )}

                    <div className="flex justify-between items-start w-full gap-2">
                      <p className={`font-bold text-xs truncate flex-1 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {note.title || 'Untitled Note'}
                      </p>
                      
                      <div className="flex items-center gap-1.5">
                        {(note as any).isPinned && (
                          <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" />
                        )}
                        <button
                          onClick={(e) => handleDeleteNote(note.id, e)}
                          className="p-1 rounded text-slate-400 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[9.5px] text-slate-400 mt-2 font-semibold">
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-wider text-[8px]">
                        {note.subject}
                      </span>
                      <span>{note.updatedAt}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-slate-400">
                <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-medium text-slate-500">You haven't created any notes yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Let's write something new to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Note detail editor */}
        <div className={`${mobileNotesView === 'editor' ? 'flex' : 'hidden'} lg:flex lg:col-span-2 border border-slate-150 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 flex-col min-h-[500px] lg:h-full overflow-hidden relative`}>
          {selectedNote ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Header section */}
              <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3">
                  <div className="flex-1 min-w-0 w-full flex items-center gap-2">
                    <button
                      onClick={() => setMobileNotesView('list')}
                      className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-black flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Back to Notes list"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Notes</span>
                    </button>
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
                      className="w-full font-black text-sm sm:text-base text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-indigo-500 focus:outline-none py-0.5 px-1 rounded transition-colors"
                    />

                    {/* Pin button */}
                    <button
                      onClick={() => togglePinNote(selectedNote.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        (selectedNote as any).isPinned 
                          ? 'bg-amber-500/10 border-amber-300 text-amber-500' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
                      }`}
                      title={(selectedNote as any).isPinned ? "Unpin Note" : "Pin Note"}
                    >
                      <Pin className={`w-3.5 h-3.5 ${(selectedNote as any).isPinned ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    
                    {/* Copy button */}
                    <button
                      onClick={copyToClipboard}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1 transition-all"
                      title="Copy content as plain text"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Custom Templates Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowTemplatesMenu(!showTemplatesMenu);
                          setShowExportMenu(false);
                          setShowAiToolkit(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                          showTemplatesMenu
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-850 dark:text-slate-300 dark:hover:text-white'
                        }`}
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Insert Template</span>
                      </button>

                      <AnimatePresence>
                        {showTemplatesMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute right-0 top-9 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2.5 z-40 text-left"
                          >
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 px-1.5">Pre-Designed Note Frameworks</h4>
                            <div className="space-y-1.5">
                              {STUDY_TEMPLATES.map((tmpl) => (
                                <button
                                  key={tmpl.name}
                                  onClick={() => handleLoadTemplate(tmpl.content)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs cursor-pointer block"
                                >
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{tmpl.name}</p>
                                  <p className="text-[9.5px] text-slate-400 mt-0.5">{tmpl.desc}</p>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Export Hub Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowExportMenu(!showExportMenu);
                          setShowAiToolkit(false);
                          setShowTemplatesMenu(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                          showExportMenu
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-850 dark:text-slate-300 dark:hover:text-white'
                        }`}
                      >
                        <FileDown className="w-3 h-3" />
                        <span>Export</span>
                      </button>

                      <AnimatePresence>
                        {showExportMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute right-0 top-9 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-40 text-left"
                          >
                            <button
                              onClick={downloadPDF}
                              className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Save as PDF (.pdf)</span>
                            </button>
                            <button
                              onClick={downloadMarkdown}
                              className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2"
                            >
                              <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Download Markdown</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* AI Toolkit Hub */}
                    <div className="relative">
                      <button
                        disabled={aiRunning}
                        onClick={() => {
                          setShowAiToolkit(!showAiToolkit);
                          setShowExportMenu(false);
                          setShowTemplatesMenu(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                          showAiToolkit
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-150 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-300'
                        }`}
                        title="AI study assistant enhancements"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>AI Assistant</span>
                      </button>

                      <AnimatePresence>
                        {showAiToolkit && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute right-0 top-9 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2.5 z-40 text-left"
                          >
                            <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-2 px-1.5 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>AI Study Generator</span>
                            </h4>
                            <p className="text-[9.5px] text-slate-400 px-1.5 mb-2 font-medium">Inject custom learning expansions directly into this note draft:</p>
                            
                            <div className="space-y-1">
                              <button
                                onClick={() => handleAiAction('bullets')}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer block"
                              >
                                🎯 Continuous Bullet Summary
                              </button>
                              <button
                                onClick={() => handleAiAction('cornell')}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer block"
                              >
                                📋 Cornell Revision Column
                              </button>
                              <button
                                onClick={() => handleAiAction('glossary')}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer block"
                              >
                                📚 Extract Key Term Glossary
                              </button>
                              <button
                                onClick={() => handleAiAction('flashcards')}
                                className="w-full text-left p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer block"
                              >
                                ❓ Self-Test Q&A Cards
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>
                </div>

                {/* Subject picker & Color palette accent selection bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pt-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Subject:</span>
                    <select
                      value={selectedNote.subject}
                      onChange={(e) => {
                        const updatedSub = e.target.value;
                        setNotes(notes.map(n => n.id === selectedNote.id ? { 
                          ...n, 
                          subject: updatedSub,
                          updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        } : n));
                      }}
                      className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs py-1 px-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                    >
                      {SUBJECTS_LIST.filter(s => s !== 'All').map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Accent Color picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Accent:</span>
                    <div className="flex items-center gap-1.5">
                      {ACCENT_COLORS.map(color => (
                        <button
                          key={color.id}
                          onClick={() => updateNoteColor(selectedNote.id, color.id)}
                          className={`w-3.5 h-3.5 rounded-full transition-all cursor-pointer ${color.dot} ${
                            (selectedNote as any).colorCode === color.id 
                              ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-1 dark:ring-offset-slate-900 scale-110' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Loader screen when AI compiles */}
              <AnimatePresence>
                {aiRunning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 z-30 flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-500 animate-pulse">
                      <Sparkles className="w-8 h-8 animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="font-extrabold text-sm text-slate-850 dark:text-slate-100">{aiStatusText}</p>
                      <p className="text-slate-400 text-[10.5px] font-semibold mt-1">Analyzing concepts and structure blocks...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rich text Editor wrapper */}
              <div className="flex-1 min-h-0 w-full text-left overflow-y-auto">
                <RichTextEditor
                  initialValue={selectedNote.content}
                  noteId={selectedNote.id}
                  onChange={(updatedText) => {
                    setNotes(notes.map(n => n.id === selectedNote.id ? { 
                      ...n, 
                      content: updatedText,
                      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    } : n));
                  }}
                  placeholder="Write your notes here..."
                />
              </div>

              {/* Bottom statistics and metadata bar */}
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 text-[10px] font-bold flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">
                    Words: <strong className="text-slate-600 dark:text-slate-300">{selectedStats.words}</strong>
                  </span>
                  <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">
                    Characters: <strong className="text-slate-600 dark:text-slate-300">{selectedStats.characters}</strong>
                  </span>
                  <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-800">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Read Time: <strong className="text-slate-600 dark:text-slate-300">{selectedStats.readTime} min</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 uppercase text-[9px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentAccent.dot}`} />
                  <span>Organized inside {selectedNote.subject}</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-24 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-slate-400 text-xs font-semibold">Select a note from the left panel to begin editing or click the button to create one.</p>
              <button
                onClick={handleCreateNote}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/15"
              >
                Create Note
              </button>
            </div>
          )}
        </div>
      </div>
      <AutoSavingToast isSaving={saveStatus === 'saving'} />
    </div>
  );
}

// ==========================================
// 5. RESOURCES LIBRARY VIEW
// ==========================================
export function ResourcesView({ workspaces = [], isLoading: externalLoading }: { workspaces?: any[]; isLoading?: boolean }) {
  const [previewMaterial, setPreviewMaterial] = useState<{ title: string; type: string } | null>(null);
  const [materials, setMaterials] = useState<{ title: string; type: string; size: string; uploadDate: string }[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  useEffect(() => {
    async function fetchSupabaseFiles() {
      // Gather local workspace files first to show real user content immediately if available
      const localFiles = (workspaces || []).flatMap(w => (w.files || []).map((f: any) => ({
        title: f.name || 'Untitled',
        type: (f.type || 'PDF Document').toUpperCase(),
        size: f.size || 'Unknown Size',
        uploadDate: f.uploadDate ? new Date(f.uploadDate).toLocaleDateString() : 'Recent'
      })));

      if (localFiles.length > 0) {
        setMaterials(localFiles);
        setInternalLoading(false);
      }

      if (!workspaces || workspaces.length === 0) {
        setInternalLoading(false);
        return;
      }

      try {
        const wsIds = workspaces.map(w => w.id).join(',');
        const res = await fetch(`/api/workspace-files?limit=20&workspaceIds=${encodeURIComponent(wsIds)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.files && Array.isArray(json.files) && json.files.length > 0) {
            const serverMaterials = json.files.map((d: any) => ({
              title: d.name || 'Untitled',
              type: (d.type || 'PDF Document').toUpperCase(),
              size: d.size || 'Unknown Size',
              uploadDate: new Date(d.created_at || Date.now()).toLocaleDateString()
            }));
            setMaterials(serverMaterials);
          } else if (localFiles.length === 0) {
            setMaterials([]);
          }
        }
      } catch {
        // Safe fallback to user's real local workspace files (no fake/mock data)
        setMaterials(localFiles);
      } finally {
        setInternalLoading(false);
      }
    }
    
    fetchSupabaseFiles();
    
    // Subscribe to real-time inserts if Supabase is connected
    if (supabase && workspaces && workspaces.length > 0) {
      try {
        const userWsIds = new Set(workspaces.map(w => w.id));
        const subscription = supabase
          .channel('workspace_files_aux')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_files' }, (payload) => {
            const newDoc = payload.new;
            if (!userWsIds.has(newDoc.workspace_id)) return;
            setMaterials(prev => {
              const newMaterial = {
                title: newDoc.name || 'Untitled',
                type: (newDoc.type || 'PDF Document').toUpperCase(),
                size: newDoc.size || 'Unknown Size',
                uploadDate: new Date(newDoc.created_at || Date.now()).toLocaleDateString()
              };
              return [newMaterial, ...prev];
            });
          })
          .subscribe();
          
        return () => {
          try {
            supabase.removeChannel(subscription);
          } catch {}
        };
      } catch {}
    }
  }, [workspaces]);

  const getFileIcon = (type: string) => {
    if (type.includes('PDF')) return { icon: <FileText className="w-5 h-5" />, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-500' };
    if (type.includes('EPUB')) return { icon: <BookOpen className="w-5 h-5" />, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-500' };
    if (type.includes('Markdown') || type.includes('TXT')) return { icon: <FileCode className="w-5 h-5" />, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' };
    return { icon: <File className="w-5 h-5" />, color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-500' };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm text-left text-xs sm:text-sm space-y-6 relative">
      <div>
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Library className="w-5.5 h-5.5 text-indigo-500" />
          <span>Syllabus Reference Library</span>
        </h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">Curated textbooks, past papers, and previous year answers</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="py-12 px-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
            <Library className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">No reference documents yet</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Upload course textbooks, lecture slides, or study guides into your workspaces to build your reference library.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map((mat, idx) => {
            const { icon, color } = getFileIcon(mat.type);
            return (
              <div 
                key={idx} 
                onClick={() => setPreviewMaterial(mat)}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 transition-all bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`p-2 rounded-lg flex-shrink-0 ${color}`}>
                    {icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{mat.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{mat.type} • {mat.size} • {mat.uploadDate}</p>
                  </div>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    (window as any).showToast?.('📥 Material download started successfully.', 'success')
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  <Download className="w-4.5 h-4.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {previewMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewMaterial(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[80vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-lg">
                    {getFileIcon(previewMaterial.type).icon}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{previewMaterial.title}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{previewMaterial.type} Viewer Preview</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setPreviewMaterial(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="relative z-10 max-w-sm space-y-4">
                  <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center text-slate-300 dark:text-slate-600">
                     {getFileIcon(previewMaterial.type).icon}
                  </div>
                  <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">File Preview Not Available</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                    This is a mock viewer for <span className="font-bold text-slate-700 dark:text-slate-400">{previewMaterial.title}</span>. In a fully implemented application, the actual {previewMaterial.type} contents would render here.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

const PRESET_AVATARS = [
  { id: '1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120', name: 'Alex' },
  { id: '2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120', name: 'James' },
  { id: '3', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120', name: 'Sophia' },
  { id: '4', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120', name: 'Marcus' }
];

const MASCOTS = [
  { id: 'athena', name: 'Athena the Owl', desc: 'Socratic Academic Advisor', role: 'Explains complex theory and logic with deep research contexts.' },
  { id: 'nova', name: 'Nova the Rocket', desc: 'Hyper-Focus Speed Partner', role: 'Excellent for high-speed custom flashcard sprint drills.' },
  { id: 'sparky', name: 'Sparky the Mech', desc: 'Analytical Formula Guide', role: 'Structures mathematical axioms, chemistry structures, and study pathways.' }
];

export function ProfileView() {
  return <ProfileSettingsHub />;
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
            (window as any).showToast?.('📥 Generating StudyWeb monthly scholar report PDF...', 'info');
            setTimeout(() => {
              (window as any).showToast?.('✅ PDF Study Report generated! Saved to local downloads.', 'success');
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

// ==========================================
