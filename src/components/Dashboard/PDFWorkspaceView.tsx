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
  Share2,
  Clipboard,
  MessageSquare,
  FileUp,
  Download,
  Flame,
  AlertCircle,
  MousePointer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PDFDocument } from './types';
import AutoSavingToast from '../AutoSavingToast';

const DOCUMENT_PAGES: Record<string, { page: number; paragraphs: string[] }[]> = {
  'ap-bio-genetics': [
    {
      page: 1,
      paragraphs: [
        "Gregor Mendel's law of segregation states that the two alleles for each gene separate during gamete formation.",
        "Mendelian inheritance patterns are the foundation of classical genetics. By cross-pollinating pea plants with distinct traits, Mendel discovered that traits are inherited as discrete units (which we now call genes).",
        "The Law of Independent Assortment states that genes for different traits can segregate independently during the formation of gametes. This is illustrated in a dihybrid cross.",
        "Dihybrid crosses yield a phenotypic ratio of 9:3:3:1, representing the principle of independent assortment under simple dominant-recessive inheritance."
      ]
    },
    {
      page: 2,
      paragraphs: [
        "Incomplete dominance results in a blended phenotype, as seen in pink snapdragons produced from red and white parents.",
        "Codominance is a different pattern where both alleles are simultaneously expressed in the heterozygote. A classic example is the ABO blood group system in humans, where the A and B alleles are codominant.",
        "Sex-linked traits are located on the sex chromosomes (usually the X chromosome). Hemophilia and red-green colorblindness are well-known examples of X-linked recessive disorders."
      ]
    }
  ],
  'ap-chem-thermo': [
    {
      page: 1,
      paragraphs: [
        "Gibbs Free Energy equation: ΔG = ΔH - TΔS determines the thermodynamic spontaneity of any chemical reaction.",
        "A chemical reaction is spontaneous when ΔG is negative, which is heavily favored by exothermic conditions (-ΔH).",
        "Enthalpy (ΔH) represents the total heat content of a system, while Entropy (ΔS) represents the degree of disorder or randomness."
      ]
    },
    {
      page: 2,
      paragraphs: [
        "The third law of thermodynamics states that the entropy of a perfect crystal at absolute zero is exactly equal to zero.",
        "Spontaneous endothermic reactions are driven entirely by a large positive change in entropy (ΔS), which overcomes the positive ΔH at higher temperatures.",
        "Standard Gibbs Free Energy change can also be calculated from equilibrium constants using the relation ΔG° = -RT ln(K)."
      ]
    }
  ]
};

const getDocPages = (docId: string, docName: string, highlights: string[] = []) => {
  const customPages = DOCUMENT_PAGES[docId];
  if (customPages) return customPages;

  // Otherwise, let's generate on the fly
  const cleanName = docName.replace('.pdf', '');
  return [
    {
      page: 1,
      paragraphs: [
        `Fundamental analysis of ${cleanName}. This introductory chapter details the core framework, initial formulations, and quantitative paradigms.`,
        highlights[0] || `Experimental researchers observe that ${cleanName} components stabilize under controlled ambient conditions.`,
        "This dynamic baseline acts as a control model for advanced synthesis and long-term testing protocols.",
        "Ensure all reference datasets are calibrated against the secondary benchmarks described in Section 4.2."
      ]
    },
    {
      page: 2,
      paragraphs: [
        highlights[1] || `Case study formulations demonstrating practical adaptations of ${cleanName} in contemporary academic environments.`,
        "Key takeaways emphasize the correlation of independent systems acting in absolute equilibrium.",
        "Review exercises at the end of this chapter are recommended to consolidate exam targets."
      ]
    }
  ];
};

const COLOR_MAP = {
  yellow: {
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    border: 'border-amber-400 dark:border-amber-500/40',
    text: 'text-amber-950 dark:text-amber-100',
    marker: 'bg-amber-400 text-amber-950',
    sticky: 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-900/50 shadow-amber-500/5'
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-500/20',
    border: 'border-pink-400 dark:border-pink-500/40',
    text: 'text-pink-950 dark:text-pink-100',
    marker: 'bg-pink-400 text-pink-950',
    sticky: 'bg-pink-50/95 dark:bg-pink-950/90 border-pink-200 dark:border-pink-900/50 shadow-pink-500/5'
  },
  green: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/20',
    border: 'border-emerald-400 dark:border-emerald-500/40',
    text: 'text-emerald-950 dark:text-emerald-100',
    marker: 'bg-emerald-400 text-emerald-950',
    sticky: 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-900/50 shadow-emerald-500/5'
  },
  blue: {
    bg: 'bg-cyan-100 dark:bg-cyan-500/20',
    border: 'border-cyan-400 dark:border-cyan-500/40',
    text: 'text-cyan-950 dark:text-cyan-100',
    marker: 'bg-cyan-400 text-cyan-950',
    sticky: 'bg-cyan-50/95 dark:bg-cyan-950/90 border-cyan-200 dark:border-cyan-900/50 shadow-cyan-500/5'
  }
};

interface StickyNote {
  id: string;
  text: string;
  color: 'yellow' | 'pink' | 'green' | 'blue';
  page: number;
  paragraphIndex: number;
  createdAt: string;
}

import { Workspace } from './WorkspaceTypes';

interface PDFWorkspaceViewProps {
  workspace?: Workspace;
  onUpdateWorkspace?: (updated: Workspace) => void;
}

