import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, FileText, Layers, Calendar, X } from 'lucide-react';

interface QuickActionsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function QuickActions({ activeTab, setActiveTab }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle outside click to close FAB options
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to right-clicks on the main content area to display context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Find if we right-clicked inside the workspace main area
      const mainArea = document.getElementById('workspace-main-content');
      if (mainArea && mainArea.contains(e.target as Node)) {
        // Prevent default browser menu
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
        setIsOpen(false); // close FAB if open
      }
    };

    const handleClearContextMenu = () => {
      setContextMenu(null);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClearContextMenu);
    window.addEventListener('scroll', handleClearContextMenu);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClearContextMenu);
      window.removeEventListener('scroll', handleClearContextMenu);
    };
  }, []);

  const handleAction = (type: 'note' | 'flashcard' | 'plan') => {
    setIsOpen(false);
    setContextMenu(null);

    if (type === 'note') {
      // 1. Create a note draft in localStorage
      const saved = localStorage.getItem('studyweb_notes');
      let currentNotes = [];
      if (saved) {
        try { currentNotes = JSON.parse(saved); } catch (e) {}
      }
      const newNote = {
        id: Date.now().toString(),
        title: 'New Study Note Draft',
        subject: 'General Study',
        content: 'Start drafting your study notes here...\n\nUse the AI summary tool to condense these concepts later.',
        updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        aiSummarized: false
      };
      const updatedNotes = [newNote, ...currentNotes];
      localStorage.setItem('studyweb_notes', JSON.stringify(updatedNotes));
      localStorage.setItem('studyweb_selected_note_id', newNote.id);
      window.dispatchEvent(new Event('studyweb_notes_updated'));
      
      setActiveTab('notes');
    } else if (type === 'flashcard') {
      // 2. Redirect to flashcards and trigger add card panel
      setActiveTab('flashcards');
      setTimeout(() => {
        window.dispatchEvent(new Event('studyweb_trigger_add_card'));
      }, 100);
    } else if (type === 'plan') {
      // 3. Redirect to study planner and trigger add plan panel
      setActiveTab('study-planner');
      setTimeout(() => {
        window.dispatchEvent(new Event('studyweb_trigger_add_plan'));
      }, 100);
    }
  };

  return (
    <div ref={containerRef}>
      {/* 1. RIGHT-CLICK CONTEXT MENU */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-50 min-w-[220px] bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl p-2.5 space-y-1 text-xs text-left"
          >
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
              Quick Creation Menu
            </div>
            
            <button
              onClick={() => handleAction('note')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold cursor-pointer text-left focus:outline-none"
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Create New Study Note</span>
            </button>

            <button
              onClick={() => handleAction('flashcard')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold cursor-pointer text-left focus:outline-none"
            >
              <Layers className="w-4 h-4 text-violet-500" />
              <span>Create New Flashcard</span>
            </button>

            <button
              onClick={() => handleAction('plan')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-bold cursor-pointer text-left focus:outline-none"
            >
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Create Study Plan Task</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. FLOATING ACTION BUTTON (FAB) - Visible on desktop & tablet */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-40 flex-col items-end gap-3">
        {/* Expanded Quick Options */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-3.5 shadow-2xl min-w-[240px] space-y-1.5 text-left mb-1"
            >
              <div className="px-3 pb-2 border-b border-slate-100 dark:border-slate-800/80 mb-2">
                <p className="font-extrabold text-xs text-slate-800 dark:text-white">Quick Creator</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Select a resource to construct</p>
              </div>

              <button
                onClick={() => handleAction('note')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all cursor-pointer text-left focus:outline-none"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs">Create Study Note</p>
                  <p className="text-[9px] text-slate-400 font-medium">Auto-saved to note repository</p>
                </div>
              </button>

              <button
                onClick={() => handleAction('flashcard')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all cursor-pointer text-left focus:outline-none"
              >
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs">Create Flashcard</p>
                  <p className="text-[9px] text-slate-400 font-medium">Adds to active study categories</p>
                </div>
              </button>

              <button
                onClick={() => handleAction('plan')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-all cursor-pointer text-left focus:outline-none"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs">New Study Plan Task</p>
                  <p className="text-[9px] text-slate-400 font-medium">Adds focus targets to calendar</p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master Floating Trigger Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 cursor-pointer focus:outline-none transition-all duration-300 ${
            isOpen 
              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-600/20 rotate-45' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
          aria-label="Quick Creation Actions"
          title="Right-click anywhere in workspace or click here for Quick Creator Menu"
        >
          <Plus className="w-6 h-6 transition-transform duration-300" />
        </motion.button>
      </div>
    </div>
  );
}
