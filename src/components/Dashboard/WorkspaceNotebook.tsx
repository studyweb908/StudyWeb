import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Save, 
  Trash2, 
  Share2, 
  Clock, 
  Eye, 
  Bold, 
  Italic, 
  List, 
  Heading1, 
  Heading2, 
  Code, 
  Check, 
  Search, 
  FileDown,
  Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Workspace, WorkspaceNote } from './WorkspaceTypes';

interface WorkspaceNotebookProps {
  workspace: Workspace;
  onAddNote: (note: WorkspaceNote) => void;
  onRemoveNote: (noteId: string) => void;
}

export default function WorkspaceNotebook({
  workspace,
  onAddNote,
  onRemoveNote
}: WorkspaceNotebookProps) {
  const notes = workspace.notes || [];
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const activeNote = notes.find(n => n.id === selectedNoteId) || notes[0] || null;

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleStartCreate = () => {
    setTitleInput('');
    setContentInput('');
    setTagInput('');
    setIsEditing(true);
  };

  const handleSaveNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;

    const tags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newNote: WorkspaceNote = {
      id: `note-${Date.now()}`,
      title: titleInput.trim(),
      content: contentInput.trim() || 'No content drafted yet.',
      updatedAt: 'Just now',
      tags: tags.length > 0 ? tags : [workspace.subject || 'Study Notes']
    };

    onAddNote(newNote);
    setSelectedNoteId(newNote.id);
    setIsEditing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportPDF = () => {
    if (!activeNote) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(activeNote.title, 20, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Subject: ${workspace.name} | Updated: ${activeNote.updatedAt}`, 20, 35);
      doc.setFontSize(12);
      doc.setTextColor(30);
      
      const splitText = doc.splitTextToSize(activeNote.content, 170);
      doc.text(splitText, 20, 48);
      doc.save(`${activeNote.title.replace(/\s+/g, '_')}_Notes.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Workspace Notebook
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Grounded study notes for {workspace.name}. Draft formulas, concepts, and key takeaways.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
          {activeNote && (
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              title="Export as PDF"
            >
              <FileDown className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Notes List / Right Note Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Side: Note List & Search */}
        <div className="lg:col-span-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes or tags..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No notes found</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Click "New Note" to create one.</p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id && !isEditing;
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setIsEditing(false);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-violet-50/70 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/60 shadow-xs'
                        : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {note.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveNote(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {note.content}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {note.tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {note.updatedAt}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Note Viewer or New Note Editor */}
        <div className="lg:col-span-8 bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          {isEditing ? (
            <form onSubmit={handleSaveNewNote} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  Drafting New Study Note
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Note Title (e.g. Kinematics Derivatives)"
                  className="w-full px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <textarea
                  rows={12}
                  required
                  value={contentInput}
                  onChange={(e) => setContentInput(e.target.value)}
                  placeholder="Write your study notes, formulas, summary or key takeaways here..."
                  className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed custom-scrollbar"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Tags (comma separated, e.g. Formulas, Exam 1, Review)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          ) : activeNote ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {activeNote.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      Updated {activeNote.updatedAt}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <div className="flex items-center gap-1">
                      {activeNote.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTitleInput(activeNote.title);
                    setContentInput(activeNote.content);
                    setTagInput(activeNote.tags.join(', '));
                    setIsEditing(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Edit
                </button>
              </div>

              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed min-h-[300px]">
                {activeNote.content}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                No Note Selected
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Select an existing note from the list on the left or create a brand new one.
              </p>
              <button
                onClick={handleStartCreate}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                Create First Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