export default function PDFWorkspaceView({ workspace, onUpdateWorkspace }: PDFWorkspaceViewProps) {
  // Copy, share, note success feedback trackers
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [sharedMsgIdx, setSharedMsgIdx] = useState<number | null>(null);
  const [addedNoteMsgIdx, setAddedNoteMsgIdx] = useState<number | null>(null);

  const handleCopyMessage = (idx: number, text: string) => {
    const cleanText = text.replace(/<[^>]+>/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const handleShareMessage = async (idx: number, text: string) => {
    const cleanText = text.replace(/<[^>]+>/g, '');
    const shareData = {
      title: 'StudyWeb AI Document Learning Briefing',
      text: cleanText,
      url: window.location.href
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setSharedMsgIdx(idx);
        setTimeout(() => setSharedMsgIdx(null), 2000);
        return;
      } catch (err) {
        console.warn('Native share failed, falling back to copy:', err);
      }
    }
    const formattedShareText = `StudyWeb AI Document Insight 🧠\n\n"${cleanText}"\n\nShared from StudyWeb Learning Hub: ${window.location.href}`;
    navigator.clipboard.writeText(formattedShareText);
    setSharedMsgIdx(idx);
    setTimeout(() => setSharedMsgIdx(null), 2000);
  };

  const handleAddToNotes = (idx: number, text: string) => {
    if (!onUpdateWorkspace || !workspace) return;

    const cleanText = text.replace(/<[^>]+>/g, '');
    const cleanTitle = `PDF Insight: ${cleanText.slice(0, 35).replace(/[\n#*`]/g, '')}...`;
    const cleanContent = `<h3>AI Document Insight</h3>\n<p>${text}</p>\n\n<p><em>Generated inside **${workspace.name}** active document reader.</em></p>`;
    
    const newNote = {
      id: `ai-pdf-note-${Date.now()}`,
      title: cleanTitle,
      content: cleanContent,
      updatedAt: new Date().toLocaleDateString(),
      tags: ['PDF Reader', 'Grounded Insight', workspace.subject || 'Syllabus'].filter(Boolean) as string[],
    };

    const updatedWorkspace = {
      ...workspace,
      notes: [newNote, ...(workspace.notes || [])]
    };

    onUpdateWorkspace(updatedWorkspace);
    setAddedNoteMsgIdx(idx);
    setTimeout(() => setAddedNoteMsgIdx(null), 2000);
  };

  // Customizable category labels for each color
  const [colorLabels, setColorLabels] = useState<Record<'yellow' | 'pink' | 'green' | 'blue', string>>({
    yellow: 'Main Ideas',
    pink: 'Important Quotes',
    green: 'Key Terms',
    blue: 'Questions/Revision'
  });

  // Pre-populate with beautiful, detailed sample files to look realistic and attractive instantly
  const [documents, setDocuments] = useState<PDFDocument[]>([
    {
      id: 'ap-bio-genetics',
      name: 'AP Biology - Genetics & Heredity.pdf',
      size: '6.4 MB',
      pages: 18,
      highlights: [
        "Gregor Mendel's law of segregation states that the two alleles for each gene separate during gamete formation.",
        "Dihybrid crosses yield a phenotypic ratio of 9:3:3:1, representing the principle of independent assortment.",
        "Incomplete dominance results in a blended phenotype, as seen in pink snapdragons produced from red and white parents."
      ],
      highlightColors: {
        "Gregor Mendel's law of segregation states that the two alleles for each gene separate during gamete formation.": 'green',
        "Dihybrid crosses yield a phenotypic ratio of 9:3:3:1, representing the principle of independent assortment.": 'yellow',
        "Incomplete dominance results in a blended phenotype, as seen in pink snapdragons produced from red and white parents.": 'pink'
      }
    },
    {
      id: 'ap-chem-thermo',
      name: 'AP Chemistry - Thermodynamics.pdf',
      size: '4.2 MB',
      pages: 12,
      highlights: [
        "Gibbs Free Energy equation: ΔG = ΔH - TΔS determines the thermodynamic spontaneity of any chemical reaction.",
        "A chemical reaction is spontaneous when ΔG is negative, which is heavily favored by exothermic conditions (-ΔH).",
        "The third law of thermodynamics states that the entropy of a perfect crystal at absolute zero is exactly equal to zero."
      ],
      highlightColors: {
        "Gibbs Free Energy equation: ΔG = ΔH - TΔS determines the thermodynamic spontaneity of any chemical reaction.": 'green',
        "A chemical reaction is spontaneous when ΔG is negative, which is heavily favored by exothermic conditions (-ΔH).": 'yellow',
        "The third law of thermodynamics states that the entropy of a perfect crystal at absolute zero is exactly equal to zero.": 'blue'
      }
    }
  ]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(['ap-bio-genetics', 'ap-chem-thermo']);
  const [aiChatLogs, setAiChatLogs] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { 
      sender: 'ai', 
      text: "Hello Alex! I have fully indexed your active documents: **AP Biology - Genetics** and **AP Chemistry - Thermodynamics**.\n\nI can help you analyze complex formulas, summarize chapters, or create instant quiz flashcards based on your highlighted passages. Ask me anything or click one of the synthesis cards below!" 
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [activeHighlight, setActiveHighlight] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  // Active viewing states
  const [viewingDocId, setViewingDocId] = useState<string>('ap-bio-genetics');
  const [centerTab, setCenterTab] = useState<'view' | 'citations'>('view');
  const [activePage, setActivePage] = useState<number>(1);
  const [annotationMode, setAnnotationMode] = useState<'select' | 'highlight' | 'sticky'>('select');
  const [highlightColor, setHighlightColor] = useState<'yellow' | 'pink' | 'green' | 'blue'>('yellow');
  const [draftingNoteForParagraph, setDraftingNoteForParagraph] = useState<number | null>(null);
  const [newNoteText, setNewNoteText] = useState<string>('');
  
  // Sticky notes map
  const [stickyNotes, setStickyNotes] = useState<Record<string, StickyNote[]>>({
    'ap-bio-genetics': [
      {
        id: 'note-1',
        text: 'Mendel is often called the Father of Modern Genetics. Remember his 3 main laws!',
        color: 'yellow',
        page: 1,
        paragraphIndex: 1,
        createdAt: '10:15 AM'
      }
    ],
    'ap-chem-thermo': [
      {
        id: 'note-2',
        text: 'Be extremely careful with units! ΔH is usually in kJ, while ΔS is in J/K.',
        color: 'blue',
        page: 1,
        paragraphIndex: 0,
        createdAt: '11:02 AM'
      }
    ]
  });

  // Auto-save simulation on changes
  React.useEffect(() => {
    setIsSaving(true);
    const timer = setTimeout(() => {
      setIsSaving(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [documents, selectedDocIds, aiChatLogs, stickyNotes, viewingDocId, activePage, annotationMode, highlightColor]);

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

  const toggleHighlightParagraph = (docId: string, paragraphText: string) => {
    setDocuments(prevDocs => 
      prevDocs.map(d => {
        if (d.id === docId) {
          const isAlreadyHighlighted = d.highlights.includes(paragraphText);
          let newHighlights;
          const currentColors = { ...(d.highlightColors || {}) };
          if (isAlreadyHighlighted) {
            newHighlights = d.highlights.filter(h => h !== paragraphText);
            delete currentColors[paragraphText];
          } else {
            newHighlights = [...d.highlights, paragraphText];
            currentColors[paragraphText] = highlightColor;
          }
          return {
            ...d,
            highlights: newHighlights,
            highlightColors: currentColors
          };
        }
        return d;
      })
    );
  };

  const saveStickyNote = (docId: string, page: number, paragraphIndex: number, text: string, color: 'yellow' | 'pink' | 'green' | 'blue') => {
    if (!text.trim()) return;
    const newNote: StickyNote = {
      id: `note-${Date.now()}`,
      text,
      color,
      page,
      paragraphIndex,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setStickyNotes(prev => {
      const existing = prev[docId] || [];
      const filtered = existing.filter(n => !(n.page === page && n.paragraphIndex === paragraphIndex));
      return {
        ...prev,
        [docId]: [...filtered, newNote]
      };
    });

    setDraftingNoteForParagraph(null);
    setNewNoteText('');
  };

  const deleteStickyNote = (docId: string, noteId: string) => {
    setStickyNotes(prev => {
      const existing = prev[docId] || [];
      return {
        ...prev,
        [docId]: existing.filter(n => n.id !== noteId)
      };
    });
  };

  const activeViewingDoc = documents.find(d => d.id === viewingDocId) || documents[0];
  const docPages = activeViewingDoc ? getDocPages(activeViewingDoc.id, activeViewingDoc.name, activeViewingDoc.highlights) : [];
  const totalPages = docPages.length;
  const clampedPage = Math.min(Math.max(1, activePage), totalPages || 1);
  const activePageData = docPages[clampedPage - 1];

  // Upload simulation with beautiful status feedback
  const handleUploadPDF = () => {
    const customNames = [
      'AP US History - Civil War Era.pdf', 
      'AP Calculus BC - Taylor Series.pdf', 
      'AP Physics 1 - Rotational Dynamics.pdf'
    ];
    const chosenName = customNames[Math.floor(Math.random() * customNames.length)];
    const chosenId = Date.now().toString();
    
    let highlights: string[] = [];
    if (chosenName.includes('History')) {
      highlights = [
        "The Gettysburg Address redefined the American Civil War as a struggle for human equality and national unity.",
        "The Missouri Compromise of 1820 attempted to maintain a balance of power between slave and free states."
      ];
    } else if (chosenName.includes('Calculus')) {
      highlights = [
        "A Taylor series represents an infinitely differentiable function as an infinite sum of terms calculated from its derivatives.",
        "The Lagrange error bound provides a rigorous maximum value for the remainder of a Taylor polynomial approximation."
      ];
    } else {
      highlights = [
        "Torque (τ = rF sin θ) is the rotational equivalent of linear force, causing angular acceleration of a rigid body.",
        "Conservation of angular momentum dictates that a spinning ice skater rotates faster as they pull their arms inward."
      ];
    }

    const newDoc: PDFDocument = {
      id: chosenId,
      name: chosenName,
      size: `${(Math.random() * 3 + 2).toFixed(1)} MB`,
      pages: Math.floor(Math.random() * 10) + 12,
      highlights: highlights,
      highlightColors: highlights.reduce((acc, cur, idx) => {
        acc[cur] = (idx % 4 === 0 ? 'green' : idx % 4 === 1 ? 'yellow' : idx % 4 === 2 ? 'pink' : 'blue') as 'yellow' | 'pink' | 'green' | 'blue';
        return acc;
      }, {} as Record<string, 'yellow' | 'pink' | 'green' | 'blue'>)
    };

    setDocuments([...documents, newDoc]);
    setSelectedDocIds([...selectedDocIds, chosenId]);
    
    // Add custom system log to chat
    setAiChatLogs(prev => [
      ...prev, 
      { 
        sender: 'ai', 
        text: `📥 **Successfully imported and indexed "${chosenName}"!** I detected ${highlights.length} critical concepts and synchronized them to your highlight citation board.` 
      }
    ]);
  };

  const handleRemoveDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDocs = documents.filter(d => d.id !== id);
    setDocuments(newDocs);
    const newSelected = selectedDocIds.filter(docId => docId !== id);
    if (newSelected.length === 0 && newDocs.length > 0) {
      setSelectedDocIds([newDocs[0].id]);
    } else {
      setSelectedDocIds(newSelected);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Run AI operations specifically targeting selected PDFs
  const runAiDocAction = async (action: string) => {
    setLoadingAction(action);
    const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id));
    const selectedNames = selectedDocs.map(d => d.name).join(', ');
    const selectedHighlights = selectedDocs.flatMap(d => d.highlights).join('\n');

    let actionPrompt = '';
    if (action === 'summary') {
      actionPrompt = `Generate a highly detailed academic summary of the documents: ${selectedNames}. 
