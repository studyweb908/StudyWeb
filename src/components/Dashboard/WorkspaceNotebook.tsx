import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  
  Plus, 
  Save, 
  Trash2, 
  Compass, 
  Share2, 
  Dribbble, 
  HelpCircle,
  Clock,
  Eye,
  Settings,
  ChevronRight,
  
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Code,
  Check,
  X as CloseIcon,
  
  Search,
  FileDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Workspace, WorkspaceNote } from './WorkspaceTypes';

interface WorkspaceNotebookProps {
  workspace: Workspace;
  onAddNote: (note: WorkspaceNote) => void;
  onRemoveNote: (noteId: string) => void;
}

export default function WorkspaceNotebook({ workspace, onAddNote, onRemoveNote }: WorkspaceNotebookProps) {
  const [activeNote, setActiveNote] = useState<WorkspaceNote | null>(workspace.notes[0] || null);
  const [noteTitle, setNoteTitle] = useState(workspace.notes[0]?.title || '');
  const [noteContent, setNoteContent] = useState(workspace.notes[0]?.content || '');
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueNotes = Array.from(new Map((workspace.notes || []).map(n => [n.id, n])).values());
  const filteredNotes = uniqueNotes.filter((note) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q)
    );
  });
  
  // AI assistant status
  
  // Drawing board overlay
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleSelectNote = (note: WorkspaceNote) => {
    setActiveNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const handleExportToPDF = () => {
    if (!activeNote) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Color definitions
    const PRIMARY_COLOR = [99, 102, 241]; // indigo-500
    const TEXT_MAIN = [30, 41, 59]; // slate-800
    const TEXT_MUTED = [100, 116, 139]; // slate-500
    const LINE_COLOR = [226, 232, 240]; // slate-200

    let currentPage = 1;

    // Helper for page headers and footers
    const drawHeaderFooter = (pageNum: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      
      // Header: App name and Workspace details
      doc.text(`StudyWeb  |  ${workspace.subject}  |  ${workspace.name}`, 20, 15);
      
      // Header line
      doc.setDrawColor(LINE_COLOR[0], LINE_COLOR[1], LINE_COLOR[2]);
      doc.setLineWidth(0.2);
      doc.line(20, 18, 190, 18);

      // Footer: Page Number
      doc.text(`Page ${pageNum}`, 190, 285, { align: 'right' });
    };

    // Draw first page header
    drawHeaderFooter(currentPage);

    // Note Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    
    // We wrap note title if it's very long
    const wrappedTitle = doc.splitTextToSize(noteTitle || 'Untitled Note', 170);
    doc.text(wrappedTitle, 20, 30);
    
    let y = 32 + (wrappedTitle.length * 8);

    // Meta: Last Updated / Created info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Document Note: ${noteTitle || 'Untitled'}  •  Last updated: ${activeNote.updatedAt || 'Recently'}`, 20, y);
    
    y += 8;

    // Content Divider
    doc.setDrawColor(LINE_COLOR[0], LINE_COLOR[1], LINE_COLOR[2]);
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    
    y += 10;

    // Markdown Line-by-Line Parsing
    const lines = noteContent.split('\n');
    
    doc.setFontSize(11);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for page break
      if (y > 265) {
        doc.addPage();
        currentPage++;
        drawHeaderFooter(currentPage);
        y = 25; // Reset top position
      }

      if (line === '') {
        // Empty line adds some vertical spacing
        y += 4;
        continue;
      }

      // Check Heading 1: # Title
      if (line.startsWith('# ')) {
        const text = line.replace('# ', '').replace(/\*\*/g, '').replace(/\*/g, '');
        
        // Add safety space before a heading
        y += 4;
        if (y > 260) {
          doc.addPage();
          currentPage++;
          drawHeaderFooter(currentPage);
          y = 25;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        
        const wrapped = doc.splitTextToSize(text, 170);
        doc.text(wrapped, 20, y);
        y += (wrapped.length * 6) + 4;
        continue;
      }

      // Check Heading 2: ## Subtitle
      if (line.startsWith('## ')) {
        const text = line.replace('## ', '').replace(/\*\*/g, '').replace(/\*/g, '');
        
        y += 3;
        if (y > 260) {
          doc.addPage();
          currentPage++;
          drawHeaderFooter(currentPage);
          y = 25;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
        
        const wrapped = doc.splitTextToSize(text, 170);
        doc.text(wrapped, 20, y);
        y += (wrapped.length * 5) + 3;
        continue;
      }

      // Check Bullet List: - item or * item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const text = line.substring(2).replace(/\*\*/g, '').replace(/\*/g, '');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
        
        // Bullet mark and content
        const wrapped = doc.splitTextToSize(text, 162);
        
        // Draw custom bullet circle/dot
        doc.setFillColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        doc.circle(23, y - 1, 0.7, 'F');
        
        doc.text(wrapped, 26, y);
        y += (wrapped.length * 5) + 2;
        continue;
      }

      // Check blockquote: > text
      if (line.startsWith('> ')) {
        const text = line.replace('> ', '').replace(/\*\*/g, '').replace(/\*/g, '');
        
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10.5);
        doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        
        const wrapped = doc.splitTextToSize(text, 160);
        
        // Left border bar for quote block
        doc.setDrawColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        doc.setLineWidth(0.8);
        doc.line(22, y - 3, 22, y + (wrapped.length * 5) - 3);
        
        doc.text(wrapped, 25, y);
        y += (wrapped.length * 5) + 3;
        continue;
      }

      // Regular Paragraph text (cleaning up markdown bold/italic syntax characters for neat text representation)
      const cleanLineText = line.replace(/\*\*/g, '').replace(/\*/g, '');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      
      const wrapped = doc.splitTextToSize(cleanLineText, 170);
      doc.text(wrapped, 20, y);
      y += (wrapped.length * 5) + 2;
    }

    // Export PDF file download triggers
    const sanitizedFilename = (noteTitle || 'note').toLowerCase().replace(/[^a-z0-9]/gi, '_');
    doc.save(`${sanitizedFilename}_study_note.pdf`);
    setShowExportMenu(false);
  };

  const handleExportToMarkdown = () => {
    if (!activeNote) return;
    
    let rawContent = noteContent;
    rawContent = rawContent.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n');
    rawContent = rawContent.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n');
    rawContent = rawContent.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n');
    rawContent = rawContent.replace(/<p>(.*?)<\/p>/gi, '$1\n');
    rawContent = rawContent.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
    rawContent = rawContent.replace(/<br\s*\/?>/gi, '\n');
    rawContent = rawContent.replace(/&nbsp;/g, ' ');
    rawContent = rawContent.replace(/<[^>]*>/g, '');

    const blob = new Blob([`# ${noteTitle}\nLast Updated: ${activeNote.updatedAt}\n\n${rawContent}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(noteTitle || 'note').toLowerCase().replace(/[^a-z0-9]/gi, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleCreateNewNote = () => {
    const blank: WorkspaceNote = {
      id: `note-${Date.now()}`,
      title: 'Untitled Note',
      content: '# Untitled Note\n\nWrite your thoughts here...',
      updatedAt: 'Just Now',
      tags: ['Custom']
    };
    onAddNote(blank);
    setActiveNote(blank);
    setNoteTitle(blank.title);
    setNoteContent(blank.content);
  };

  const handleSaveNote = () => {
    if (!activeNote) return;
    
    const updated: WorkspaceNote = {
      ...activeNote,
      title: noteTitle,
      content: noteContent,
      updatedAt: 'Just Now'
    };

    onAddNote(updated); // Saves or replaces
    setActiveNote(updated);
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left relative">
      {/* LEFT: Note sidebar list (3 Cols) */}
      <div className="lg:col-span-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 p-4 rounded-[24px] flex flex-col gap-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">Study Notebook</h4>
          <button 
            onClick={handleCreateNewNote}
            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg cursor-pointer transition-all"
            title="Create a new note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[10px] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto max-h-[350px] lg:max-h-[500px]">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-indigo-400 dark:border-indigo-900 shadow-md'
                      : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{note.title}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveNote(note.id);
                        if (activeNote?.id === note.id) {
                          setActiveNote(workspace.notes.find(n => n.id !== note.id) || null);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{note.updatedAt}</p>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700 opacity-60" />
              <p className="text-xs font-semibold">No notes found</p>
              {searchQuery && (
                <p className="text-[10px] mt-1 text-slate-400 max-w-[140px] mx-auto">
                  No matching titles or content keywords.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Editor area (6 Cols) */}
      <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-[24px] flex flex-col min-h-[500px]">
        {activeNote ? (
          <div className="flex-1 flex flex-col space-y-4">
            {/* Title */}
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="text-lg font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 focus:outline-none w-full bg-transparent"
              placeholder="Give your note a title..."
            />

            {/* Editing toolbar formatting */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-1.5 rounded-xl text-slate-500">
              <button onClick={() => setNoteContent(p => p + ' **bold**')} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded text-xs cursor-pointer"><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => setNoteContent(p => p + ' *italic*')} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded text-xs cursor-pointer"><Italic className="w-3.5 h-3.5" /></button>
              <button onClick={() => setNoteContent(p => p + '\n# Heading')} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded text-xs cursor-pointer"><Heading1 className="w-3.5 h-3.5" /></button>
              <button onClick={() => setNoteContent(p => p + '\n## Subheading')} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded text-xs cursor-pointer"><Heading2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => setNoteContent(p => p + '\n- Item')} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded text-xs cursor-pointer"><List className="w-3.5 h-3.5" /></button>
              <button onClick={() => setNoteContent(p => p + ' `code`')} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded text-xs cursor-pointer"><Code className="w-3.5 h-3.5" /></button>
              
              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-1" />


              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 rounded text-xs cursor-pointer flex items-center gap-1 transition-all text-indigo-500 font-bold"
                  title="Export options"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Export</span>
                </button>
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-40 text-left"
                    >
                      <button
                        onClick={handleExportToPDF}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Save as PDF (.pdf)</span>
                      </button>
                      <button
                        onClick={handleExportToMarkdown}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2"
                      >
                        <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Download Markdown</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Note text content */}
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="flex-1 w-full bg-transparent text-slate-800 dark:text-slate-250 border-0 focus:ring-0 font-mono text-xs sm:text-sm leading-relaxed p-1 resize-none focus:outline-none min-h-[300px]"
              placeholder="Write your study notes here..."
            />

            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[10px] text-slate-400 font-black">AUTOSAVED</span>
              <button
                onClick={handleSaveNote}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow shadow-indigo-600/10"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-slate-400 font-semibold">Select a study note from sidebar or create a new one.</p>
          </div>
        )}
      </div>


    </div>
  );
}