Focus on explaining key formulas, models, and concepts with exact reasoning.
Here are key passages for context:
${selectedHighlights}`;
    } else if (action === 'formulas') {
      actionPrompt = `Extract all mathematical equations, scientific formulas, or logical axioms from the documents: ${selectedNames}.
Provide clear LaTeX equations and brief definitions of all variables.
Context:
${selectedHighlights}`;
    } else if (action === 'flashcards') {
      actionPrompt = `Generate a set of 3 practice flashcards with Questions and Answers matching the concepts in: ${selectedNames}.
Keep it interactive and direct.
Context:
${selectedHighlights}`;
    }

    try {
      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: actionPrompt,
          deepResearch: true,
          citationMode: true,
          attachedFiles: selectedDocs.map(d => ({ name: d.name, type: "PDF Document" })),
          model: "auto"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact Nvidia NIM AI engine");
      }

      const data = await response.json();
      setAiChatLogs(prev => [...prev, { sender: 'ai', text: data.text || "No response received." }]);
    } catch (err) {
      console.warn("Falling back to simulated answers because:", err);
      let result = '';
      if (action === 'summary') {
        result = `### Executive Summary: ${selectedNames}\n\nHere is a comprehensive conceptual synthesis compiled from your selected sources:\n\n* **Primary Directives & Core Models**: Detailed analysis of inheritance segregations (AP Biology) and thermal kinetics spontaneity laws (AP Chemistry).\n* **Mathematical & Visual Proofs**: Independent assortment ratios verify the 9:3:3:1 phenotypic standard, while Gibbs free energy ($ΔG = ΔH - TΔS$) proves non-equilibrium spontaneous system shifts.\n* **Essential Formula Pacing**: Exothermic interactions satisfy entropy trends dynamically at ambient temperatures.\n\n*This summary is linked directly to your AP Exam targets.*`;
      } else if (action === 'formulas') {
        result = `### Extracted Formulas & Axioms 📐\n\nIdentified in active workspace documents:\n\n* **AP Biology Heredity**: Phenotypic crosses represented by $P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$.\n* **AP Chemistry Thermodynamics**: \n  $$ΔG^\\circ = -RT \\ln(K)$$\n  Determines chemical equilibrium constants mathematically using absolute gas variables ($R = 8.314\\text{ J/mol}\\cdot\\text{K}$).\n* **Mechanical Torque & Vectors**: Angular momentum values given by $L = I\\omega$.`;
      } else if (action === 'flashcards') {
        result = `### Custom Study Flashcards Generated 🚀\n\n1. **Q**: What causes pink snapdragons to inherit their blended color pattern?\n   **A**: Incomplete dominance where neither allele is fully dominant over the other, creating a pink phenotype in heterozygotes.\n\n2. **Q**: What specific value does absolute zero represent for a perfect crystal's entropy?\n   **A**: Under the Third Law of Thermodynamics, its entropy is exactly equal to zero.\n\n*These flashcards have been dynamically added to your global AP Deck!*`;
      }
      setAiChatLogs(prev => [...prev, { sender: 'ai', text: result }]);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setAiChatLogs(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setLoadingAction('chat');

    try {
      const activeDocs = documents.filter(d => selectedDocIds.includes(d.id));
      const activeNames = activeDocs.map(d => d.name).join(', ');
      const activeHighlights = activeDocs.flatMap(d => d.highlights).join('\n');

      const fullPrompt = `The student is asking a question specifically about these active documents: "${activeNames}".
      
Selected Highlights / Passages for reference:
${activeHighlights}

Student Question:
"${userText}"`;

      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          deepResearch: true,
          citationMode: true,
          attachedFiles: activeDocs.map(d => ({ name: d.name, type: "PDF Document" })),
          model: "auto"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact Llama 3.3 NIM engine");
      }

      const data = await response.json();
      setAiChatLogs(prev => [...prev, {
        sender: 'ai',
        text: data.text || "No response received."
      }]);
    } catch (err) {
      console.warn("Falling back on simulated answer because:", err);
      const activeNames = documents.filter(d => selectedDocIds.includes(d.id)).map(d => d.name.replace('.pdf', '')).join(', ');
      setAiChatLogs(prev => [...prev, {
        sender: 'ai',
        text: `Based on your selected materials (${activeNames}), here is the direct contextual answer:\n\n* **Answer Synthesis**: The materials highlight that a process becomes thermodynamically favored and spontaneous when $ΔG < 0$. Under extreme conditions, molecular separation speeds up, which is critical for AP Biology replication sequences.\n* **Exact Citation**: Refer to AP Chemistry Chapter 12: Section 3, subsection 2.2 on thermal molecular reactions.\n\nWould you like me to generate a set of practice questions matching this topic?`
      }]);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] lg:h-[calc(100vh-100px)] flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xl text-left text-xs sm:text-sm">
      {/* LEFT COLUMN: PDF Sources (Notebook style) */}
      <div className="w-full lg:w-80 min-h-[350px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                <BookMarked className="w-5 h-5 text-indigo-500" />
                <span>Source Notebooks</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Syllabus materials</p>
            </div>
            
            {/* Elegant trigger with hover tooltip */}
            <button
              onClick={handleUploadPDF}
              className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50"
              title="Add document"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick upload drop-zone */}
          <div 
            onClick={handleUploadPDF}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-500/60 dark:border-slate-800 dark:hover:border-indigo-500/40 rounded-2xl p-4 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/30 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all duration-300 group"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-850 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors shadow-sm">
                <FileUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Import AP Study Guide</p>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Drag & drop or click to simulate upload</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
              <span>Active Documents ({documents.length})</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>

            <div className="space-y-2.5 max-h-[220px] lg:max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              {documents.length === 0 && (
                <div className="text-center py-8 text-slate-400 font-medium">
                  No study guides uploaded. Click the container above to add AP source files.
                </div>
              )}
              {documents.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                const isViewing = viewingDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setViewingDocId(doc.id);
                      setActivePage(1);
                      setCenterTab('view');
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-350 relative group ${
                      isViewing 
                        ? 'bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/15 dark:to-violet-500/15 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/10 dark:ring-indigo-500/20 text-indigo-900 dark:text-indigo-400 shadow-md' 
                        : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-850 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`p-2 rounded-xl transition-colors shrink-0 ${isViewing ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <FileText className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-extrabold text-xs tracking-tight ${isViewing ? 'text-slate-900 dark:text-white font-black' : 'text-slate-800 dark:text-slate-200'}`}>{doc.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-slate-400 font-semibold">{doc.pages} Pages</span>
                          <span className="text-[8px] text-slate-300 dark:text-slate-700 font-bold">•</span>
                          <span className="text-[9px] text-slate-400 font-semibold">{doc.size}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0 self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDoc(doc.id);
                          }}
                          className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer border transition-colors shrink-0 ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700' 
                              : 'border-slate-300 dark:border-slate-700 text-transparent hover:border-indigo-500'
                          }`}
                          title={isSelected ? "Uncheck from AI Tutor index" : "Check to include in AI Tutor index"}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button
                          onClick={(e) => handleRemoveDoc(doc.id, e)}
                          className="p-1 rounded-lg text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
                          title="Delete PDF source"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notebook Summary Info */}
        <div className="pt-5 border-t border-slate-200/80 dark:border-slate-800 space-y-2 mt-6 lg:mt-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Focus Context</p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-500">Query Target:</span>
            <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded-md border border-indigo-500/10">{selectedDocIds.length} AP Guides</span>
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: Document Viewer / Highlight Compiler */}
      <div className="flex-1 min-h-[500px] lg:min-h-0 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800/65">
        <div className="space-y-6">
          {/* TAB BAR AND CONTROLS */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl w-full sm:w-auto shrink-0 border border-slate-200/40 dark:border-slate-800/50">
              <button
                onClick={() => setCenterTab('view')}
                className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  centerTab === 'view'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-md shadow-slate-200/10 dark:shadow-none'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Document Reader</span>
              </button>
              <button
                onClick={() => setCenterTab('citations')}
                className={`flex-1 sm:flex-none py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  centerTab === 'citations'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-md shadow-slate-200/10 dark:shadow-none'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                <span>Highlights Board</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  const activeDocs = documents.filter(d => selectedDocIds.includes(d.id));
                  if (activeDocs.length === 0) return;
                  const text = activeDocs.map(d => `Source: ${d.name}\n${d.highlights.join('\n')}`).join('\n\n');
                  copyToClipboard(text, 'share-all');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer text-[10px] sm:text-xs font-bold shadow-sm"
                title="Copy all citations"
              >
                <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                <span>{copiedIndex === 'share-all' ? 'Copied!' : 'Copy All'}</span>
              </button>
              
              <button
                onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 transition-all cursor-pointer text-[10px] sm:text-xs font-bold"
                title="Toggle AI Chat Panel"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>{isAiPanelOpen ? 'Hide Chat' : 'Show Chat'}</span>
              </button>
            </div>
          </div>

          {/* Interactive view container */}
          {centerTab === 'view' ? (
            <div className="space-y-5">
              {/* PDF ANNOTATION TOOLBAR */}
              {!activeViewingDoc ? (
                <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <HelpCircle className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-3">Select or upload a study textbook to begin reading & annotating.</p>
                </div>
              ) : (
                <>
                  {/* Active Tool Selectors */}
                  <div className="flex flex-col gap-3.5 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mr-1.5">Annotation Tools:</span>
                        
                        {/* Selector Tool */}
                        <button
                          onClick={() => {
                            setAnnotationMode('select');
                            setDraftingNoteForParagraph(null);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                            annotationMode === 'select'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                          title="Cursor select and question AI mode"
                        >
                          <MousePointer className="w-3.5 h-3.5" />
                          <span>Select Mode</span>
                        </button>

                        {/* Highlight Tool */}
                        <button
                          onClick={() => {
                            setAnnotationMode('highlight');
                            setDraftingNoteForParagraph(null);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                            annotationMode === 'highlight'
                              ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                          title="Click lines to highlight"
                        >
                          <Highlighter className="w-3.5 h-3.5" />
                          <span>Highlight Tool</span>
                        </button>

                        {/* Sticky Note Tool */}
                        <button
                          onClick={() => {
                            setAnnotationMode('sticky');
                            setDraftingNoteForParagraph(null);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                            annotationMode === 'sticky'
                              ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                          title="Pin notes to passages"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Sticky Notes</span>
                        </button>
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
                          disabled={clampedPage <= 1}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 select-none min-w-[70px] text-center">
                          Page {clampedPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setActivePage(prev => Math.min(totalPages, prev + 1))}
                          disabled={clampedPage >= totalPages}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mode Specific Configuration */}
                    <div className="flex flex-col gap-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50">
                      {/* Sub-instruction label */}
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-455 dark:text-slate-500">
                        {annotationMode === 'select' && (
                          <>
                            <MousePointer className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Select Mode active. Click any textbook paragraph to copy or prompt the AI Companion.</span>
                          </>
                        )}
                        {annotationMode === 'highlight' && (
                          <>
                            <Highlighter className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            <span>Highlighter Mode active. Select a color category below, then click any paragraph to color-code highlight it.</span>
                          </>
                        )}
                        {annotationMode === 'sticky' && (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                            <span>Sticky Notes active. Click on a paragraph block to append a persistent study tip.</span>
                          </>
                        )}
                      </div>

                      {/* Custom Color Picker & Categorization for Highlighter */}
                      {annotationMode === 'highlight' && (
                        <div className="w-full mt-1 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-850 p-3.5 rounded-2xl flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                              Color-Coded Highlighter Categorization
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold italic">
                              Click on any category name below to customize it on-the-fly!
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(['yellow', 'pink', 'green', 'blue'] as const).map(color => {
                              const isSelected = highlightColor === color;
                              const label = colorLabels[color];
                              let markerColorText = '';
                              let borderAccent = '';
                              let dotBg = '';
                              
                              if (color === 'yellow') {
                                markerColorText = 'text-amber-700 dark:text-amber-400';
                                borderAccent = isSelected ? 'border-amber-400/80 bg-amber-500/5 ring-2 ring-amber-400/25' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
                                dotBg = 'bg-amber-400 border-amber-500';
                              } else if (color === 'pink') {
                                markerColorText = 'text-pink-700 dark:text-pink-400';
                                borderAccent = isSelected ? 'border-pink-400/80 bg-pink-500/5 ring-2 ring-pink-400/25' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
                                dotBg = 'bg-pink-400 border-pink-500';
                              } else if (color === 'green') {
                                markerColorText = 'text-emerald-700 dark:text-emerald-400';
                                borderAccent = isSelected ? 'border-emerald-400/80 bg-emerald-500/5 ring-2 ring-emerald-400/25' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
                                dotBg = 'bg-emerald-400 border-emerald-500';
                              } else {
                                markerColorText = 'text-cyan-700 dark:text-cyan-400';
                                borderAccent = isSelected ? 'border-cyan-400/80 bg-cyan-500/5 ring-2 ring-cyan-400/25' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
                                dotBg = 'bg-cyan-400 border-cyan-500';
                              }

                              return (
                                <div 
                                  key={color}
                                  onClick={() => setHighlightColor(color)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${borderAccent}`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-full border shrink-0 ${dotBg}`} />
                                  <div className="flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={label}
                                      onChange={(e) => {
                                        setColorLabels(prev => ({
                                          ...prev,
                                          [color]: e.target.value
                                        }));
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`w-full bg-transparent border-none outline-none font-bold text-[11px] p-0 focus:ring-0 ${markerColorText}`}
                                      placeholder={`Label for ${color}`}
                                      title="Click to rename"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DOCUMENT CANVAS PAGE */}
                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-lg relative p-8 sm:p-10 min-h-[420px] transition-all">
                    {/* Tiny visual notebook hole decorations on left to look incredibly like a real binder page */}
                    <div className="absolute top-0 bottom-0 left-3 flex flex-col justify-around pointer-events-none opacity-20 dark:opacity-10">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400" />
                      ))}
                    </div>

                    {/* PDF Header line */}
                    <div className="pb-3 border-b border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex justify-between items-center mb-6 pl-4">
                      <span>DOCUMENT READER: {activeViewingDoc.name}</span>
                      <span>PAGE {clampedPage} OF {totalPages}</span>
                    </div>

                    {/* Paragraph list */}
                    <div className="space-y-6 pl-4">
                      {activePageData?.paragraphs.map((pText, pIdx) => {
                        const isHighlighted = activeViewingDoc.highlights.includes(pText);
                        const savedColor = (activeViewingDoc.highlightColors?.[pText] || 'yellow') as 'yellow' | 'pink' | 'green' | 'blue';
                        const pNotes = (stickyNotes[activeViewingDoc.id] || []).filter(
                          n => n.page === clampedPage && n.paragraphIndex === pIdx
                        );
                        
                        return (
                          <div key={pIdx} className="space-y-3 relative group">
                            {/* Paragraph text with highlighter block or normal hover */}
                            <div
                              onClick={() => {
                                if (annotationMode === 'highlight') {
                                  toggleHighlightParagraph(activeViewingDoc.id, pText);
                                } else if (annotationMode === 'sticky') {
                                  setDraftingNoteForParagraph(pIdx);
                                  setNewNoteText('');
                                } else {
                                  setActiveHighlight(pText);
                                  setChatInput(`Explain this chapter passage: "${pText}"`);
                                }
                              }}
                              className={`p-2.5 -m-2.5 rounded-2xl transition-all duration-200 cursor-pointer text-xs sm:text-sm leading-relaxed ${
                                isHighlighted
                                  ? `${COLOR_MAP[savedColor].bg} ${COLOR_MAP[savedColor].text} border-l-4 ${COLOR_MAP[savedColor].border} font-medium px-4`
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850/50 hover:shadow-sm'
                              }`}
                            >
                              <p>{pText}</p>

                              {/* Tiny floating context indicator based on mode */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-[8px] uppercase tracking-wider font-extrabold text-slate-455 bg-white dark:bg-slate-900 border px-1.5 py-0.5 rounded shadow-sm">
                                {annotationMode === 'select' && "💬 Click to Ask AI"}
                                {annotationMode === 'highlight' && (isHighlighted ? "🖍️ Click to Un-Highlight" : "🖍️ Click to Highlight")}
                                {annotationMode === 'sticky' && "✍️ Click to Pin Note"}
                              </div>
                            </div>

                            {/* Sticky Notes for this paragraph */}
                            {pNotes.map(note => (
                              <div
                                key={note.id}
                                className={`p-3.5 rounded-2xl border transition-all transform hover:scale-[1.01] relative ${COLOR_MAP[note.color || 'yellow'].sticky} shadow-sm max-w-md ml-3`}
                              >
                                {/* Cute decorative post-it fold */}
                                <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500/10 rounded-bl-lg border-b border-l border-slate-300 dark:border-slate-800" />
                                
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-550">Study Tip • {note.createdAt}</span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteStickyNote(activeViewingDoc.id, note.id);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                                    title="Delete Sticky Note"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="text-xs text-slate-800 dark:text-slate-100 font-semibold italic mt-1.5 leading-relaxed">
                                  {note.text}
                                </p>
                              </div>
                            ))}

                            {/* Sticky Note Editor Form */}
                            {draftingNoteForParagraph === pIdx && (
                              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner max-w-md ml-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Write Sticky Note Annotation:</span>
                                  
                                  {/* Color picker for sticky note */}
                                  <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-850">
                                    {(['yellow', 'pink', 'green', 'blue'] as const).map(col => (
                                      <button
                                        key={col}
                                        onClick={() => setHighlightColor(col)}
                                        className={`w-3.5 h-3.5 rounded-full border cursor-pointer ${
                                          col === 'yellow' ? 'bg-amber-300 border-amber-400' :
                                          col === 'pink' ? 'bg-pink-300 border-pink-400' :
                                          col === 'green' ? 'bg-emerald-300 border-emerald-400' :
                                          'bg-cyan-300 border-cyan-400'
                                        } ${highlightColor === col ? 'scale-125 ring-1 ring-indigo-500' : ''}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <textarea
                                  value={newNoteText}
                                  onChange={(e) => setNewNoteText(e.target.value)}
                                  placeholder="Type your summary point, study hint, or test question here..."
                                  rows={2}
                                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 placeholder-slate-400 text-slate-800 dark:text-white"
                                />
                                <div className="flex justify-end gap-2 text-[10px] font-bold uppercase">
                                  <button
                                    onClick={() => setDraftingNoteForParagraph(null)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveStickyNote(activeViewingDoc.id, clampedPage, pIdx, newNoteText, highlightColor)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                                  >
                                    Save Note
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {documents.filter(d => selectedDocIds.includes(d.id)).length === 0 ? (
                <div className="text-center py-16">
                  <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto stroke-[1.5]" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-3">Select source textbooks from the sidebar to compile highlights.</p>
                </div>
              ) : (
                documents.filter(d => selectedDocIds.includes(d.id)).map((doc) => (
                  <div key={doc.id} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-widest flex items-center gap-2 bg-indigo-500/5 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>Source: {doc.name}</span>
                      </p>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{doc.highlights.length} passages</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2.5 pl-3.5 border-l-2 border-indigo-500/20 dark:border-indigo-500/30">
                      {doc.highlights.map((hl, index) => {
                        const cid = `${doc.id}-${index}`;
                        const isCopied = copiedIndex === cid;
                        const savedColor = (doc.highlightColors?.[hl] || 'yellow') as 'yellow' | 'pink' | 'green' | 'blue';
                        const categoryLabel = colorLabels[savedColor];
                        
                        let borderClass = 'border-l-4 border-l-amber-400 hover:border-amber-450';
                        let badgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
                        if (savedColor === 'pink') {
                          borderClass = 'border-l-4 border-l-pink-400 hover:border-pink-450';
                          badgeClass = 'bg-pink-500/10 text-pink-600 dark:text-pink-400';
                        } else if (savedColor === 'green') {
                          borderClass = 'border-l-4 border-l-emerald-400 hover:border-emerald-450';
                          badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
                        } else if (savedColor === 'blue') {
                          borderClass = 'border-l-4 border-l-cyan-400 hover:border-cyan-450';
                          badgeClass = 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400';
                        }

                        return (
                          <div 
                            key={index}
                            onClick={() => {
                              setActiveHighlight(hl);
                              setChatInput(`Analyze this highlighted segment: "${hl}"`);
                            }}
                            className={`p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/80 transition-all duration-300 cursor-pointer text-slate-700 dark:text-slate-300 relative group flex flex-col justify-between min-h-[72px] ${borderClass}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeClass}`}>
                                {categoryLabel}
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase">
                                Page {clampedPage}
                              </span>
                            </div>
                            <p className="font-semibold italic leading-relaxed text-xs text-slate-800 dark:text-slate-100 pr-10">"{hl}"</p>
                            
                            <div className="flex items-center justify-between mt-3 text-[9px] text-slate-400 font-bold uppercase">
                              <span>Topic Index Ref</span>
                              
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(hl, cid);
                                  }}
                                  className="p-1 rounded bg-white dark:bg-slate-900 border text-slate-455 hover:text-slate-700 dark:hover:text-white cursor-pointer shadow-sm flex items-center justify-center"
                                  title="Copy quotation"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Clipboard className="w-3 h-3" />}
                                </button>
                                
                                <div className="flex items-center gap-1 bg-indigo-600 text-white px-2 py-1 rounded-md font-bold hover:bg-indigo-700 transition-colors">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Query AI</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* AI Quick compilers */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 mt-8">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5">AI Synthesis Accelerators</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => runAiDocAction('summary')}
              disabled={!!loadingAction}
              className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 hover:from-indigo-500/10 hover:to-indigo-600/10 border border-indigo-500/10 hover:border-indigo-500/30 flex flex-col items-center sm:items-start text-center sm:text-left justify-between gap-3 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5 disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <FileSpreadsheet className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div>
                <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider block">Generate Summary</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-1 block leading-relaxed">Synthesize active textbooks into a conceptual brief.</span>
              </div>
            </button>
            
            <button
              onClick={() => runAiDocAction('formulas')}
              disabled={!!loadingAction}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 hover:from-emerald-500/10 hover:to-emerald-600/10 border border-emerald-500/10 hover:border-emerald-500/30 flex flex-col items-center sm:items-start text-center sm:text-left justify-between gap-3 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <BookOpen className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div>
                <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider block">Extract Formulas</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-1 block leading-relaxed">Map mathematical axioms and organic structures.</span>
              </div>
            </button>

            <button
              onClick={() => runAiDocAction('flashcards')}
              disabled={!!loadingAction}
              className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/5 to-violet-600/5 hover:from-violet-500/10 hover:to-violet-600/10 border border-violet-500/10 hover:border-violet-500/30 flex flex-col items-center sm:items-start text-center sm:text-left justify-between gap-3 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/5 disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-sm">
                <Layers className="w-4.5 h-4.5 stroke-[2]" />
              </div>
              <div>
                <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider block">Create Flashcards</span>
                <span className="text-[9px] text-slate-400 font-semibold mt-1 block leading-relaxed">Instantly compile Q&A study decks for quick active recall.</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Contextual Document AI Chat */}
      <div className={`${isAiPanelOpen ? 'flex' : 'hidden'} lg:flex w-full lg:w-[420px] min-h-[500px] lg:min-h-0 flex-col bg-slate-50/50 dark:bg-slate-900/50 border-l border-slate-200/80 dark:border-slate-800`}>
        {/* Header indicator */}
        <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center shadow-inner">
              <Sparkles className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <span className="font-black text-slate-800 dark:text-white text-sm tracking-tight">Notebook Chat Companion</span>
              <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">AP Context-Aware Tutor</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 text-[9px] font-black text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <Flame className="w-3 h-3 text-orange-500 animate-pulse" />
            <span>GenAI Active</span>
          </div>
        </div>

        {/* Chat History Panel */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 custom-scrollbar bg-slate-50/10 dark:bg-slate-950/10">
          {aiChatLogs.map((log, idx) => (
            <div 
              key={idx} 
              className={`flex gap-3 max-w-[90%] ${log.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-[10px] shadow-sm transition-transform hover:scale-105 ${
                log.sender === 'user' 
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' 
                  : 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-indigo-600/25'
              }`}>
                {log.sender === 'user' ? 'YOU' : 'AI'}
              </div>
              
              <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm relative group max-w-[calc(100%-40px)] border ${
                log.sender === 'user' 
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent rounded-tr-none' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200/60 dark:border-slate-800 rounded-tl-none'
              }`}>
                {/* Formatting output block */}
                <div 
                  className="space-y-2 font-medium"
                  dangerouslySetInnerHTML={{ 
                    __html: log.text 
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/- (.*?)\n/g, '<li class="ml-4 list-disc">$1</li>')
                      .replace(/\n/g, '<br />')
                      .replace(/### (.*?)(<br \/>|$)/g, '<h5 class="font-extrabold text-indigo-600 dark:text-indigo-400 mt-3 text-[13px] flex items-center gap-1">$1</h5>')
                  }} 
                />

                {/* AI response actions */}
                {log.sender === 'ai' && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 mt-3 text-[10px] text-slate-400">
                    <button
                      onClick={() => handleCopyMessage(idx, log.text)}
                      className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-700/40 cursor-pointer active:scale-95"
                      title="Copy content to clipboard"
                    >
                      {copiedMsgIdx === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-extrabold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Clipboard className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleShareMessage(idx, log.text)}
                      className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-700/40 cursor-pointer active:scale-95"
                      title="Share with friends"
                    >
                      {sharedMsgIdx === idx ? (
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

                    {onUpdateWorkspace && workspace && (
                      <button
                        onClick={() => handleAddToNotes(idx, log.text)}
                        className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-700/40 cursor-pointer active:scale-95 ml-auto"
                        title="Add response to study notes"
                      >
                        {addedNoteMsgIdx === idx ? (
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

          {/* Loader */}
          {loadingAction && (
            <div className="flex gap-3 mr-auto max-w-[90%]">
              <div className="w-8.5 h-8.5 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-md shadow-indigo-600/20">
                AI
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-3.5 rounded-2xl rounded-tl-none border border-slate-200/80 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-3.5 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Synthesizing index vectors...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input dock */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800">
          <form 
            onSubmit={handleSendChat} 
            className="flex gap-2 p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all duration-300"
          >
            <input
              type="text"
              required
              placeholder="Ask about formulas, inheritance or spontaneity..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer font-black transition-colors flex items-center justify-center shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-95"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
          <div className="mt-2 text-center flex items-center justify-center gap-1.5 text-slate-400">
            <AlertCircle className="w-3 h-3 text-slate-350" />
            <p className="text-[9px] font-bold uppercase tracking-wider">AI tutor can occasionally hallucinate numbers.</p>
          </div>
        </div>
      </div>

      <AutoSavingToast isSaving={isSaving} />
    </div>
  );
}

// Simple Send Icon helper
function Send(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4Z" />
    </svg>
  );
}
